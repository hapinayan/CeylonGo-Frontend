import { Routes } from '@angular/router';
import { catalogProviders } from './services/catalog-provider';

export const experiencesRoutes: Routes = [
  {
    path: 'wishlist',
    title: 'Saved Experiences | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/traveler/wishlist').then(m => m.SavedExperiences),
  },
  {
    path: 'bookings',
    title: 'My Experience Bookings | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/traveler/bookings').then(m => m.MyExperienceBookings),
  },
  {
    path: 'bookings/:bookingId',
    title: 'Reservation details | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/traveler/booking-detail').then(m => m.BookingDetail),
  },
  {
    path: ':id/book',
    title: 'Book an Experience | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/traveler/booking-create').then(m => m.BookingCreate),
  },
  {
    path: '',
    title: 'Experiences in Sri Lanka | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/discover/discover').then(m => m.Discover),
  },
  {
    path: ':id',
    title: 'Experience details | CeylonGo',
    providers: catalogProviders,
    loadComponent: () => import('./pages/details/details').then(m => m.ExperienceDetails),
  },
];
