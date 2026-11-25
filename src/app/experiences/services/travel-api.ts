import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { EcoDetail } from '../models/eco';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { CheckoutPreparation, BookingSlot, PaymentStatus, Reservation, ReservationRequest, SavedItem, SavedPage } from '../models/travel';

export interface TravelSource {
  saved(page: number, size: number, availableOnly?: boolean): Observable<SavedPage>;
  save(id: number): Observable<SavedItem>;
  unsave(id: number): Observable<void>;
  slots(id: number, day: string, page: number): Observable<BookingSlot[]>;
  reserve(request: ReservationRequest): Observable<Reservation>;
  bookings(page: number, size: number): Observable<Reservation[]>;
  booking(id: number): Observable<Reservation>;
  cancel(id: number, reason: string): Observable<Reservation>;
  payment(id: number): Observable<PaymentStatus>;
}

@Injectable({ providedIn: 'root' })
export class TravelApi implements TravelSource {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly reservations = this.base + '/eco-reservations';

  saved(page: number, size: number, availableOnly = false) {
    return this.http.get<SavedPage>(this.base + '/wishlists/me', {
      params: {page, page_size: size, available_only: availableOnly},
    });
  }
  save(id: number) { return this.http.post<SavedItem>(this.base + '/wishlists/eco/' + id, null); }
  unsave(id: number) { return this.http.delete<void>(this.base + '/wishlists/eco/' + id); }
  slots(id: number, day: string, page: number) {
    return this.http.get<BookingSlot[]>(this.base + '/eco-experiences/' + id + '/availability', {
      params: new HttpParams().set('day', day).set('page', page).set('page_size', 10),
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }
  reserve(request: ReservationRequest) { return this.http.post<Reservation>(this.reservations, request); }
  bookings(page: number, size: number) {
    return this.http.get<Reservation[]>(this.reservations + '/me', {params: {page, page_size: size}});
  }
  booking(id: number) { return this.http.get<Reservation>(this.reservations + '/' + id); }
  cancel(id: number, reason: string) {
    return this.http.post<Reservation>(this.reservations + '/' + id + '/cancel', {reason: reason.trim() || null});
  }
  payment(id: number) {
    return this.http.get<PaymentStatus>(this.reservations + '/' + id + '/payments/status');
  }
  prepareCheckout(id: number) {
    return this.http.post<CheckoutPreparation>(this.reservations + '/' + id + '/payments/initiate', null);
  }
}

export const BOOKABLE_PREVIEW = new InjectionToken<(id: string) => EcoDetail | null>('Preview booking listing', {
  factory: () => () => null,
});

export const TRAVEL_SOURCE = new InjectionToken<TravelSource>('Experience traveler API', {
  factory: () => inject(TravelApi),
});
