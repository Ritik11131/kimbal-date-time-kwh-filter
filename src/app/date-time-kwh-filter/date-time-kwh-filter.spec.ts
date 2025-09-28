import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateTimeKwhFilter } from './date-time-kwh-filter';

describe('DateTimeKwhFilter', () => {
  let component: DateTimeKwhFilter;
  let fixture: ComponentFixture<DateTimeKwhFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateTimeKwhFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateTimeKwhFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
