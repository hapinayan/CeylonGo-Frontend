import { AdminListingDirectoryService, ListingReview, listingVerificationStatus } from './admin-listing-directory.service';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';

import {
  AdminRentalFleetSummaryResponse,
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleListItem,
  AdminVehicleListResponse,
  AdminVehicleReviewRequest,
  AdminVehicleReviewResponse,
  AdminVehicleVerifyStatusRequest,
  AdminVehicleVerifyStatusResponse,
  RentalQueryParams,
} from '../models/admin-rentals.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import {
  canReviewRentals,
  canVerifyRentalDocuments,
  canViewRentals,
} from '../utils/admin-permissions.utils';

/**
 * Service for managing Bike and Bicycle Rental fleet, listings, and document verifications.
 * Strictly integrates with backend app/routers/admin_rentals.py.
 * Strictly separates motor vehicle documents from non-motorized bicycle requirements.
 */
function rental(r: ListingReview) {
  const l = r.listing;
  return { ...l, vehicle_name: l.title, vehicle_type: l.category as AdminVehicleListItem['vehicle_type'],
    provider_business_name: r.provider.business_name, provider_phone: r.provider.phone,
    provider_approval_status: r.provider.verification_status, price_per_day: Number(l.price),
    status: (l.is_active ? 'available' : 'retired') as AdminVehicleListItem['status'],
    approval_status: l.approval_status as AdminVehicleListItem['approval_status'],
    verification_status: listingVerificationStatus(r), city: l.locality, reviewed_at: r.decided_at ?? undefined,
    rejection_reason: r.decision_reason ?? undefined, images_count: l.media?.length ?? 0,
    documents_count: r.details['files']?.length ?? 0, verified_documents_count: 0 };
}

@Injectable({
  providedIn: 'root',
})
export class AdminRentalsService {
  private readonly directory = inject(AdminListingDirectoryService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });


  get isPreviewMode(): boolean {
    return this.adminAuthService.isDemoSession();
  }

  /**
   * Retrieves rental vehicles with filtering, search, and pagination.
   */
  getRentals(params?: RentalQueryParams): Observable<AdminVehicleListResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewRentals(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view rental fleet.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.getRentals(params);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    // Live mode: queries GET /api/v1/admin/rentals/vehicles
    return this.directory.list('rental', rental, {
      ...params, status: params?.approval_status,
    });
  }

  /**
   * Retrieves single rental vehicle details.
   */
  getRental(id: number): Observable<AdminVehicleDetailResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewRentals(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view vehicle details.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const item = this.previewState.getRental(id);
      if (!item) {
        return throwError(() => new Error(`Vehicle #${id} not found.`));
      }
      return of(item);
    }

    return this.directory.detail(id, rental);
  }

  /**
   * Reviews a rental vehicle listing: approve, reject, or suspend.
   */
  reviewRental(id: number, payload: AdminVehicleReviewRequest): Observable<AdminVehicleReviewResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewRentals(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to review rental listings.')
      );
    }

    if (payload.decision === 'rejected' && (!payload.reason || payload.reason.trim().length < 5)) {
      return throwError(
        () => new Error('Rejection reason must be at least 5 characters long.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.reviewRental(id, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.decide(id, payload.decision, payload.reason ?? payload.notes).pipe(
      map(() => ({ success: true, vehicle_id: id, approval_status: payload.decision,
        message: 'Listing decision saved.' }))
    );
  }

  /**
   * Retrieves all documents associated with a vehicle.
   */
  getRentalDocuments(vehicleId: number): Observable<AdminVehicleDocumentItem[]> {
    const user = this.adminAuthService.currentUser();
    if (!canViewRentals(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view vehicle documents.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const docs = this.previewState.getRentalDocuments(vehicleId);
      return of(docs);
    }

    return throwError(() => new Error('Separate vehicle document verification is unavailable in the MVP.'));
  }

  /**
   * Verifies an individual vehicle document.
   */
  verifyRentalDocument(
    vehicleId: number,
    documentId: number,
    isVerified: boolean,
    notes?: string
  ): Observable<AdminVehicleDocumentItem> {
    const user = this.adminAuthService.currentUser();
    if (!canVerifyRentalDocuments(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to verify rental documents.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.verifyRentalDocument(vehicleId, documentId, isVerified, notes, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    const payload = { is_verified: isVerified, verification_notes: notes };
    return throwError(() => new Error('Separate vehicle document verification is unavailable in the MVP.'));
  }

  /**
   * Updates the overall vehicle verification status.
   */
  verifyRentalStatus(
    vehicleId: number,
    payload: AdminVehicleVerifyStatusRequest
  ): Observable<AdminVehicleVerifyStatusResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canVerifyRentalDocuments(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to update vehicle verification status.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.verifyRentalStatus(vehicleId, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return throwError(() => new Error('Separate vehicle document verification is unavailable in the MVP.'));
  }

  /**
   * Retrieves summary analytics for fleet KPI cards.
   */
  getFleetSummary(): Observable<AdminRentalFleetSummaryResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewRentals(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view fleet metrics.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      return of(this.previewState.getRentalFleetSummary());
    }

    return this.directory.list('rental', rental, { page_size: 1 }).pipe(map(({counts, providers}) => ({
      total_vehicles: Object.values(counts).reduce((a,b) => a+b, 0), total_providers: providers,
      pending_approval: counts['pending'] ?? 0, approved_vehicles: counts['approved'] ?? 0,
      verified_vehicles: counts['approved'] ?? 0, rejected_vehicles: counts['rejected'] ?? 0,
    })));
  }
}
