import { ChangeDetectionStrategy, Component, Injectable } from '@angular/core';
import { RouterOutlet, Routes } from '@angular/router';
import { previewBookingRoutes } from './rental-booking-routes';

@Injectable()
export class RentalScroll {
  position = 0;
}

@Component({
  imports: [RouterOutlet],
  providers: [RentalScroll],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RentalShell {}

export const rentalRoutes: Routes = [{
  path: '',
  component: RentalShell,
  children: [
    { path: ':id/booking', title: 'Rental Booking | CeylonGo', loadComponent: () => import('./rental-booking').then(module => module.RentalBooking) },
    ...previewBookingRoutes,
    { path: '', title: 'Bike & Bicycle Rental | CeylonGo', loadComponent: () => import('./rental-discover').then(module => module.RentalDiscover) },
    { path: ':id', title: 'Rental Vehicle Details | CeylonGo', loadComponent: () => import('./rental-details').then(module => module.RentalDetails) },
  ],
}];
