import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, forkJoin, map, reduce } from 'rxjs';
import { environment } from '../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../core/interceptors/auth.interceptor';
import { RentalDates } from './rental-dates';
import { PAGE_SIZE, PRICE_RANGES, RentalPage, RentalQuery, RentalReviews, RentalType, RentalVehicle } from './rental-models';

export interface RentalDateValidation extends RentalDates {
  vehicle_id: number;
  is_valid: boolean;
  duration_hours: number;
  duration_days: number;
  collision_type: 'none' | 'booked' | 'maintenance';
  error_message: string | null;
}

export interface RentalQuote extends RentalDates {
  vehicle_id: number;
  quantity?: number;
  is_available?: boolean;
  available_quantity?: number;
  duration_days?: number;
  duration_hours?: number;
  rate?: string;
  currency: string;
  selected_plan_name: string;
  total_price: string;
  requires_driving_license?: boolean;
  security_deposit: string | null;
}

interface WishlistStatus {
  vehicle_id: number;
  saved: boolean;
}

interface WishlistAction extends WishlistStatus {
  message: string;
  wishlist_id: number | null;
}

export interface MvpBookingCreatePayload {
  listing_id: number;
  starts_at: string;
  ends_at: string;
  quantity: number;
  expected_total?: string | null;
  request_key: string;
  motorcycle_license_confirmed?: boolean;
  license_valid_until?: string | null;
}

export interface MvpBookingResponse {
  id: number;
  listing_id: number;
  traveler_id: number;
  request_key: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  total_amount: string;
  currency: string;
  status: string;
  created_at: string;
  booking_reference?: string | null;
}

export interface MvpPaymentResponse {
  id: number;
  booking_id: number;
  request_key: string;
  attempt_no: number;
  method: string;
  status: string;
  display_amount: string;
  currency: string;
  created_at: string;
  resolved_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class RentalApi {
  private readonly http = inject(HttpClient);
  private readonly vehicles = environment.apiBaseUrl + '/rental-vehicles';

  search(query: RentalQuery): Observable<RentalPage> {
    const [min, max] = PRICE_RANGES[query.price] ?? [];
    let params = new HttpParams().set('sort_by', query.sort);
    if (query.city) params = params.set('city', query.city);
    if (query.transmission) params = params.set('transmission', query.transmission.toLowerCase());
    if (min !== undefined) params = params.set('min_price', min);
    if (max !== undefined) params = params.set('max_price', max);
    if (query.pickup && query.dropoff) {
      params = params.set('pickup_at', query.pickup + 'T00:00:00+05:30')
        .set('return_at', query.dropoff + 'T00:00:00+05:30');
    }

    if (
      query.category === 'bike' ||
      query.category === 'bicycle' ||
      query.category === 'scooter' ||
      query.category === 'motorcycle'
    ) {
      const apiType: RentalType = query.category === 'bicycle' ? 'bicycle' : 'bike';
      let catParams = params;
      if (query.category === 'scooter' || query.category === 'motorcycle') {
        catParams = catParams.set('vehicle_subtype', query.category);
      }
      return this.pageOf(apiType, catParams, query.page, PAGE_SIZE);
    }

    const end = query.page * PAGE_SIZE;
    const batchSize = Math.min(100, end);
    return forkJoin({
      bikes: this.prefix('bike', params, end, batchSize),
      bicycles: this.prefix('bicycle', params, end, batchSize),
    }).pipe(map(({ bikes, bicycles }) => {
      const merged = [...bikes.items, ...bicycles.items].sort((left, right) => {
        const sponsored = Number(!!right.is_sponsored) - Number(!!left.is_sponsored);
        if (sponsored) return sponsored;
        const price = Number(left.price_per_day) - Number(right.price_per_day);
        if (query.sort === 'price_asc') return price;
        if (query.sort === 'price_desc') return -price;
        return Date.parse(right.created_at) - Date.parse(left.created_at);
      });
      const total = bikes.total + bicycles.total;
      return { items: merged.slice(end - PAGE_SIZE, end), total, pages: Math.ceil(total / PAGE_SIZE) };
    }));
  }

  detail(id: number): Observable<RentalVehicle> {
    return this.publicGet<RentalVehicle>(this.vehicles + '/' + id);
  }

  reviews(id: number): Observable<RentalReviews> {
    return this.publicGet<RentalReviews>(this.vehicles + '/' + id + '/reviews', new HttpParams().set('limit', 5));
  }

  availability(id: number, pickup: string, dropoff: string): Observable<{is_available: boolean}> {
    const params = new HttpParams().set('start_date', pickup + 'T00:00:00+05:30')
      .set('end_date', dropoff + 'T00:00:00+05:30');
    return this.publicGet<{is_available: boolean}>(this.vehicles + '/' + id + '/availability', params);
  }

  validateDates(id: number, dates: RentalDates, quantity = 1): Observable<RentalDateValidation> {
    const body = quantity > 1 ? { vehicle_id: id, ...dates, quantity } : { vehicle_id: id, ...dates };
    return this.http.post<RentalDateValidation>(
      environment.apiBaseUrl + '/rental-bookings/validate-dates',
      body,
      { context: new HttpContext().set(ANONYMOUS_API_REQUEST, true) },
    );
  }

  quote(id: number, dates: RentalDates, quantity = 1): Observable<RentalQuote> {
    const body = quantity > 1 ? { ...dates, quantity } : dates;
    return this.http.post<RentalQuote>(this.vehicles + '/' + id + '/calculate-quote', body, {
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }

  createMvpBooking(payload: MvpBookingCreatePayload): Observable<MvpBookingResponse> {
    return this.http.post<MvpBookingResponse>(`${environment.apiBaseUrl}/bookings`, payload);
  }

  simulateMvpPayment(
    bookingId: number,
    requestKey: string,
    attemptNo: number,
    simulateOutcome: 'success' | 'failure'
  ): Observable<MvpPaymentResponse> {
    return this.http.post<MvpPaymentResponse>(`${environment.apiBaseUrl}/payments/simulate`, {
      booking_id: bookingId,
      request_key: requestKey,
      attempt_no: attemptNo,
      simulate_outcome: simulateOutcome,
    });
  }

  payAtLocationMvp(bookingId: number, requestKey: string): Observable<MvpPaymentResponse> {
    return this.http.post<MvpPaymentResponse>(`${environment.apiBaseUrl}/payments/at-location`, {
      booking_id: bookingId,
      request_key: requestKey,
    });
  }

  saved(id: number): Observable<WishlistStatus> {
    return this.http.get<WishlistStatus>(this.wishlistUrl(id) + '/status');
  }

  toggleSaved(id: number, saved: boolean): Observable<WishlistAction> {
    return saved
      ? this.http.delete<WishlistAction>(this.wishlistUrl(id))
      : this.http.post<WishlistAction>(this.wishlistUrl(id), null);
  }

  private wishlistUrl(id: number): string {
    return environment.apiBaseUrl + '/rental-wishlist/' + id;
  }

  private prefix(type: RentalType, params: HttpParams, end: number, limit: number): Observable<RentalPage> {
    return this.pageOf(type, params, 1, limit).pipe(
      map(result => ({ result, page: 1 })),
      expand(({ result, page }) => page * limit < Math.min(end, result.total)
        ? this.pageOf(type, params, page + 1, limit).pipe(map(next => ({ result: next, page: page + 1 })))
        : EMPTY),
      reduce((all, { result }) => ({ ...result, items: [...all.items, ...result.items] }),
        { items: [], total: 0, pages: 0 } as RentalPage),
    );
  }

  private pageOf(type: RentalType, params: HttpParams, page: number, limit: number): Observable<RentalPage> {
    return this.publicGet<RentalPage>(this.vehicles, params.set('vehicle_type', type).set('page', page).set('limit', limit));
  }

  private publicGet<Result>(url: string, params?: HttpParams): Observable<Result> {
    return this.http.get<Result>(url, { params, context: new HttpContext().set(ANONYMOUS_API_REQUEST, true) });
  }
}
