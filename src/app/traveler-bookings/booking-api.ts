import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reservation } from '../experiences/models/travel';
import { TravelApi } from '../experiences/services/travel-api';
import { BookingContact, BookingRefund, BookingService, TravelerBooking } from './booking-model';

interface Base {
  id: number;
  total_price: string | number;
  currency: string;
  payment_status?: string | null;
  payment_method?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancellation_policy_snapshot?: string | null;
  free_cancellation_hours_snapshot?: number;
}
interface Homestay extends Base {
  homestay_id: number; homestay_name?: string | null; status: string;
  check_in: string; check_out: string; guests: number; nightly_rate_snapshot?: string | null;
}
interface Activity extends Base { activity_slot_id: number; booking_status: string; participants: number }
interface Guide extends Base {
  tour_guide_id: number; booking_reference?: string | null; booking_status: string;
  guide_display_name: string; guide_base_city: string; package_title?: string | null;
  pickup_location?: string | null; start_datetime: string; end_datetime: string; number_of_people: number;
  refund_eligibility?: { eligible_refund_amount: string | number; currency: string; policy_note: string } | null;
}
interface Rental extends Base {
  booking_reference?: string | null; status: string; vehicle_id: number; vehicle_name?: string;
  pickup_at: string; return_at: string; pickup_location_name?: string | null; cover_image_url?: string | null;
  daily_rate_snapshot?: string | null; security_deposit?: string | null; deposit_status?: string | null;
}
interface Artisan extends Base {
  reservation_status: string; showcase_item_id: number; item_title?: string | null;
  listing_title?: string | null; item_image_url?: string | null; pickup_date?: string | null; quantity: number;
  provider_business_name?: string | null;
}

const base = (row: Base) => ({
  id: row.id, amount: row.total_price, currency: row.currency,
  paymentStatus: row.payment_status, paymentMethod: row.payment_method,
  cancellation: {
    policy: row.cancellation_policy_snapshot, cutoffHours: row.free_cancellation_hours_snapshot,
    reason: row.cancellation_reason, at: row.cancelled_at,
  },
});
const people = (n: number) => n + (n === 1 ? ' traveler' : ' travelers');
const moneyFact = (label: string, currency: string, value: string | null | undefined) =>
  value == null ? [] : [{ label, value: currency + ' ' + value }];

export const adapt = {
  homestay: (r: Homestay): TravelerBooking => ({
    ...base(r), service: 'homestay', title: r.homestay_name || 'Homestay #' + r.homestay_id,
    status: r.status, start: r.check_in, end: r.check_out, quantity: people(r.guests),
    datesLabel: 'Check-in and check-out', quantityLabel: 'Guests', contactId: r.homestay_id,
    facts: moneyFact('Booked nightly rate', r.currency, r.nightly_rate_snapshot),
  }),
  activity: (r: Activity): TravelerBooking => ({
    ...base(r), service: 'activity', title: 'Activity slot #' + r.activity_slot_id,
    status: r.booking_status, quantity: people(r.participants), quantityLabel: 'Participants',
  }),
  eco: (r: Reservation): TravelerBooking => ({
    service: 'eco', id: r.id, reference: r.reference, title: 'Eco experience #' + r.experience_id,
    status: r.status, start: r.starts_at, end: r.ends_at, quantity: people(r.participants),
    datesLabel: 'Experience schedule', quantityLabel: 'Participants',
    amount: r.total, currency: r.currency, paymentStatus: r.payment_status, paymentMethod: r.payment_method,
    facts: [{ label: 'Reserved slot', value: '#' + r.slot_id }],
  }),
  guide: (r: Guide): TravelerBooking => ({
    ...base(r), service: 'guide', reference: r.booking_reference, title: r.package_title || r.guide_display_name,
    location: r.pickup_location || r.guide_base_city, start: r.start_datetime, end: r.end_datetime,
    status: r.booking_status, quantity: people(r.number_of_people), datesLabel: 'Guide schedule',
    quantityLabel: 'Party size', contactId: r.tour_guide_id,
    facts: r.guide_display_name ? [{ label: 'Guide', value: r.guide_display_name }] : [],
    refundEstimate: r.refund_eligibility ? {
      amount: r.refund_eligibility.eligible_refund_amount, currency: r.refund_eligibility.currency,
      note: r.refund_eligibility.policy_note,
    } : undefined,
  }),
  rental: (r: Rental): TravelerBooking => ({
    ...base(r), service: 'rental', reference: r.booking_reference, title: r.vehicle_name || 'Rental vehicle #' + r.vehicle_id,
    location: r.pickup_location_name, image: r.cover_image_url, start: r.pickup_at, end: r.return_at,
    status: r.status, quantity: '1 vehicle', datesLabel: 'Pickup and return', quantityLabel: 'Vehicles',
    facts: [
      ...moneyFact('Booked daily rate', r.currency, r.daily_rate_snapshot),
      ...moneyFact('Recorded security deposit', r.currency, r.security_deposit),
      ...(r.deposit_status ? [{ label: 'Deposit status', value: r.deposit_status.replaceAll('_', ' ') }] : []),
    ],
  }),
  artisan: (r: Artisan): TravelerBooking => ({
    ...base(r), service: 'artisan', title: r.item_title || r.listing_title || 'Showcase item #' + r.showcase_item_id,
    image: r.item_image_url, start: r.pickup_date, status: r.reservation_status,
    quantity: r.quantity + (r.quantity === 1 ? ' item' : ' items'),
    datesLabel: 'Pickup date', quantityLabel: 'Reserved items',
    facts: r.provider_business_name ? [{ label: 'Artisan', value: r.provider_business_name }] : [],
  }),
};

export interface ServiceBookings { rows: TravelerBooking[]; limited: boolean }
export const bookingPageSize = 20;

@Injectable({ providedIn: 'root' })
export class TravelerBookingsApi {
  private readonly http = inject(HttpClient);
  private readonly eco = inject(TravelApi);
  private readonly url = environment.apiBaseUrl;

  list(service: BookingService): Observable<ServiceBookings> {
    const complete = (rows: TravelerBooking[]) => ({ rows, limited: false });
    const page = { page: 1, page_size: bookingPageSize };
    switch (service) {
      case 'homestay': return this.get<Homestay[]>('/bookings/me').pipe(map(rows => complete(rows.map(adapt.homestay))));
      case 'activity': return this.get<Activity[]>('/activity-bookings/me').pipe(map(rows => complete(rows.map(adapt.activity))));
      case 'artisan': return this.get<Artisan[]>('/artisan-reservations/me').pipe(map(rows => complete(rows.map(adapt.artisan))));
      case 'eco': return this.eco.bookings(1, bookingPageSize).pipe(map(rows => ({ rows: rows.map(adapt.eco), limited: rows.length === bookingPageSize })));
      case 'guide': return this.get<{ items: Guide[]; total_pages: number }>('/tour-guide-bookings/me', page).pipe(map(result => ({ rows: result.items.map(adapt.guide), limited: result.total_pages > 1 })));
      case 'rental': return this.get<{ items: Rental[]; pages: number }>('/rental-bookings/me', { page: 1, limit: bookingPageSize }).pipe(map(result => ({ rows: result.items.map(adapt.rental), limited: result.pages > 1 })));
    }
  }

  detail(service: BookingService, id: number): Observable<TravelerBooking | undefined> {
    switch (service) {
      case 'homestay': return this.get<Homestay>('/bookings/' + id).pipe(map(adapt.homestay));
      case 'activity': return this.list('activity').pipe(map(result => result.rows.find(row => row.id === id)));
      case 'eco': return this.eco.booking(id).pipe(map(adapt.eco));
      case 'guide': return this.get<Guide>('/tour-guide-bookings/' + id).pipe(map(adapt.guide));
      case 'rental': return this.get<Rental>('/rental-bookings/' + id).pipe(map(adapt.rental));
      case 'artisan': return this.get<Artisan>('/artisan-reservations/' + id).pipe(map(adapt.artisan));
    }
  }

  refundHistory(row: TravelerBooking): Observable<BookingRefund[]> | undefined {
    if (row.service === 'eco') return this.get<BookingRefund[]>('/eco-reservations/' + row.id + '/payments/refunds');
    if (row.service === 'guide') {
      return this.get<{ booking_id: number; refunds: BookingRefund[] }>('/tour-guide-bookings/' + row.id + '/payment/status')
        .pipe(map(result => {
          if (result.booking_id !== row.id) throw new Error('Unexpected booking reference');
          return result.refunds;
        }));
    }
    return undefined;
  }

  contact(row: TravelerBooking): Observable<BookingContact | null> | undefined {
    const id = row.contactId;
    if (!id || !Number.isSafeInteger(id) || id < 1) return undefined;
    if (row.service === 'homestay') {
      return this.get<{ homestay_id: number; business_name: string; phone: string }>('/homestays/' + id + '/contact')
        .pipe(map(data => data.homestay_id === id && data.phone ? { name: data.business_name, phone: data.phone } : null));
    }
    if (row.service === 'guide') {
      return this.get<{ tour_guide_id: number; is_authenticated_view: boolean; business_name: string; phone: string }>('/tour-guides/' + id + '/contact')
        .pipe(map(data => data.tour_guide_id === id && data.is_authenticated_view && data.phone
          ? { name: data.business_name, phone: data.phone } : null));
    }
    return undefined;
  }

  private get<T>(path: string, params?: Record<string, number>): Observable<T> {
    return this.http.get<T>(this.url + path, { params });
  }
}
