import { AdminListingDirectoryService, ListingReview, listingVerificationStatus } from './admin-listing-directory.service';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, throwError } from 'rxjs';

import {
  HomestayAdminDashboardResponse,
  HomestayListResponse,
  HomestayQueryParams,
  HomestayResponse,
  HomestayReviewRequest,
  HomestayVerificationRequest,
} from '../models/admin-homestays.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import {
  canReviewHomestays,
  canVerifyHomestays,
  canViewHomestays,
} from '../utils/admin-permissions.utils';

/**
 * Service for managing Homestay listings, verification, and administrative metrics.
 * Implements strict live backend contract integration alongside isolated development preview mode.
 */
function homestay(r: ListingReview): HomestayResponse {
  const l = r.listing;
  const fields = r.homestay_metadata ?? {};
  return { ...fields, ...l, provider_profile_id: l.provider_id, name: l.title,
    location: l.locality, city: l.locality, province: fields['province'] ?? '',
    price_per_night: Number(l.price),
    amenities: (fields['amenities'] ?? []).map((name: string, index: number) => ({
      id: index, homestay_id: l.id, amenity_name: name,
    })),
    max_guests: fields['max_guests'] ?? Math.max(0, ...r.rooms.map((room) => room.capacity ?? 0)),
    approval_status: l.approval_status as HomestayResponse['approval_status'],
    verification_status: listingVerificationStatus(r), reviewed_at: r.decided_at ?? undefined,
    rejection_reason: r.decision_reason ?? undefined };
}

@Injectable({
  providedIn: 'root',
})
export class AdminHomestaysService {
  private readonly directory = inject(AdminListingDirectoryService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });


  /**
   * Indicates whether the application is running in development demo preview mode.
   */
  get isPreviewMode(): boolean {
    return this.adminAuthService.isDemoSession();
  }

  /**
   * Retrieves homestays. In demo preview mode, supports complete multi-status directory and filters.
   * In live mode, queries the backend-supported pending queue endpoint (`/api/v1/admin/homestays/pending`).
   */
  getHomestays(params?: HomestayQueryParams): Observable<HomestayListResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewHomestays(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view homestays.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.getHomestays(params);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.list('homestay', homestay, {
      page: params?.page, page_size: params?.limit, status: params?.status, district: params?.district,
      province: params?.province, search: params?.search, verification_status: params?.verification_status,
    });
  }

  /**
   * Retrieves pending homestays directly via GET /pending.
   */
  getPendingHomestays(limit: number = 50): Observable<HomestayResponse[]> {
    const user = this.adminAuthService.currentUser();
    if (!canViewHomestays(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view homestays.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const res = this.previewState.getHomestays({ status: 'pending', limit });
      return of(res.items);
    }

    return this.directory.list('homestay', homestay, { status: 'pending', page_size: limit })
      .pipe(map((res) => res.items));
  }

  /**
   * Retrieves homestay administration dashboard metrics via GET /dashboard.
   */
  getHomestayDashboard(): Observable<Pick<HomestayAdminDashboardResponse, 'listings'>> {
    const user = this.adminAuthService.currentUser();
    if (!canViewHomestays(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view homestay dashboard.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const dashboard = this.previewState.getHomestayDashboard();
        return of(dashboard);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.list('homestay', homestay, { page_size: 1 }).pipe(
      map(({ counts }) => ({ listings: { total: Object.values(counts).reduce((a,b) => a+b, 0),
        approved: counts['approved'] ?? 0, pending_approval: counts['pending'] ?? 0,
        draft: counts['draft'] ?? 0, rejected: counts['rejected'] ?? 0, suspended: counts['suspended'] ?? 0 } }))
    );
  }

  /**
   * Retrieves full details for a single homestay via GET /{id}.
   */
  getHomestayById(id: number): Observable<HomestayResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewHomestays(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view homestay details.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const homestay = this.previewState.getHomestay(id);
      if (!homestay) {
        return throwError(() => ({
          status: 404,
          statusText: 'Not Found',
          error: { detail: `Homestay #${id} not found.` },
        }));
      }
      return of(homestay);
    }

    return this.directory.detail(id, homestay);
  }

  /**
   * Submits a review decision (approve, reject, or suspend) via POST /{id}/review.
   * Requires Admin or Super Admin role.
   */
  reviewHomestay(id: number, payload: HomestayReviewRequest): Observable<HomestayResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewHomestays(user)) {
      return throwError(
        () =>
          new Error(
            'HTTP 403 Forbidden: Only administrators can review homestays.'
          )
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.reviewHomestay(id, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.decide(id, payload.decision, payload.reason)
      .pipe(switchMap(() => this.directory.detail(id, homestay)));
  }

  /**
   * Submits a physical verification update via POST /{id}/verify.
   * Requires Admin or Super Admin role.
   */
  verifyHomestay(id: number, payload: HomestayVerificationRequest): Observable<HomestayResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canVerifyHomestays(user)) {
      return throwError(
        () =>
          new Error(
            'HTTP 403 Forbidden: Only administrators can verify homestays.'
          )
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.verifyHomestay(id, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return throwError(() => new Error('Use the listing review decision to verify this homestay.'));
  }
}
