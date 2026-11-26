import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
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
@Injectable({
  providedIn: 'root',
})
export class AdminRentalsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/rentals`;

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
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.page_size) httpParams = httpParams.set('page_size', params.page_size.toString());
    if (params?.approval_status && params.approval_status !== 'all') {
      httpParams = httpParams.set('approval_status', params.approval_status);
    }
    if (params?.verification_status && params.verification_status !== 'all') {
      httpParams = httpParams.set('verification_status', params.verification_status);
    }
    if (params?.vehicle_type && params.vehicle_type !== 'all') {
      httpParams = httpParams.set('vehicle_type', params.vehicle_type);
    }
    if (params?.provider_id) {
      httpParams = httpParams.set('provider_id', params.provider_id.toString());
    }
    if (params?.district && params.district !== 'all') {
      httpParams = httpParams.set('district', params.district);
    }
    if (params?.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<AdminVehicleListResponse>(`${this.baseUrl}/vehicles`, { params: httpParams }).pipe(
      catchError((error) => throwError(() => error))
    );
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

    return this.http.get<AdminVehicleDetailResponse>(`${this.baseUrl}/vehicles/${id}`).pipe(
      catchError((error) => throwError(() => error))
    );
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

    return this.http.post<AdminVehicleReviewResponse>(`${this.baseUrl}/vehicles/${id}/review`, payload).pipe(
      catchError((error) => throwError(() => error))
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

    return this.http.get<AdminVehicleDocumentItem[]>(`${this.baseUrl}/vehicles/${vehicleId}/documents`).pipe(
      catchError((error) => throwError(() => error))
    );
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
    return this.http.post<AdminVehicleDocumentItem>(
      `${this.baseUrl}/vehicles/${vehicleId}/documents/${documentId}/verify`,
      payload
    ).pipe(
      catchError((error) => throwError(() => error))
    );
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

    return this.http.patch<AdminVehicleVerifyStatusResponse>(
      `${this.baseUrl}/vehicles/${vehicleId}/verification-status`,
      payload
    ).pipe(
      catchError((error) => throwError(() => error))
    );
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

    return this.http.get<AdminRentalFleetSummaryResponse>(`${this.baseUrl}/analytics/fleet-summary`).pipe(
      catchError((error) => throwError(() => error))
    );
  }
}
