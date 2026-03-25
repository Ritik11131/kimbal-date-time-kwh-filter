import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ControlSectionData {
  id: string;
  title: string;
  fromTime: string;
  toTime: string;
  purchase: string;
  isPositive: boolean;
  isLoading?: boolean;
}

export interface ApiResponse {
  NetkWh?: Array<{
    ts: number;
    value: string;
  }>;
  [key: string]: Array<{
    ts: number;
    value: string;
  }> | undefined;
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

@Component({
  selector: 'app-date-time-kwh-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-time-kwh-filter.html',
  styleUrls: ['./date-time-kwh-filter.css']
})
export class DateTimeKwhFilter {

  controlSections: ControlSectionData[] = [
    { id: 'section-1', title: '5AM – 11AM',  fromTime: '05:00', toTime: '11:00', purchase: '00.00', isPositive: true, isLoading: false },
    { id: 'section-2', title: '11AM – 5PM',  fromTime: '11:00', toTime: '17:00', purchase: '00.00', isPositive: true, isLoading: false },
    { id: 'section-3', title: '5PM – 11PM',  fromTime: '17:00', toTime: '23:00', purchase: '00.00', isPositive: true, isLoading: false },
    { id: 'section-4', title: '11PM – 5AM',  fromTime: '23:00', toTime: '05:00', purchase: '00.00', isPositive: true, isLoading: false },
  ];

  dateRange!: DateRange;

  debugMode: boolean = true;
  debugApiCalls: any[] = [];
  private destroy$ = new Subject<void>();

  // API Configuration
  public DEVICE_ID!: string;
  private API_TOKEN!: string;
  private readonly API_BASE_TEMPLATE = 'https://meterdashboard.kimbal.io/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries';
  private API_BASE_URL!: string;
  public NAME!:string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {

    const today = new Date();

    // Format helper → YYYY-MM-DD (Literal local date)
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const toDate = formatDate(today);

    const fromDateObj = new Date(today);
    fromDateObj.setDate(today.getDate() - 3);
    const fromDate = formatDate(fromDateObj);

    this.dateRange = {
      fromDate: fromDate,
      toDate: toDate
    };
  }

  ngOnInit(): void {
  this.route.params
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ deviceName, deviceId, token }) => {
      this.NAME = deviceName;
      this.DEVICE_ID = deviceId;
      this.API_TOKEN = token;
      this.API_BASE_URL = this.API_BASE_TEMPLATE.replace('{deviceId}', deviceId);
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackBySection(index: number, section: ControlSectionData): string {
    return section.id;
  }

  onDateChange(): void {
    // console.lo'Date changed:', this.dateRange.fromDate, 'to', this.dateRange.toDate);
  }

  onTimeChange(section: ControlSectionData): void {
    // console.lo'Time changed for section:', section.id, section.fromTime, 'to', section.toTime);
  }

  refreshSection(section: ControlSectionData): void {
    // console.lo'Refreshing section:', section.id);
    // Reset to default values or refresh data
    this.applyFilter(section);
    this.cdr.detectChanges();   // ✅ refresh UI
  }

  isAnyLoading(): boolean {
    return this.controlSections.some(section => section.isLoading);
  }

  applyFilter(section: ControlSectionData): void {
    if (!this.validateInputs(section)) {
      return;
    }

    // Set loading state for this specific section
    section.isLoading = true;
    this.debugApiCalls = [];

    // console.lo'Starting API calls for section:', section);
    const dateRanges = this.generateDateRanges(section);
    // console.lo'Generated date ranges:', dateRanges);

    // Process API calls sequentially
    this.processApiCallsSequentially(dateRanges, section)
      .then(results => {
        // console.lo'All API calls completed successfully:', results);
        this.updateSectionData(section, results);
      })
      .catch(error => {
        console.error('Error processing API calls:', error);
        alert('Error fetching data. Please try again.');
      })
      .finally(() => {
        // This will ALWAYS execute after all API calls are done
        // console.lo'Resetting loading state for section:', section.id);
        section.isLoading = false;
        this.cdr.detectChanges();   // ✅ refresh UI
      });
  }

  private validateInputs(section: ControlSectionData): boolean {
    if (!this.dateRange.fromDate || !this.dateRange.toDate) {
      alert('Please select both from and to dates');
      return false;
    }

    if (!section.fromTime || !section.toTime) {
      alert('Please select both from and to times');
      return false;
    }

    if (new Date(this.dateRange.fromDate) > new Date(this.dateRange.toDate)) {
      alert('From date must be before or equal to to date');
      return false;
    }

    return true;
  }

  private generateDateRanges(section: any): Array<{ date: string, fromTime: string, toTime: string }> {
    const ranges: Array<{ date: string, fromTime: string, toTime: string }> = [];
    
    // Parse fromDate and toDate as literal local dates
    const [fromY, fromM, fromD] = this.dateRange.fromDate.split('-').map(Number);
    const [toY, toM, toD] = this.dateRange.toDate.split('-').map(Number);
    
    const fromDateObj = new Date(fromY, fromM - 1, fromD);
    const toDateObj = new Date(toY, toM - 1, toD);

    const currentDate = new Date(fromDateObj);
    // The System is now TimeZone Sensitive. So works perfectly in IST. For Timezone insensitive needs to be fixed in EMS 1.0
    while (currentDate <= toDateObj) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      ranges.push({
        date: dateString,
        fromTime: section.fromTime || '00:00',
        toTime: section.toTime || '23:59'
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return ranges;
  }

  private async processApiCallsSequentially(
    dateRanges: Array<{ date: string, fromTime: string, toTime: string }>,
    section: ControlSectionData
  ): Promise<any[]> {
    const results: any[] = [];

    // console.lo`Starting sequential API calls for ${dateRanges.length} date ranges`);

    for (let i = 0; i < dateRanges.length; i++) {
      const range = dateRanges[i];
      // console.lo`Processing API call ${i + 1}/${dateRanges.length} for ${range.date} ${section.fromTime} to ${section.toTime}`);

      try {
        const result = await this.makeApiCall(range.date, section.fromTime, section.toTime);
        results.push({
          date: range.date,
          fromTime: section.fromTime,
          toTime: section.toTime,
          data: result,
          success: true
        });

        // console.lo`API call ${i + 1}/${dateRanges.length} completed successfully`);

        // Add delay between requests to avoid rate limiting (except for the last request)
        if (i < dateRanges.length - 1) {
          // console.lo'Waiting 500ms before next request...');
          await this.delay(500);
        }

      } catch (error) {
        console.error(`API call ${i + 1}/${dateRanges.length} failed for ${range.date}:`, error);
        results.push({
          date: range.date,
          fromTime: section.fromTime,
          toTime: section.toTime,
          error: error,
          success: false
        });
      }
    }

    // console.lo`All ${dateRanges.length} API calls completed. Results:`, results);
    return results;
  }

  private async makeApiCall(date: string, fromTime: string, toTime: string): Promise<ApiResponse> {
    if (fromTime > toTime) {
      // Overnight section: split into two calls for the same calendar day
      // Part 1: fromTime → midnight (start of next day)
      const [y, m, d] = date.split('-').map(Number);
      const next = new Date(y, m - 1, d);
      next.setDate(next.getDate() + 1);
      
      const nextY = next.getFullYear();
      const nextM = String(next.getMonth() + 1).padStart(2, '0');
      const nextD = String(next.getDate()).padStart(2, '0');
      const nextDateStr = `${nextY}-${nextM}-${nextD}`;
      const res1 = await this.fetchTimeseries(date, fromTime, nextDateStr, '00:00');

      await this.delay(500);

      // Part 2: 00:00 → toTime on the same day
      const res2 = await this.fetchTimeseries(date, '00:00', date, toTime);

      return { NetkWh: [...(res1.NetkWh || []), ...(res2.NetkWh || [])] };
    }

    return this.fetchTimeseries(date, fromTime, date, toTime);
  }

  private async fetchTimeseries(startDate: string, startTime: string, endDate: string, endTime: string): Promise<ApiResponse> {
    const startTs = this.convertToTimestamp(startDate, startTime);
    const endTs = this.convertToTimestamp(endDate, endTime);

    const url = `${this.API_BASE_URL}?keys=NetkWh&startTs=${startTs}&endTs=${endTs}&agg=SUM&interval=7200000`;

    const headers = new HttpHeaders({
      'X-Authorization': 'Bearer ' + this.API_TOKEN,
      'Content-Type': 'application/json'
    });

    const debugInfo = { url, startTs, endTs, startDate, startTime, endDate, endTime, timestamp: new Date().toISOString() };
    this.debugApiCalls.push(debugInfo);

    try {
      const response = await firstValueFrom(this.http.get<ApiResponse>(url, { headers }));
      return response || {};
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  private convertToTimestamp(date: string, time: string): number {
    // Specifically use IST offset (+05:30) to ensure API parameters are correct regardless of browser TZ
    const dateTime = new Date(`${date}T${time}:00.000+05:30`);
    return dateTime.getTime();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateSectionData(section: ControlSectionData, results: any[]): void {
    // console.lo`Updating section ${section.id} with ${results.length} results`);

    // Calculate total kWh from all results
    let totalKwh = 0;
    let hasValidData = false;
    let successfulCalls = 0;
    let failedCalls = 0;

    results.forEach((result, index) => {
      // console.lo`Processing result ${index + 1}:`, result);

      if (!result.success) {
        failedCalls++;
        console.warn(`Result ${index + 1} failed:`, result.error);
        return;
      }

      successfulCalls++;

      if (result.data && result.data.NetkWh && Array.isArray(result.data.NetkWh)) {
        result.data.NetkWh.forEach((item: any) => {
          if (item.value && !isNaN(parseFloat(item.value))) {
            const value = parseFloat(item.value);
            totalKwh += value;
            hasValidData = true;
            // console.lo`Added value: ${value}, Running total: ${totalKwh}`);
          }
        });
      } else {
        console.warn(`Result ${index + 1} has no valid NetkWh data:`, result.data);
      }
    });

    // console.lo`Data processing complete for section ${section.id}:`);
    // console.lo`- Successful calls: ${successfulCalls}/${results.length}`);
    // console.lo`- Failed calls: ${failedCalls}/${results.length}`);
    // console.lo`- Total kWh calculated: ${totalKwh}`);
    // console.lo`- Has valid data: ${hasValidData}`);

    if (hasValidData) {
      section.purchase = totalKwh.toFixed(2);
      section.isPositive = totalKwh >= 0;
      // console.lo`✅ Updated section ${section.id} with total kWh: ${section.purchase}`);
    } else {
      console.warn(`⚠️ No valid data found for section ${section.id}, setting to 0.00`);
      section.purchase = '0.00';
      section.isPositive = false;
    }

    // Show summary alert if there were failures
    if (failedCalls > 0) {
      alert(`Warning: ${failedCalls} out of ${results.length} API calls failed. Results may be incomplete.`);
    }

    this.cdr.detectChanges();
  }


}
