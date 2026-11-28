import { AdminListingDirectoryService, ListingReview } from './admin-listing-directory.service';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, throwError } from 'rxjs';

import {
  ActivityAdminSummary,
  ActivityApprovalRequest,
  ActivityListResponse,
  ActivityQueryParams,
  ActivityRejectionRequest,
  ActivityResponse,
} from '../models/admin-activities.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import {
  canReviewActivities,
  canViewActivities,
} from '../utils/admin-permissions.utils';

/**
 * Service for managing Adventure Activities listings, approvals, and reviews.
 * Strictly integrates with backend app/routers/admin_activities.py.
 * Strictly isolates development preview mode from production live API.
 */
function activity(r: ListingReview): ActivityResponse {
  const l = r.listing;
  const fields = r.details['activity'] ?? r.details;
  return { ...l, category: fields.category ?? '', location: l.locality, city: l.locality,
    price_per_person: Number(l.price), duration_hours: fields.duration_hours,
    difficulty_level: fields.difficulty_level, max_participants: fields.max_participants,
    min_participants: fields.min_participants, provider_business_name: r.provider.business_name,
    approval_status: l.approval_status as ActivityResponse['approval_status'],
    reviewed_at: r.decided_at ?? undefined, rejection_reason: r.decision_reason ?? undefined };
}

@Injectable({
  providedIn: 'root',
})
export class AdminAdventuresService {
  private readonly directory = inject(AdminListingDirectoryService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });


  get isPreviewMode(): boolean {
    return this.adminAuthService.isDemoSession();
  }

  /**
   * Retrieves adventure activities. In demo preview mode, returns rich multi-status directory.
   * In live mode, queries the backend pending activity review queue (GET /api/v1/admin/activities).
   */
  getActivities(params?: ActivityQueryParams): Observable<ActivityListResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewActivities(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view adventure activities.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.getActivities(params);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.list('activity', activity, {
      page: params?.page, page_size: params?.limit, status: params?.status,
      district: params?.district, search: params?.search, activity_category: params?.category,
    });
  }

  /**
   * Retrieves single activity details for review.
   */
  getActivity(id: number): Observable<ActivityResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canViewActivities(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to view activity details.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const item = this.previewState.getActivity(id);
      if (!item) {
        return throwError(() => new Error(`Activity #${id} not found.`));
      }
      return of(item);
    }

    return this.directory.detail(id, activity);
  }

  /**
   * Approves a pending activity listing.
   */
  approveActivity(id: number, payload?: ActivityApprovalRequest): Observable<ActivityResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewActivities(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to approve adventure activities.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.approveActivity(id, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.decide(id, 'approved', payload?.notes)
      .pipe(switchMap(() => this.directory.detail(id, activity)));
  }

  /**
   * Rejects a pending activity listing with mandatory reason.
   */
  rejectActivity(id: number, payload: ActivityRejectionRequest): Observable<ActivityResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewActivities(user)) {
      return throwError(
        () => new Error('HTTP 403 Forbidden: You do not have permission to reject adventure activities.')
      );
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      return throwError(
        () => new Error('Rejection reason must be at least 5 characters long.')
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.rejectActivity(id, payload, user);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.directory.decide(id, 'rejected', payload.reason)
      .pipe(switchMap(() => this.directory.detail(id, activity)));
  }

  /**
   * Computes summary metrics for KPI cards.
   */
  getSummary(): Observable<ActivityAdminSummary> {
    return this.directory.list('activity', activity, { page_size: 1 }).pipe(
      map(({ counts }) => ({ total: Object.values(counts).reduce((a, b) => a + b, 0),
        pending_approval: counts['pending'] ?? 0, approved: counts['approved'] ?? 0,
        rejected: counts['rejected'] ?? 0 }))
    );
  }

}
