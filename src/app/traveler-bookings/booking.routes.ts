import { CanActivateFn, Routes } from '@angular/router';
import { travelerAuthGuard } from '../core/guards/traveler-auth.guard';
import { bookingPreviewEnabled } from './booking-preview';
import { BookingReturnPosition, TravelerBookings } from './traveler-bookings';

const bookingAccess: CanActivateFn = (route, state) =>
  bookingPreviewEnabled && route.queryParamMap.get('preview') === '1' || travelerAuthGuard(route, state);

export const travelerBookingRoutes: Routes = [{
  path: '',
  providers: [BookingReturnPosition],
  children: [
    { path: '', component: TravelerBookings, title: 'My Bookings | CeylonGo', canActivate: [bookingAccess], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
    { path: ':service/:id', component: TravelerBookings, title: 'Booking Details | CeylonGo', canActivate: [bookingAccess], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  ],
}];
