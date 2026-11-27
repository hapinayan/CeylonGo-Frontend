import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Route, Router, Routes } from '@angular/router';

function requirePreview(route: ActivatedRouteSnapshot) {
  return route.queryParamMap.get('preview') === '1' || inject(Router).createUrlTree(['/bicycles']);
}

const previewOnly: Pick<Route, 'canActivate' | 'runGuardsAndResolvers'> = {
  canActivate: [requirePreview],
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
};

export const previewBookingRoutes: Routes = [
  { path: 'my-rentals', ...previewOnly, title: 'My Rentals Preview | CeylonGo',
    loadComponent: () => import('./rental-booking-management').then(module => module.RentalBookingManagement) },
  { path: 'my-rentals/:reference', ...previewOnly, title: 'Rental Booking Preview | CeylonGo',
    loadComponent: () => import('./rental-booking-management').then(module => module.RentalBookingManagement) },
  { path: ':id/booking', ...previewOnly, title: 'Book a Rental Preview | CeylonGo',
    loadComponent: () => import('./rental-booking').then(module => module.RentalBooking) },
];
