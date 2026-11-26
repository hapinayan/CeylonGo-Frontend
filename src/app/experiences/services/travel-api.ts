import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActivityBookingCreateRequest,
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityDetails,
  ActivityPage,
  ActivityPaymentResponse,
  ActivitySlotDetails,
  AtLocationPaymentRequest,
  SimulatedPaymentRequest,
  WishlistStateResponse,
} from '../models/activity';
import { ActivitiesApi } from './activities-api';

export interface TravelSource {
  saved(limit: number, offset: number): Observable<ActivityPage>;
  save(id: number): Observable<WishlistStateResponse>;
  unsave(id: number): Observable<WishlistStateResponse>;
  slots(id: number, date?: string, participants?: number, limit?: number, offset?: number): Observable<ActivitySlotDetails[]>;
  reserve(request: ActivityBookingCreateRequest): Observable<ActivityBookingResponse>;
  bookings(limit: number, beforeId?: number | null): Observable<ActivityBookingResponse[]>;
  booking(id: number): Observable<ActivityBookingDetailResponse>;
  cancel(id: number, reason?: string | null): Observable<ActivityBookingResponse>;
  simulatePayment(request: SimulatedPaymentRequest): Observable<ActivityPaymentResponse>;
  payAtLocation(request: AtLocationPaymentRequest): Observable<ActivityPaymentResponse>;
}

@Injectable({ providedIn: 'root' })
export class TravelApi implements TravelSource {
  private readonly activities = inject(ActivitiesApi);

  saved(limit = 20, offset = 0) {
    return this.activities.wishlist(limit, offset);
  }

  save(id: number) {
    return this.activities.saveToWishlist(id);
  }

  unsave(id: number) {
    return this.activities.removeFromWishlist(id);
  }

  slots(id: number, date?: string, participants?: number, limit = 50, offset = 0) {
    return this.activities.availability(id, { date, participants, limit, offset });
  }

  reserve(request: ActivityBookingCreateRequest) {
    return this.activities.createBooking(request);
  }

  bookings(limit = 20, beforeId?: number | null) {
    return this.activities.myBookings(limit, beforeId);
  }

  booking(id: number) {
    return this.activities.bookingDetail(id);
  }

  cancel(id: number, reason?: string | null) {
    return this.activities.cancelBooking(id, reason);
  }

  simulatePayment(request: SimulatedPaymentRequest) {
    return this.activities.simulatePayment(request);
  }

  payAtLocation(request: AtLocationPaymentRequest) {
    return this.activities.payAtLocation(request);
  }
}

export const BOOKABLE_PREVIEW = new InjectionToken<(id: string) => ActivityDetails | null>(
  'Preview booking listing',
  { factory: () => () => null },
);

export const TRAVEL_SOURCE = new InjectionToken<TravelSource>('Experience traveler API', {
  factory: () => inject(TravelApi),
});
