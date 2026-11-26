import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingContact, BookingRefund, BookingService, TravelerBooking, serviceLabels } from './booking-model';

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

const people = (n: number) => n + (n === 1 ? ' traveler' : ' travelers');
const latestPaymentOf = (payments?: SharedPaymentResponse[]) => {
  if (!payments?.length) return null;
  return [...payments].sort((a, b) => (b.attempt_no - a.attempt_no) || (b.id - a.id))[0];
};

const adaptShared = (service: BookingService, row: SharedBookingResponse): TravelerBooking => {
  const latestPayment = latestPaymentOf(row.payments);
  const datesLabel = service === 'homestay' ? 'Check-in and check-out'
    : service === 'rental' ? 'Pickup and return'
    : service === 'guide' ? 'Guide schedule'
    : service === 'artisan' ? 'Reservation schedule'
    : 'Activity schedule';
  const quantityLabel = service === 'homestay' ? 'Guests'
    : service === 'rental' ? 'Vehicles'
    : service === 'artisan' ? 'Reserved items'
    : 'Participants';
  const quantity = service === 'rental'
    ? row.quantity + (row.quantity === 1 ? ' vehicle' : ' vehicles')
    : service === 'artisan'
      ? row.quantity + (row.quantity === 1 ? ' item' : ' items')
      : people(row.quantity);
  const facts: { label: string; value: string | number }[] = [
    { label: 'Listing', value: '#' + row.listing_id },
  ];
  if (row.slot_id != null) facts.push({ label: 'Reserved slot', value: '#' + row.slot_id });
  if (row.package_id != null) facts.push({ label: 'Package', value: '#' + row.package_id });
  if (row.rental_unit_ids?.length) facts.push({ label: 'Assigned units', value: row.rental_unit_ids.map(id => '#' + id).join(', ') });

  return {
    service,
    id: row.id,
    reference: row.booking_reference,
    title: serviceLabels[service] + ' #' + row.listing_id,
    status: row.status,
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
  homestay: (r: SharedBookingResponse): TravelerBooking => adaptShared('homestay', r),
  activity: (r: SharedBookingResponse): TravelerBooking => adaptShared('activity', r),
  guide: (r: SharedBookingResponse): TravelerBooking => adaptShared('guide', r),
  rental: (r: SharedBookingResponse): TravelerBooking => adaptShared('rental', r),
  artisan: (r: SharedBookingResponse): TravelerBooking => adaptShared('artisan', r),
};

export interface ServiceBookings { rows: TravelerBooking[]; limited: boolean }
export const bookingPageSize = 20;

@Injectable({ providedIn: 'root' })
export class TravelerBookingsApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiBaseUrl;

  list(service: BookingService): Observable<ServiceBookings> {
    if (service === 'rental') {
      return forkJoin([
        this.myBookings('bike').pipe(catchError(() => of([] as SharedBookingResponse[]))),
        this.myBookings('bicycle').pipe(catchError(() => of([] as SharedBookingResponse[]))),
      ]).pipe(map(([bikes, bicycles]) => {
        const merged = new Map<number, SharedBookingResponse>();
        for (const row of [...bikes, ...bicycles]) {
          if (!merged.has(row.id)) merged.set(row.id, row);
        }
        const sorted = [...merged.values()].sort((a, b) => b.id - a.id);
        return {
          rows: sorted.map(row => adapt.rental(row)),
          limited: bikes.length >= bookingPageSize || bicycles.length >= bookingPageSize,
        };
      }));
    }

    const category = service === 'activity' || service === 'eco' ? 'adventure' : service;
    return this.myBookings(category).pipe(
      map(rows => ({
        rows: rows.map(row => adapt.shared(service, row)),
        limited: rows.length >= bookingPageSize,
      })),
    );
  }

  detail(service: BookingService, id: number): Observable<TravelerBooking | undefined> {
    return this.get<SharedBookingResponse>('/bookings/' + id).pipe(
      map(row => adapt.shared(service, row)),
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
