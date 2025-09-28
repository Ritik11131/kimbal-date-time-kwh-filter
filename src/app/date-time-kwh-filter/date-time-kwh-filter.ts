import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, takeUntil, forkJoin, of, firstValueFrom } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
  fromTime: string;
  toTime: string;
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
      purchase: '14121.05',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-2',
      title: 'SELECT TIME',
      fromTime: '02:45',
      toTime: '08:30',
      purchase: '25344.19',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-3',
      title: 'SELECT TIME',
      fromTime: '08:30',
      toTime: '12:00',
      purchase: '18750.25',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-4',
      title: 'SELECT TIME',
      fromTime: '12:00',
      toTime: '16:30',
      purchase: '32100.40',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-5',
      title: 'SELECT TIME',
      fromTime: '16:30',
      toTime: '19:00',
      purchase: '28900.75',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-6',
      title: 'SELECT TIME',
      fromTime: '19:00',
      toTime: '22:30',
      purchase: '35200.60',
      isPositive: true,
      isLoading: false
    },
    {
      id: 'section-7',
      title: 'SELECT TIME',
      fromTime: '22:30',
      toTime: '23:59',
      purchase: '12500.30',
      isPositive: true,
      isLoading: false
    }
  ];

  dateRange: DateRange = {
    fromDate: '2025-09-20',
    toDate: '2025-09-22',
    fromTime: '00:00',
    toTime: '02:00'
  };

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
    ) {}

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
        console.log('Date changed:', this.dateRange.fromDate, 'to', this.dateRange.toDate);
    }

    onTimeChange(section: ControlSectionData): void {
        console.log('Time changed for section:', section.id, section.fromTime, 'to', section.toTime);
    }

    refreshSection(section: ControlSectionData): void {
        console.log('Refreshing section:', section.id);
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

        console.log('Starting API calls for section:', section);
        const dateRanges = this.generateDateRanges(section);
        console.log('Generated date ranges:', dateRanges);

        // Process API calls sequentially
        this.processApiCallsSequentially(dateRanges, section)
            .then(results => {
                console.log('All API calls completed successfully:', results);
                this.updateSectionData(section, results);
            })
            .catch(error => {
                console.error('Error processing API calls:', error);
                alert('Error fetching data. Please try again.');
            })
            .finally(() => {
                // This will ALWAYS execute after all API calls are done
                console.log('Resetting loading state for section:', section.id);
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

    private generateDateRanges(section: any): Array<{date: string, fromTime: string, toTime: string}> {
        const ranges: Array<{date: string, fromTime: string, toTime: string}> = [];
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
        dateRanges: Array<{date: string, fromTime: string, toTime: string}>,
        section: ControlSectionData
    ): Promise<any[]> {
        const results: any[] = [];
        
        console.log(`Starting sequential API calls for ${dateRanges.length} date ranges`);
        
        for (let i = 0; i < dateRanges.length; i++) {
            const range = dateRanges[i];
            console.log(`Processing API call ${i + 1}/${dateRanges.length} for ${range.date} ${section.fromTime} to ${section.toTime}`);
            
            try {
                const result = await this.makeApiCall(range.date, section.fromTime, section.toTime);
                results.push({
                    date: range.date,
                    fromTime: section.fromTime,
                    toTime: section.toTime,
                    data: result,
                    success: true
                });
                
                console.log(`API call ${i + 1}/${dateRanges.length} completed successfully`);
                
                // Add delay between requests to avoid rate limiting (except for the last request)
                if (i < dateRanges.length - 1) {
                    console.log('Waiting 500ms before next request...');
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
        
        console.log(`All ${dateRanges.length} API calls completed. Results:`, results);
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

    console.log('Making API call:', debugInfo);

    try {
      // ✅ use firstValueFrom to stay inside Angular zone
      const response = await firstValueFrom(this.http.get<ApiResponse>(url, { headers }));
      console.log('API Response received:', response);
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
        console.log(`Updating section ${section.id} with ${results.length} results`);
        
        // Calculate total kWh from all results
        let totalKwh = 0;
        let hasValidData = false;
        let successfulCalls = 0;
        let failedCalls = 0;

        results.forEach((result, index) => {
            console.log(`Processing result ${index + 1}:`, result);
            
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
                        console.log(`Added value: ${value}, Running total: ${totalKwh}`);
                    }
                });
            } else {
                console.warn(`Result ${index + 1} has no valid netkvah data:`, result.data);
            }
        });

        console.log(`Data processing complete for section ${section.id}:`);
        console.log(`- Successful calls: ${successfulCalls}/${results.length}`);
        console.log(`- Failed calls: ${failedCalls}/${results.length}`);
        console.log(`- Total kWh calculated: ${totalKwh}`);
        console.log(`- Has valid data: ${hasValidData}`);

        if (hasValidData) {
            section.purchase = totalKwh.toFixed(2);
            section.isPositive = totalKwh >= 0;
            console.log(`✅ Updated section ${section.id} with total kWh: ${section.purchase}`);
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
