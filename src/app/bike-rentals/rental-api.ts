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
  currency: string;
  selected_plan_name: string;
  total_price: string;
  security_deposit: string | null;
}

export interface SavedRental {
  saved_at: string; vehicle_id: number; vehicle_name: string; vehicle_type: string;
  city: string | null; district: string | null; location_name: string | null; primary_image_url: string | null;
  price_per_day: string | number; currency: string; is_available: boolean;
}

interface WishlistStatus {
  vehicle_id: number;
  saved: boolean;
}

interface WishlistAction extends WishlistStatus {
  message: string;
  wishlist_id: number | null;
}

@Injectable({ providedIn: 'root' })
export class RentalApi {
  private readonly http = inject(HttpClient);
  private readonly vehicles = environment.apiBaseUrl + '/rental-vehicles';

  search(query: RentalQuery): Observable<RentalPage> {
    const [min, max] = PRICE_RANGES[query.price] ?? [];
    let params = new HttpParams().set('sort_by', query.sort);
    if (query.city) params = params.set('city', query.city);
    if (min !== undefined) params = params.set('min_price', min);
    if (max !== undefined) params = params.set('max_price', max);
    if (query.pickup && query.dropoff) {
      params = params.set('pickup_at', query.pickup + 'T00:00:00+05:30')
        .set('return_at', query.dropoff + 'T00:00:00+05:30');
    }
    if (query.category === 'bike' || query.category === 'bicycle') {
      return this.pageOf(query.category, params, query.page, PAGE_SIZE);
    }

    const end = query.page * PAGE_SIZE;
    const batchSize = Math.min(100, end);
    return forkJoin({
      bikes: this.prefix('bike', params, end, batchSize),
      bicycles: this.prefix('bicycle', params, end, batchSize),
    }).pipe(map(({ bikes, bicycles }) => {
      const total = bikes.total + bicycles.total;
      const items = [...bikes.items, ...bicycles.items].sort((left, right) => {
        const sponsored = Number(!!right.is_sponsored) - Number(!!left.is_sponsored);
        if (sponsored) return sponsored;
        const price = Number(left.price_per_day) - Number(right.price_per_day);
        if (query.sort === 'price_asc') return price;
        if (query.sort === 'price_desc') return -price;
        return Date.parse(right.created_at) - Date.parse(left.created_at);
      });
      return { items: items.slice(end - PAGE_SIZE, end), total, pages: Math.ceil(total / PAGE_SIZE) };
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

  validateDates(id: number, dates: RentalDates): Observable<RentalDateValidation> {
    return this.http.post<RentalDateValidation>(
      environment.apiBaseUrl + '/rental-bookings/validate-dates',
      { vehicle_id: id, ...dates },
      { context: new HttpContext().set(ANONYMOUS_API_REQUEST, true) },
    );
  }

  quote(id: number, dates: RentalDates): Observable<RentalQuote> {
    return this.http.post<RentalQuote>(this.vehicles + '/' + id + '/calculate-quote', dates, {
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }

  savedList(page: number, limit: number) {
    return this.http.get<{ items: SavedRental[]; total: number; page: number; limit: number; pages: number }>(
      environment.apiBaseUrl + '/rental-wishlist', { params: { page, limit } },
    ).pipe(map(result => ({ ...result, page_size: result.limit, total_pages: result.pages })));
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
