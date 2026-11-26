import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminArtisanBusinessKPIs,
  AdminArtisanListingItem,
  AdminArtisanProductItem,
  AdminArtisanReviewItem,
  ArtisanQueryParams,
  ArtisanRejectionPayload,
  ArtisanReviewModerationPayload,
  ArtisanSuspendPayload,
} from '../models/admin-artisans.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import {
  canModerateArtisanReviews,
  canReviewArtisans,
  canViewArtisans,
} from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminArtisansService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/artisan`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewArtisans = computed(() => canViewArtisans(this.currentUser()));
  readonly canReviewArtisans = computed(() => canReviewArtisans(this.currentUser()));
  readonly canModerateReviews = computed(() => canModerateArtisanReviews(this.currentUser()));

  getArtisanListings(params: ArtisanQueryParams = {}): Observable<AdminArtisanListingItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanListings(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.district && params.district !== 'all') {
      httpParams = httpParams.set('district', params.district);
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<AdminArtisanListingItem[]>(`${this.baseUrl}/listings`, {
      params: httpParams,
    });
  }

  getArtisanListingById(id: number): Observable<AdminArtisanListingItem> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanListingById(id));
    }
    return this.http.get<AdminArtisanListingItem>(`${this.baseUrl}/listings/${id}`);
  }

  approveListing(id: number): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveArtisanListing(id));
    }
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/listings/${id}/approve`,
      {}
    );
  }

  rejectListing(id: number, payload: ArtisanRejectionPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectArtisanListing(id, payload));
    }
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/listings/${id}/reject`,
      payload
    );
  }

  suspendListing(id: number, payload?: ArtisanSuspendPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.suspendArtisanListing(id, payload));
    }
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/listings/${id}/suspend`,
      payload || {}
    );
  }

  featureListing(id: number, isFeatured: boolean): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.featureArtisanListing(id, isFeatured));
    }
    const endpoint = isFeatured ? 'feature' : 'unfeature';
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/listings/${id}/${endpoint}`,
      {}
    );
  }

  getShowcaseProducts(params: { status?: string; listing_id?: number } = {}): Observable<AdminArtisanProductItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getShowcaseProducts(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.listing_id) {
      httpParams = httpParams.set('listing_id', String(params.listing_id));
    }

    return this.http.get<AdminArtisanProductItem[]>(`${this.baseUrl}/products`, {
      params: httpParams,
    });
  }

  approveProduct(id: number): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveShowcaseProduct(id));
    }
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/products/${id}/approve`,
      {}
    );
  }

  rejectProduct(id: number, payload?: ArtisanRejectionPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectShowcaseProduct(id, payload));
    }
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.baseUrl}/products/${id}/reject`,
      payload || {}
    );
  }

  getReviews(listingId?: number): Observable<AdminArtisanReviewItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanReviews(listingId));
    }
    let httpParams = new HttpParams();
    if (listingId) {
      httpParams = httpParams.set('listing_id', String(listingId));
    }
    return this.http.get<AdminArtisanReviewItem[]>(`${this.baseUrl}/reviews`, { params: httpParams });
  }

  moderateReview(id: number, payload: ArtisanReviewModerationPayload): Observable<{ success: boolean; review_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.moderateArtisanReview(id, payload));
    }
    return this.http.patch<{ success: boolean; review_id: number; message: string }>(
      `${this.baseUrl}/reviews/${id}/publish`,
      payload
    );
  }

  getArtisanKPIs(): Observable<AdminArtisanBusinessKPIs> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanKPIs());
    }
    return of({
      total_businesses: 0,
      approved_count: 0,
      pending_count: 0,
      rejected_count: 0,
      suspended_count: 0,
      verified_count: 0,
      featured_count: 0,
    });
  }
}
