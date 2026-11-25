import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  ArtisanFavoritePage,
  ArtisanFavoriteResponse,
  ArtisanWishlistCheckResponse,
  ArtisanWishlistItemResponse,
  ArtisanWishlistPagination,
} from '../models/artisan.models';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly favoritesUrl = `${environment.apiBaseUrl}/artisan-product-favorites`;
  private readonly wishlistUrl = `${environment.apiBaseUrl}/artisan-wishlists`;
  private readonly listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

  // Reactive signals for instant UI badge and heart state synchronization across pages
  readonly productFavoriteIds = signal<Set<number>>(new Set());
  readonly businessWishlistIds = signal<Set<number>>(new Set());

  // In-flight request tracking to prevent duplicate concurrent network calls
  private readonly pendingProductRequests = new Set<number>();
  private readonly pendingWishlistRequests = new Set<number>();

  private readonly DEMO_WISHLIST_KEY = 'ceylongo_demo_wishlist_ids';
  private readonly DEMO_FAVORITES_KEY = 'ceylongo_demo_favorites_ids';

  private lastUserId: number | null = null;

  constructor() {
    this.initDemoFavorites();

    // Monitor auth changes: clear state on logout or account switch, load on login
    effect(() => {
      const user = this.authService.currentUser();
      const currentUserId = user?.id ?? null;

      if (currentUserId !== this.lastUserId) {
        this.lastUserId = currentUserId;

        if (currentUserId !== null) {
          this.productFavoriteIds.set(new Set());
          this.businessWishlistIds.set(new Set());
          this.refreshFavoriteIds();
        } else {
          this.initDemoFavorites();
        }
      }
    });
  }

  private initDemoFavorites(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const rawWishlist = localStorage.getItem(this.DEMO_WISHLIST_KEY);
        const wishlistIds: number[] = rawWishlist ? JSON.parse(rawWishlist) : [1];
        this.businessWishlistIds.set(new Set(wishlistIds));

        const rawFavs = localStorage.getItem(this.DEMO_FAVORITES_KEY);
        const favIds: number[] = rawFavs ? JSON.parse(rawFavs) : [1];
        this.productFavoriteIds.set(new Set(favIds));
      } catch {
        this.businessWishlistIds.set(new Set([1]));
        this.productFavoriteIds.set(new Set([1]));
      }
    } else {
      this.businessWishlistIds.set(new Set([1]));
      this.productFavoriteIds.set(new Set([1]));
    }
  }

  private persistDemoFavorites(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          this.DEMO_WISHLIST_KEY,
          JSON.stringify(Array.from(this.businessWishlistIds()))
        );
        localStorage.setItem(
          this.DEMO_FAVORITES_KEY,
          JSON.stringify(Array.from(this.productFavoriteIds()))
        );
      } catch {}
    }
  }

  /**
   * Refreshes the set of favorite product and business IDs for the authenticated traveler.
   * Real backend API is the authoritative source; no fake persistent fallback.
   */
  refreshFavoriteIds(): void {
    if (!this.authService.isAuthenticated()) {
      this.productFavoriteIds.set(new Set());
      this.businessWishlistIds.set(new Set());
      return;
    }

    this.getProductFavorites(1, 100).subscribe({
      next: (res) => {
        const ids = new Set(res.items.map((i) => i.product_id));
        this.productFavoriteIds.set(ids);
      },
      error: () => {
        // Backend offline or error - retain empty set, do not fabricate fake items
      },
    });

    this.getBusinessWishlist(1, 100).subscribe({
      next: (res) => {
        const ids = new Set(res.items.map((i) => i.artisan_listing_id));
        this.businessWishlistIds.set(ids);
      },
      error: () => {
        // Backend offline or error - retain empty set, do not fabricate fake items
      },
    });
  }

  isProductFavorite(productId: number): boolean {
    return this.productFavoriteIds().has(productId);
  }

  isBusinessSaved(listingId: number): boolean {
    return this.businessWishlistIds().has(listingId);
  }

  /**
   * Toggle product favorite state with optimistic update, in-flight deduplication, and rollback on error.
   * If isDemo is true, mutates isolated local demo favorites without bypassing live auth.
   */
  toggleProductFavorite(productId: number, isDemo: boolean = false): Observable<{ isFavorite: boolean }> {
    if (!this.authService.isAuthenticated()) {
      if (isDemo) {
        // Isolated demo mode persistence
        const currentSet = new Set(this.productFavoriteIds());
        const wasFavorite = currentSet.has(productId);
        if (wasFavorite) {
          currentSet.delete(productId);
        } else {
          currentSet.add(productId);
        }
        this.productFavoriteIds.set(currentSet);
        this.persistDemoFavorites();
        return of({ isFavorite: !wasFavorite });
      }
      return throwError(() => new Error('AUTHENTICATION_REQUIRED'));
    }

    if (this.pendingProductRequests.has(productId)) {
      // Prevent duplicate concurrent requests
      return of({ isFavorite: this.isProductFavorite(productId) });
    }

    this.pendingProductRequests.add(productId);

    const currentSet = new Set(this.productFavoriteIds());
    const wasFavorite = currentSet.has(productId);

    // Optimistic update
    if (wasFavorite) {
      currentSet.delete(productId);
    } else {
      currentSet.add(productId);
    }
    this.productFavoriteIds.set(currentSet);

    if (wasFavorite) {
      return this.http.delete<void>(`${this.favoritesUrl}/${productId}`).pipe(
        map(() => ({ isFavorite: false })),
        tap({
          complete: () => this.pendingProductRequests.delete(productId),
          error: () => this.pendingProductRequests.delete(productId),
        }),
        catchError((err) => {
          // Rollback state strictly on failure - never show false success
          const rollback = new Set(this.productFavoriteIds());
          rollback.add(productId);
          this.productFavoriteIds.set(rollback);
          return throwError(() => err);
        })
      );
    } else {
      return this.http.put<ArtisanFavoriteResponse>(`${this.favoritesUrl}/${productId}`, {}).pipe(
        map(() => ({ isFavorite: true })),
        tap({
          complete: () => this.pendingProductRequests.delete(productId),
          error: () => this.pendingProductRequests.delete(productId),
        }),
        catchError((err) => {
          // Rollback state strictly on failure - never show false success
          const rollback = new Set(this.productFavoriteIds());
          rollback.delete(productId);
          this.productFavoriteIds.set(rollback);
          return throwError(() => err);
        })
      );
    }
  }

  /**
   * Toggle business wishlist state with optimistic update, in-flight deduplication, and rollback on error.
   * If isDemo is true, mutates isolated local demo wishlist without bypassing live auth.
   */
  toggleBusinessWishlist(listingId: number, isDemo: boolean = false): Observable<{ isSaved: boolean }> {
    if (!this.authService.isAuthenticated()) {
      if (isDemo) {
        // Isolated demo mode persistence
        const currentSet = new Set(this.businessWishlistIds());
        const wasSaved = currentSet.has(listingId);
        if (wasSaved) {
          currentSet.delete(listingId);
        } else {
          currentSet.add(listingId);
        }
        this.businessWishlistIds.set(currentSet);
        this.persistDemoFavorites();
        return of({ isSaved: !wasSaved });
      }
      return throwError(() => new Error('AUTHENTICATION_REQUIRED'));
    }

    if (this.pendingWishlistRequests.has(listingId)) {
      // Prevent duplicate concurrent requests
      return of({ isSaved: this.isBusinessSaved(listingId) });
    }

    this.pendingWishlistRequests.add(listingId);

    const currentSet = new Set(this.businessWishlistIds());
    const wasSaved = currentSet.has(listingId);

    // Optimistic update
    if (wasSaved) {
      currentSet.delete(listingId);
    } else {
      currentSet.add(listingId);
    }
    this.businessWishlistIds.set(currentSet);

    if (wasSaved) {
      return this.http.delete<void>(`${this.listingsUrl}/${listingId}/wishlist`).pipe(
        map(() => ({ isSaved: false })),
        tap({
          complete: () => this.pendingWishlistRequests.delete(listingId),
          error: () => this.pendingWishlistRequests.delete(listingId),
        }),
        catchError((err) => {
          // Rollback state strictly on failure - never show false success
          const rollback = new Set(this.businessWishlistIds());
          rollback.add(listingId);
          this.businessWishlistIds.set(rollback);
          return throwError(() => err);
        })
      );
    } else {
      return this.http
        .post<ArtisanWishlistItemResponse>(`${this.listingsUrl}/${listingId}/wishlist`, {})
        .pipe(
          map(() => ({ isSaved: true })),
          tap({
            complete: () => this.pendingWishlistRequests.delete(listingId),
            error: () => this.pendingWishlistRequests.delete(listingId),
          }),
          catchError((err) => {
            // Rollback state strictly on failure - never show false success
            const rollback = new Set(this.businessWishlistIds());
            rollback.delete(listingId);
            this.businessWishlistIds.set(rollback);
            return throwError(() => err);
          })
        );
    }
  }

  /**
   * Check whether a specific artisan listing is in the traveler's wishlist.
   */
  checkBusinessWishlist(listingId: number): Observable<ArtisanWishlistCheckResponse> {
    if (!this.authService.isAuthenticated()) {
      return of({ listing_id: listingId, is_saved: false, wishlist_id: null });
    }

    return this.http
      .get<ArtisanWishlistCheckResponse>(`${this.listingsUrl}/${listingId}/wishlist/check`)
      .pipe(
        tap((res) => {
          const current = new Set(this.businessWishlistIds());
          if (res.is_saved) {
            current.add(listingId);
          } else {
            current.delete(listingId);
          }
          this.businessWishlistIds.set(current);
        }),
        catchError(() => of({ listing_id: listingId, is_saved: false, wishlist_id: null }))
      );
  }

  /**
   * Get paginated saved products for the authenticated traveler.
   */
  getProductFavorites(page: number = 1, pageSize: number = 20): Observable<ArtisanFavoritePage> {
    const params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));
    return this.http.get<ArtisanFavoritePage>(this.favoritesUrl, { params });
  }

  /**
   * Get paginated saved artisan businesses for the authenticated traveler.
   */
  getBusinessWishlist(page: number = 1, pageSize: number = 20): Observable<ArtisanWishlistPagination> {
    const params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));
    return this.http.get<ArtisanWishlistPagination>(`${this.wishlistUrl}/me`, { params });
  }
}

function map<T, R>(fn: (value: T) => R) {
  return (source: Observable<T>) =>
    new Observable<R>((subscriber) => {
      return source.subscribe({
        next(value) {
          try {
            subscriber.next(fn(value));
          } catch (err) {
            subscriber.error(err);
          }
        },
        error(err) {
          subscriber.error(err);
        },
        complete() {
          subscriber.complete();
        },
      });
    });
}
