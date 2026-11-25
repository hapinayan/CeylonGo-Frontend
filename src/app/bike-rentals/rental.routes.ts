import { ChangeDetectionStrategy, Component, Injectable } from '@angular/core';
import { RouterOutlet, Routes } from '@angular/router';
import { Footer } from '../shared/components/footer/footer';
import { TravelerNavbar } from '../shared/components/traveler-navbar/traveler-navbar';
import { TravelerAuthModal } from '../shared/components/traveler-auth-modal/traveler-auth-modal';
import { previewBookingRoutes } from './rental-booking-routes';

@Injectable()
export class RentalScroll {
  position = 0;
}

@Component({
  imports: [RouterOutlet, TravelerNavbar, Footer, TravelerAuthModal],
  providers: [RentalScroll],
  template: '<app-traveler-navbar /><router-outlet /><app-footer /><app-traveler-auth-modal />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RentalShell {}

export const rentalRoutes: Routes = [{
  path: '',
  component: RentalShell,
  children: [
    ...previewBookingRoutes,
    { path: '', title: 'Bike & Bicycle Rental | CeylonGo', loadComponent: () => import('./rental-discover').then(module => module.RentalDiscover) },
    { path: ':id', title: 'Rental Vehicle Details | CeylonGo', loadComponent: () => import('./rental-details').then(module => module.RentalDetails) },
  ],
}];
