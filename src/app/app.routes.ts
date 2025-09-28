import { Routes } from '@angular/router';
import { DateTimeKwhFilter } from './date-time-kwh-filter/date-time-kwh-filter';
import { NotFound } from './not-found/not-found';

export const routes: Routes = [
  {
    path: ':token',
    component: DateTimeKwhFilter
  },
    {
    path: '**',
    component: NotFound
  }
];