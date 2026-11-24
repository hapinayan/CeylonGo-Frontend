import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DEMO_HOMESTAY_CATEGORIES, DEMO_HOMESTAYS } from '../data/demo-homestays.data';
import {
  HomestayCategory,
  HomestayCategoryFilter,
  HomestayListResponse,
  HomestaySearchParams,
  HomestaySummary,
} from '../models/homestay.models';

const WISHLIST_STORAGE_KEY = 'ceylongo_homestay_wishlist';

@Injectable({
  providedIn: 'root',
})
export class HomestayService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly wishlistSignal = signal<number[]>(this.loadWishlistFromStorage());

  readonly wishlistIds = this.wishlistSignal.asReadonly();

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
          const wishlisted = new Set(this.wishlistSignal());
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
          return of(this.filterDemoHomestays(params));
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
    return this.wishlistSignal().includes(homestayId);
  }

  /**
   * Client-side search, filtering, and sorting over the safe demo dataset.
   */
  filterDemoHomestays(params?: HomestaySearchParams): HomestayListResponse {
    let items = [...DEMO_HOMESTAYS];
    const wishlisted = new Set(this.wishlistSignal());

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
