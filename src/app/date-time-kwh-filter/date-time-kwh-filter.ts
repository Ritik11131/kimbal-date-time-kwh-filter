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
  [key: string]: Array<{
    ts: number;
    value: string;
  }>;
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
    {
      id: 'section-1',
      title: 'SELECT TIME',
      fromTime: '00:00',
      toTime: '02:00',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-2',
      title: 'SELECT TIME',
      fromTime: '02:45',
      toTime: '08:30',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-3',
      title: 'SELECT TIME',
      fromTime: '08:30',
      toTime: '12:00',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-4',
      title: 'SELECT TIME',
      fromTime: '12:00',
      toTime: '16:30',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-5',
      title: 'SELECT TIME',
      fromTime: '16:30',
      toTime: '19:00',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-6',
      title: 'SELECT TIME',
      fromTime: '19:00',
      toTime: '22:30',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-7',
      title: 'SELECT TIME',
      fromTime: '22:30',
      toTime: '23:59',
      purchase: '00.00',
      isPositive: true,
      isLoading: false
    }
  ];

  dateRange!: DateRange;

  debugMode: boolean = true;
  debugApiCalls: any[] = [];
  private destroy$ = new Subject<void>();

  // API Configuration
  private DEVICE_ID!: string;
  private API_TOKEN!: string;
  private readonly API_BASE_TEMPLATE = 'https://meterdashboard.kimbal.io/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries';
  private API_BASE_URL!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {

    const today = new Date();

    // Format helper → YYYY-MM-DD
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
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
      .subscribe(params => {
        this.DEVICE_ID = params['deviceId'];
        this.API_TOKEN = params['token'];
        this.API_BASE_URL = this.API_BASE_TEMPLATE.replace('{deviceId}', this.DEVICE_ID);
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

    if (this.dateRange.fromDate === this.dateRange.toDate && section.fromTime >= section.toTime) {
      alert('From time must be before to time for the same date');
      return false;
    }

    return true;
  }

  private generateDateRanges(section: any): Array<{ date: string, fromTime: string, toTime: string }> {
    const ranges: Array<{ date: string, fromTime: string, toTime: string }> = [];
    const fromDate = new Date(this.dateRange.fromDate);
    const toDate = new Date(this.dateRange.toDate);

    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const dateString = currentDate.toISOString().split('T')[0];
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
    const startTs = this.convertToTimestamp(date, fromTime);
    const endTs = this.convertToTimestamp(date, toTime);

    const url = `${this.API_BASE_URL}?keys=netkvah&startTs=${startTs}&endTs=${endTs}&agg=SUM&interval=7200000`;

    const headers = new HttpHeaders({
      'X-Authorization': 'Bearer ' + this.API_TOKEN,
      'Content-Type': 'application/json'
    });

    const debugInfo = { url, startTs, endTs, date, fromTime, toTime, timestamp: new Date().toISOString() };
    this.debugApiCalls.push(debugInfo);

    // console.lo'Making API call:', debugInfo);

    try {
      // ✅ use firstValueFrom to stay inside Angular zone
      const response = await firstValueFrom(this.http.get<ApiResponse>(url, { headers }));
      // console.lo'API Response received:', response);
      return response || {};
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  private convertToTimestamp(date: string, time: string): number {
    const dateTime = new Date(`${date}T${time}:00.000Z`);
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

      if (result.data && result.data.netkvah && Array.isArray(result.data.netkvah)) {
        result.data.netkvah.forEach((item: any) => {
          if (item.value && !isNaN(parseFloat(item.value))) {
            const value = parseFloat(item.value);
            totalKwh += value;
            hasValidData = true;
            // console.lo`Added value: ${value}, Running total: ${totalKwh}`);
          }
        });
      } else {
        console.warn(`Result ${index + 1} has no valid netkvah data:`, result.data);
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
