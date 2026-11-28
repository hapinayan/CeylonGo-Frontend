import { AdminListingDirectoryService, ListingReview, listingVerificationStatus } from './admin-listing-directory.service';
import { computed, inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';

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

function artisan(r: ListingReview): AdminArtisanListingItem {
  const l = r.listing;
  return { ...l, provider_profile_id: l.provider_id, city: l.locality,
    craft_category: r.details['artisan']?.craft_category ?? '',
    approval_status: l.approval_status as AdminArtisanListingItem['approval_status'],
    is_verified: r.verification_status === 'approved', is_featured: false,
    verification_status: listingVerificationStatus(r), reviewed_at: r.decided_at,
    rejection_reason: r.decision_reason, provider_business_name: r.provider.business_name,
    phone: r.provider.phone, email: r.provider.email, products_count: r.details['products']?.length };
}

@Injectable({
  providedIn: 'root',
})
export class AdminArtisansService {
  private readonly directory = inject(AdminListingDirectoryService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);


  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewArtisans = computed(() => canViewArtisans(this.currentUser()));
  readonly canReviewArtisans = computed(() => canReviewArtisans(this.currentUser()));
  readonly canModerateReviews = computed(() => canModerateArtisanReviews(this.currentUser()));

  getArtisanDirectory(params?: ArtisanQueryParams) {
    return this.directory.list('artisan', artisan, { ...params, page_size: params?.limit });
  }

  getArtisanListings(params: ArtisanQueryParams = {}): Observable<AdminArtisanListingItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanListings(params));
    }

    return this.directory.list('artisan', artisan, { ...params, page_size: params?.limit ?? 100 })
      .pipe(map(({items}) => items));
  }

  getArtisanListingById(id: number): Observable<AdminArtisanListingItem> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanListingById(id));
    }
    return this.directory.detail(id, artisan);
  }

  approveListing(id: number): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveArtisanListing(id));
    }
    return this.directory.decide(id, 'approved', undefined).pipe(
      map(() => ({ success: true, id, message: 'Listing decision saved.' })));
  }

  rejectListing(id: number, payload: ArtisanRejectionPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectArtisanListing(id, payload));
    }
    return this.directory.decide(id, 'rejected', payload.reason).pipe(
      map(() => ({ success: true, id, message: 'Listing decision saved.' })));
  }

  suspendListing(id: number, payload?: ArtisanSuspendPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.suspendArtisanListing(id, payload));
    }
    return this.directory.decide(id, 'suspended', payload?.reason).pipe(
      map(() => ({ success: true, id, message: 'Listing decision saved.' })));
  }

  featureListing(id: number, isFeatured: boolean): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.featureArtisanListing(id, isFeatured));
    }
    return throwError(() => new Error('Featuring artisans is unavailable in the MVP.'));
  }

  getShowcaseProducts(params: { status?: string; listing_id?: number } = {}): Observable<AdminArtisanProductItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getShowcaseProducts(params));
    }

    if (!params.listing_id) return throwError(() => new Error('Select an artisan listing to view products.'));
    return this.directory.detail(params.listing_id, (r) => {
      const products: AdminArtisanProductItem[] = r.details['products'] ?? [];
      return products.map((product) => ({ ...product, artisan_listing_id: r.listing.id,
        listing_title: r.listing.title }));
    });
  }

  approveProduct(id: number): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveShowcaseProduct(id));
    }
    return throwError(() => new Error('This moderation workflow is unavailable in the MVP.'));
  }

  rejectProduct(id: number, payload?: ArtisanRejectionPayload): Observable<{ success: boolean; id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectShowcaseProduct(id, payload));
    }
    return throwError(() => new Error('This moderation workflow is unavailable in the MVP.'));
  }

  getReviews(listingId?: number): Observable<AdminArtisanReviewItem[]> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getArtisanReviews(listingId));
    }
    return throwError(() => new Error('Artisan reviews are unavailable in the MVP.'));
  }

  moderateReview(id: number, payload: ArtisanReviewModerationPayload): Observable<{ success: boolean; review_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.moderateArtisanReview(id, payload));
    }
    return throwError(() => new Error('This moderation workflow is unavailable in the MVP.'));
  }

  getArtisanKPIs(): Observable<AdminArtisanBusinessKPIs> {
    return this.directory.list('artisan', artisan, { page_size: 1 }).pipe(map(({counts}) => ({
      total_businesses: Object.values(counts).reduce((a,b) => a+b, 0),
      approved_count: counts['approved'] ?? 0, pending_count: counts['pending'] ?? 0,
      rejected_count: counts['rejected'] ?? 0, suspended_count: counts['suspended'] ?? 0,
      verified_count: counts['approved'] ?? 0, featured_count: 0,
    })));
  }
}
