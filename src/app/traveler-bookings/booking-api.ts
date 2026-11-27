import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../core/interceptors/auth.interceptor';
import {
  BookingContact,
  BookingRefund,
  BookingService,
  TravelerBooking,
  serviceLabels,
} from './booking-model';

export interface SharedPaymentResponse {
  id: number;
  booking_id: number;
  request_key: string;
  attempt_no: number;
  method: string;
  status: string;
  display_amount: string;
  currency: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface SharedBookingResponse {
  id: number;
  listing_id: number;
  traveler_id?: number;
  request_key?: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  total_amount: string | number;
  currency: string;
  status: string;
  created_at?: string;
  booking_reference?: string | null;
  slot_id?: number | null;
  package_id?: number | null;
  rental_unit_ids?: number[] | null;
  payments?: SharedPaymentResponse[];
}

export interface PublicListingSummary {
  id: number;
  category?: string;
  title?: string;
  district?: string | null;
  locality?: string | null;
  media?: Array<{ image_url?: string | null; storage_key?: string | null }>;
}

const people = (n: number) => n + (n === 1 ? ' traveler' : ' travelers');

const latestPaymentOf = (payments?: SharedPaymentResponse[]) => {
  if (!payments?.length) return null;
  return [...payments].sort((a, b) => b.attempt_no - a.attempt_no || b.id - a.id)[0];
};

const categoryLabelForRaw = (
  service: BookingService,
  rawCategory?: 'homestay' | 'adventure' | 'guide' | 'bike' | 'bicycle',
): string => {
  if (rawCategory === 'bike') return 'Motorbike / Scooter Rental';
  if (rawCategory === 'bicycle') return 'Bicycle Rental';
  return serviceLabels[service];
};

const adaptShared = (
  service: BookingService,
  row: SharedBookingResponse,
  rawCategory?: 'homestay' | 'adventure' | 'guide' | 'bike' | 'bicycle',
): TravelerBooking => {
  const latestPayment = latestPaymentOf(row.payments);
  const datesLabel =
    service === 'homestay'
      ? 'Check-in and check-out'
      : service === 'rental'
        ? 'Pickup and return'
        : service === 'guide'
          ? 'Guide schedule'
          : 'Activity schedule';
  const quantityLabel =
    service === 'homestay' ? 'Guests' : service === 'rental' ? 'Vehicles' : 'Participants';
  const quantity = service === 'rental' ? row.quantity + (row.quantity === 1 ? ' vehicle' : ' vehicles') : people(row.quantity);
  const facts: { label: string; value: string | number }[] = [{ label: 'Listing', value: '#' + row.listing_id }];
  if (row.slot_id != null) facts.push({ label: 'Reserved slot', value: '#' + row.slot_id });
  if (row.package_id != null) facts.push({ label: 'Package', value: '#' + row.package_id });
  if (row.rental_unit_ids?.length) {
    facts.push({ label: 'Assigned units', value: row.rental_unit_ids.map((id) => '#' + id).join(', ') });
  }

  return {
    service,
    rawCategory,
    id: row.id,
    listingId: row.listing_id,
    reference: row.booking_reference,
    title: categoryLabelForRaw(service, rawCategory) + ' #' + row.listing_id,
    status: row.status,
    createdAt: row.created_at ?? null,
    start: row.starts_at,
    end: row.ends_at,
    quantity,
    datesLabel,
    quantityLabel,
    amount: row.total_amount,
    currency: row.currency,
    paymentStatus: latestPayment?.status ?? 'unpaid',
    paymentMethod: latestPayment?.method ?? null,
    facts,
  };
};

export const adapt = {
  shared: adaptShared,
  homestay: (r: SharedBookingResponse): TravelerBooking => adaptShared('homestay', r, 'homestay'),
  activity: (r: SharedBookingResponse): TravelerBooking => adaptShared('activity', r, 'adventure'),
  guide: (r: SharedBookingResponse): TravelerBooking => adaptShared('guide', r, 'guide'),
  rental: (r: SharedBookingResponse, sub: 'bike' | 'bicycle' = 'bike'): TravelerBooking =>
    adaptShared('rental', r, sub),
};

export interface ServiceBookings {
  rows: TravelerBooking[];
  limited: boolean;
}

export const bookingPageSize = 20;

@Injectable({ providedIn: 'root' })
export class TravelerBookingsApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiBaseUrl;
  private readonly listingCache = new Map<number, PublicListingSummary | null>();

  list(service: BookingService): Observable<ServiceBookings> {
    if (service === 'rental') {
      return forkJoin([
        this.myBookings('bike').pipe(catchError(() => of([] as SharedBookingResponse[]))),
        this.myBookings('bicycle').pipe(catchError(() => of([] as SharedBookingResponse[]))),
      ]).pipe(
        map(([bikes, bicycles]) => {
          const rowsById = new Map<number, TravelerBooking>();
          for (const row of bikes) {
            if (!rowsById.has(row.id)) rowsById.set(row.id, adapt.rental(row, 'bike'));
          }
          for (const row of bicycles) {
            if (!rowsById.has(row.id)) rowsById.set(row.id, adapt.rental(row, 'bicycle'));
          }
          const sorted = [...rowsById.values()].sort((a, b) => b.id - a.id);
          return {
            rows: sorted,
            limited: bikes.length >= bookingPageSize || bicycles.length >= bookingPageSize,
          };
        }),
      );
    }

    const category = service === 'activity' || service === 'eco' ? 'adventure' : service;
    return this.myBookings(category).pipe(
      map((rows) => ({
        rows: rows.map((row) => adapt.shared(service, row, category)),
        limited: rows.length >= bookingPageSize,
      })),
    );
  }

  detail(service: BookingService | null, id: number): Observable<TravelerBooking | undefined> {
    return this.get<SharedBookingResponse>('/bookings/' + id).pipe(
      map((row) => adapt.shared(service ?? 'homestay', row)),
    );
  }

  cancelBooking(bookingId: number, reason?: string | null): Observable<SharedBookingResponse> {
    return this.http.patch<SharedBookingResponse>(`${this.url}/bookings/${bookingId}/status`, {
      to_status: 'cancelled',
      reason: reason?.trim() ? reason.trim().slice(0, 500) : null,
    });
  }

  resolvePublicListing(listingId: number): Observable<PublicListingSummary | null> {
    if (this.listingCache.has(listingId)) {
      return of(this.listingCache.get(listingId) ?? null);
    }
    const context = new HttpContext().set(ANONYMOUS_API_REQUEST, true);
    return this.http.get<PublicListingSummary>(`${this.url}/listings/${listingId}`, { context }).pipe(
      map((res) => {
        this.listingCache.set(listingId, res ?? null);
        return res ?? null;
      }),
      catchError(() => {
        this.listingCache.set(listingId, null);
        return of(null);
      }),
    );
  }

  refundHistory(_row: TravelerBooking): Observable<BookingRefund[]> | undefined {
    return undefined;
  }

  contact(_row: TravelerBooking): Observable<BookingContact | null> | undefined {
    return undefined;
  }

  private myBookings(category: string): Observable<SharedBookingResponse[]> {
    return this.get<SharedBookingResponse[]>('/bookings/my', {
      category,
      limit: bookingPageSize,
    });
  }

  private get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(this.url + path, { params });
  }
}
