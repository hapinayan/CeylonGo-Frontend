import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DEMO_HOMESTAY_CATEGORIES, DEMO_HOMESTAYS } from '../data/demo-homestays.data';
import {
  BookingConfirmation,
  BookingDraft,
  HomestayCategory,
  HomestayCategoryFilter,
  HomestayDetail,
  HomestayListResponse,
  HomestaySearchParams,
  HomestaySummary,
} from '../models/homestay.models';

import { HomestayWishlistState } from '../../traveler-wishlist/homestay-wishlist-state';
import { AuthService } from './auth.service';

const WISHLIST_STORAGE_KEY = 'ceylongo_homestay_wishlist';
const BOOKING_DRAFT_KEY = 'ceylongo_booking_draft';

@Injectable({
  providedIn: 'root',
})
export class HomestayService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly wishlistSignal = signal<number[]>(this.loadWishlistFromStorage());

  private readonly accountWishlist = inject(HomestayWishlistState);
  private readonly auth = inject(AuthService);
  private readonly demoListings = new WeakSet<HomestaySummary>();
  readonly wishlistIds = computed(() => this.auth.isAuthenticated() ? this.accountWishlist.ids() : this.wishlistSignal());

  changeWishlist(item: HomestaySummary): Observable<boolean> {
    if (!this.auth.isAuthenticated()) return of(this.toggleWishlist(item.id));
    if (this.demoListings.has(item)) return throwError(() => new Error('Sample property cannot be saved to an account.'));
    return this.accountWishlist.change(item.id);
  }

  /**
   * Retrieves homestays matching search & filter parameters.
   * If the backend endpoint is accessible, queries `/api/v1/homestays`.
   * Falls back gracefully to local demo data for offline development.
   */
  getHomestays(params?: HomestaySearchParams): Observable<HomestayListResponse> {
    let httpParams = new HttpParams();

    if (params?.query) {
      httpParams = httpParams.set('query', params.query.trim());
    }
    if (params?.location) {
      httpParams = httpParams.set('city', params.location.trim());
    }
    if (params?.min_price != null) {
      httpParams = httpParams.set('min_price', params.min_price.toString());
    }
    if (params?.max_price != null) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }
    if (params?.guests != null && params.guests > 0) {
      httpParams = httpParams.set('guests', params.guests.toString());
    }
    if (params?.check_in) {
      httpParams = httpParams.set('check_in', params.check_in);
    }
    if (params?.check_out) {
      httpParams = httpParams.set('check_out', params.check_out);
    }
    if (params?.is_verified) {
      httpParams = httpParams.set('is_verified', 'true');
    }
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? 8;
    httpParams = httpParams.set('page', page.toString());
    httpParams = httpParams.set('page_size', pageSize.toString());

    return this.http
      .get<HomestayListResponse>(`${this.apiBaseUrl}/homestays`, { params: httpParams })
      .pipe(
        map((response) => {
          const wishlisted = new Set(this.wishlistIds());
          const enrichedItems = response.items.map((item) => ({
            ...item,
            is_wishlisted: wishlisted.has(item.id),
          }));
          return {
            ...response,
            items: enrichedItems,
            total_pages: Math.ceil(response.total / pageSize) || 1,
          };
        }),
        catchError(() => {
          const result = this.filterDemoHomestays(params);
          result.items.forEach(item => this.demoListings.add(item));
          return of(result);
        })
      );
  }

  /**
   * Retrieves the 8 approved homestay categories with live counts.
   */
  getCategories(): HomestayCategoryFilter[] {
    return DEMO_HOMESTAY_CATEGORIES.map((cat) => {
      if (cat.id === 'all') {
        return { ...cat, count: DEMO_HOMESTAYS.length };
      }
      const count = DEMO_HOMESTAYS.filter((h) => this.matchesCategory(h.category, cat.id)).length;
      return { ...cat, count: count || cat.count };
    });
  }

  /**
   * Toggles an item in the user's local wishlist and persists it.
   */
  toggleWishlist(homestayId: number): boolean {
    const current = new Set(this.wishlistSignal());
    let isNowWishlisted: boolean;
    if (current.has(homestayId)) {
      current.delete(homestayId);
      isNowWishlisted = false;
    } else {
      current.add(homestayId);
      isNowWishlisted = true;
    }
    const updated = Array.from(current);
    this.wishlistSignal.set(updated);
    this.saveWishlistToStorage(updated);
    return isNowWishlisted;
  }

  isWishlisted(homestayId: number): boolean {
    return this.wishlistIds().includes(homestayId);
  }

  /**
   * Retrieves full details for a specific homestay by numeric ID.
   * Gracefully falls back to local demo properties for offline development.
   */
  getHomestayById(id: number | string): Observable<HomestayDetail | null> {
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) {
      return of(null);
    }

    return this.http
      .get<HomestayDetail>(`${this.apiBaseUrl}/homestays/${numericId}`)
      .pipe(
        map((homestay) => {
          if (!homestay) return null;
          return {
            ...homestay,
            is_wishlisted: this.isWishlisted(homestay.id),
          };
        }),
        catchError(() => {
          const item = this.findDemoHomestayById(numericId);
          if (item) this.demoListings.add(item);
          return of(item);
        })
      );
  }

  /**
   * Finds a demo homestay by ID from the safe local dataset.
   */
  findDemoHomestayById(id: number | string): HomestayDetail | null {
    const numericId = Number(id);
    const item = DEMO_HOMESTAYS.find((h) => h.id === numericId);
    if (!item) return null;

    return {
      ...item,
      is_wishlisted: this.isWishlisted(item.id),
    };
  }

  /**
   * Saves active booking draft safely in client memory / sessionStorage for cross-page navigation.
   */
  setBookingDraft(draft: BookingDraft): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      // Ignore sessionStorage exceptions in test/SSR contexts
    }
  }

  /**
   * Retrieves active booking draft from sessionStorage.
   */
  getBookingDraft(): BookingDraft | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Clears any stored booking draft.
   */
  clearBookingDraft(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(BOOKING_DRAFT_KEY);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Calculates night count between two date strings (YYYY-MM-DD).
   * Returns 0 if dates are invalid or check-out is before check-in.
   */
  calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  /**
   * Calculates estimated price based on nightly rate and nights.
   */
  calculateEstimatedPrice(nightlyRate: number, nights: number): number {
    if (nightlyRate <= 0 || nights <= 0) return 0;
    return nightlyRate * nights;
  }

  /**
   * Simulates reservation request confirmation in demo mode.
   */
  simulateBookingConfirmation(draft: BookingDraft): BookingConfirmation {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ref = `CG-HS-${draft.homestayId}-${randomSuffix}`;
    return {
      bookingReference: ref,
      homestayId: draft.homestayId,
      homestayName: draft.homestayName,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      totalGuests: draft.totalGuests,
      nights: draft.nights,
      estimatedTotal: draft.estimatedTotal,
      hostName: 'Local Host',
      confirmedAt: new Date().toISOString(),
    };
  }

  /**
   * Client-side search, filtering, and sorting over the safe demo dataset.
   */
  filterDemoHomestays(params?: HomestaySearchParams): HomestayListResponse {
    let items = [...DEMO_HOMESTAYS];
    const wishlisted = new Set(this.wishlistIds());

    // 1. Text & Location Search
    if (params?.query && params.query.trim()) {
      const q = params.query.trim().toLowerCase();
      items = items.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.district.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q)
      );
    }

    if (params?.location && params.location.trim()) {
      const loc = params.location.trim().toLowerCase();
      items = items.filter(
        (h) =>
          h.location.toLowerCase().includes(loc) ||
          h.city.toLowerCase().includes(loc) ||
          h.district.toLowerCase().includes(loc)
      );
    }

    // 2. Category Filter with Aliases
    if (params?.category && params.category !== 'all') {
      const targetCat = params.category;
      items = items.filter((h) => this.matchesCategory(h.category, targetCat));
    }

    // 3. Guest Capacity
    if (params?.guests && params.guests > 0) {
      items = items.filter((h) => h.max_guests >= params.guests!);
    }

    // 4. Price Bounds
    if (params?.min_price != null) {
      items = items.filter((h) => h.price_per_night >= params.min_price!);
    }
    if (params?.max_price != null) {
      items = items.filter((h) => h.price_per_night <= params.max_price!);
    }

    // 5. Verification
    if (params?.is_verified) {
      items = items.filter((h) => h.is_verified);
    }

    // 6. Amenities
    if (params?.amenities && params.amenities.length > 0) {
      items = items.filter((h) =>
        params.amenities!.every((reqAmenity) =>
          h.amenities.some((a) => a.toLowerCase().includes(reqAmenity.toLowerCase()))
        )
      );
    }

    // 7. Sorting
    switch (params?.sort_by) {
      case 'price_low':
        items.sort((a, b) => a.price_per_night - b.price_per_night);
        break;
      case 'price_high':
        items.sort((a, b) => b.price_per_night - a.price_per_night);
        break;
      case 'rating':
        items.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        items.sort((a, b) => b.review_count - a.review_count);
        break;
      case 'popular':
      default:
        // Popular: superhosts first, then review count, then rating
        items.sort((a, b) => {
          if ((b.is_superhost ? 1 : 0) !== (a.is_superhost ? 1 : 0)) {
            return (b.is_superhost ? 1 : 0) - (a.is_superhost ? 1 : 0);
          }
          if (b.review_count !== a.review_count) {
            return b.review_count - a.review_count;
          }
          return b.rating - a.rating;
        });
        break;
    }

    const total = items.length;
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.page_size ?? 8);
    const startIndex = (page - 1) * pageSize;
    const pagedItems = items.slice(startIndex, startIndex + pageSize).map((item) => ({
      ...item,
      is_wishlisted: wishlisted.has(item.id),
    }));

    return {
      items: pagedItems,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize) || 1,
    };
  }

  private matchesCategory(itemCat: HomestayCategory, filterCat: HomestayCategory): boolean {
    if (filterCat === 'all') return true;
    if (itemCat === filterCat) return true;
    if ((filterCat === 'mountain' || filterCat === 'hill-country') && (itemCat === 'mountain' || itemCat === 'hill-country')) return true;
    if ((filterCat === 'beach' || filterCat === 'beachfront') && (itemCat === 'beach' || itemCat === 'beachfront')) return true;
    if ((filterCat === 'cultural' || filterCat === 'heritage') && (itemCat === 'cultural' || itemCat === 'heritage')) return true;
    if ((filterCat === 'eco' || filterCat === 'eco-nature') && (itemCat === 'eco' || itemCat === 'eco-nature')) return true;
    if ((filterCat === 'nature' || filterCat === 'lakeside') && (itemCat === 'nature' || itemCat === 'lakeside')) return true;
    if ((filterCat === 'family' || filterCat === 'village') && (itemCat === 'family' || itemCat === 'village')) return true;
    if ((filterCat === 'budget' || filterCat === 'city') && (itemCat === 'budget' || itemCat === 'city')) return true;
    return false;
  }

  private loadWishlistFromStorage(): number[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      // Ignore storage errors in test or SSR contexts
    }
    return [];
  }

  private saveWishlistToStorage(ids: number[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
      }
    } catch {
      // Ignore storage errors in test or SSR contexts
    }
  }
}
