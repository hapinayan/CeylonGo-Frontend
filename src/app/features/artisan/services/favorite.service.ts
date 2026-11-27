import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Observable, catchError, defer, finalize, map, of, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  ArtisanFavoritePage,
  ArtisanFavoriteResponse,
  ArtisanWishlistCheckResponse,
  ArtisanWishlistItemResponse,
  ArtisanWishlistPagination,
} from '../models/artisan.models';
import { resolveArtisanMediaUrl } from './artisan.service';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly wishlistUrl = `${environment.apiBaseUrl}/artisan-wishlists`;
  private readonly listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

  // Reactive signals for instant UI badge and heart state synchronization across pages
  readonly productFavoriteIds = signal<Set<number>>(new Set());
  readonly businessWishlistIds = signal<Set<number>>(new Set());

  // In-flight request tracking to prevent duplicate concurrent network calls
  private readonly pendingWishlistRequests = new Set<number>();

  private lastUser: ReturnType<AuthService['currentUser']> = null;

  constructor() {
    // Monitor auth changes: clear state on logout/account switch and sync traveler wishlist
    effect(() => {
      const user = this.authService.currentUser();

      if (user !== this.lastUser) {
        this.lastUser = user;
        this.productFavoriteIds.set(new Set());
        this.businessWishlistIds.set(new Set());
        if (user?.is_active && user.role === 'traveler' && this.authService.isAuthenticated()) {
          this.refreshFavoriteIds();
        }
      }
    });
  }

  refreshFavoriteIds(): void {
    const owner = this.authService.currentUser();
    if (!owner?.is_active || owner.role !== 'traveler' || !this.authService.isAuthenticated()) {
      this.productFavoriteIds.set(new Set());
      this.businessWishlistIds.set(new Set());
      return;
    }

    this.getBusinessWishlist(1, 100).subscribe({
      next: (res) => {
        if (this.authService.currentUser() !== owner) return;
        const ids = new Set<number>(
          (res?.items ?? []).map((item) => item.artisan_listing_id).filter((id) => Number.isFinite(id)),
        );
        this.businessWishlistIds.set(ids);
      },
      error: () => {
        // Keep current signal state unchanged on transient network failure
      },
    });
  }

  isProductFavorite(productId: number): boolean {
    return this.productFavoriteIds().has(productId);
  }

  isBusinessSaved(listingId: number): boolean {
    return this.businessWishlistIds().has(listingId);
  }

  toggleProductFavorite(_productId: number, _isDemo: boolean = false): Observable<{ isFavorite: boolean }> {
    const owner = this.authService.currentUser();
    if (!owner?.is_active || owner.role !== 'traveler' || !this.authService.isAuthenticated()) {
      return throwError(() => new Error('AUTHENTICATION_REQUIRED'));
    }
    return throwError(() => new Error('PRODUCT_FAVORITES_UNSUPPORTED'));
  }

  /**
   * Toggle business wishlist state with optimistic update, in-flight deduplication, and rollback on error.
   */
  toggleBusinessWishlist(listingId: number, _isDemo: boolean = false): Observable<{ isSaved: boolean }> {
    const owner = this.authService.currentUser();
    if (!owner?.is_active || owner.role !== 'traveler' || !this.authService.isAuthenticated()) {
      return throwError(() => new Error('AUTHENTICATION_REQUIRED'));
    }

    if (this.pendingWishlistRequests.has(listingId)) {
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
        finalize(() => this.pendingWishlistRequests.delete(listingId)),
        catchError((err) => {
          const rollback = new Set(this.businessWishlistIds());
          rollback.add(listingId);
          this.businessWishlistIds.set(rollback);
          return throwError(() => err);
        }),
      );
    }

    return this.http.post<ArtisanWishlistItemResponse>(`${this.listingsUrl}/${listingId}/wishlist`, {}).pipe(
      map(() => ({ isSaved: true })),
      finalize(() => this.pendingWishlistRequests.delete(listingId)),
      catchError((err) => {
        const rollback = new Set(this.businessWishlistIds());
        rollback.delete(listingId);
        this.businessWishlistIds.set(rollback);
        return throwError(() => err);
      }),
    );
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
        catchError(() => of({ listing_id: listingId, is_saved: false, wishlist_id: null })),
      );
  }

  removeSavedProduct(_productId: number): Observable<void> {
    return throwError(() => new Error('PRODUCT_FAVORITES_UNSUPPORTED'));
  }

  removeSavedBusiness(listingId: number): Observable<void> {
    return this.removeSavedItem(
      listingId,
      `${this.listingsUrl}/${listingId}/wishlist`,
      this.businessWishlistIds,
      this.pendingWishlistRequests,
    );
  }

  private removeSavedItem(
    id: number,
    url: string,
    state: typeof this.businessWishlistIds,
    pending: Set<number>,
  ): Observable<void> {
    return defer(() => {
      const owner = this.authService.currentUser();
      if (!owner?.is_active || owner.role !== 'traveler' || !this.authService.isAuthenticated()) {
        return throwError(() => new Error('AUTHENTICATION_REQUIRED'));
      }
      if (pending.has(id)) return throwError(() => new Error('WISHLIST_UPDATE_PENDING'));
      pending.add(id);
      return this.http.delete<void>(url).pipe(
        tap(() => {
          if (this.authService.currentUser() !== owner) return;
          state.update((values) => {
            const updated = new Set(values);
            updated.delete(id);
            return updated;
          });
        }),
        finalize(() => pending.delete(id)),
      );
    });
  }

  /**
   * Product-level favorites endpoint is not present in the current Academic MVP OpenAPI;
   * returns an empty collection cleanly without firing 404 requests.
   */
  getProductFavorites(page: number = 1, pageSize: number = 20): Observable<ArtisanFavoritePage> {
    return of({ items: [] as ArtisanFavoriteResponse[], total: 0, page, page_size: pageSize });
  }

  /**
   * Get paginated saved artisan businesses for the authenticated traveler.
   * Endpoint: GET /api/v1/artisan-wishlists/me
   */
  getBusinessWishlist(page: number = 1, pageSize: number = 20): Observable<ArtisanWishlistPagination> {
    const params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('page_size', String(Math.min(100, Math.max(1, pageSize))));

    return this.http.get<ArtisanWishlistPagination>(`${this.wishlistUrl}/me`, { params }).pipe(
      map((res) => ({
        ...res,
        items: (Array.isArray(res?.items) ? res.items : []).map((item) => ({
          ...item,
          listing: item.listing
            ? {
                ...item.listing,
                cover_image_url: resolveArtisanMediaUrl(item.listing.cover_image_url),
              }
            : null,
        })),
      })),
    );
  }
}
