import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
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
@Injectable({
  providedIn: 'root',
})
export class AdminAdventuresService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/activities`;

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

    // Live mode: backend router provides GET /api/v1/admin/activities listing pending activities
    let httpParams = new HttpParams();
    const limit = params?.limit || 50;
    httpParams = httpParams.set('limit', limit.toString());

    return this.http.get<ActivityResponse[]>(this.baseUrl, { params: httpParams }).pipe(
      map((items) => {
        let filtered = items;
        if (params?.search && params.search.trim()) {
          const q = params.search.trim().toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.location.toLowerCase().includes(q) ||
              (a.city && a.city.toLowerCase().includes(q))
          );
        }
        if (params?.category && params.category !== 'all') {
          const cat = params.category.trim().toLowerCase();
          filtered = filtered.filter((a) => (a.category || '').toLowerCase() === cat);
        }
        if (params?.district && params.district !== 'all') {
          const d = params.district.trim().toLowerCase();
          filtered = filtered.filter((a) => (a.district || '').toLowerCase().includes(d));
        }

        const total = filtered.length;
        const page = Math.max(1, params?.page || 1);
        const pageSize = Math.max(1, params?.limit || 10);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const pagedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

        return {
          items: pagedItems,
          total,
          page,
          limit: pageSize,
          total_pages: totalPages,
        };
      }),
      catchError((error) => {
        // Honest error propagation - never fallback to preview on live API failure
        return throwError(() => error);
      })
    );
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

    return this.http.get<ActivityResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => throwError(() => error))
    );
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

    const body = { notes: payload?.notes || '' };
    return this.http.post<ActivityResponse>(`${this.baseUrl}/${id}/approve`, body).pipe(
      catchError((error) => throwError(() => error))
    );
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

    return this.http.post<ActivityResponse>(`${this.baseUrl}/${id}/reject`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Computes summary metrics for KPI cards.
   */
  getSummary(): Observable<ActivityAdminSummary> {
    return this.getActivities({ limit: 100 }).pipe(
      map((res) => {
        const all = res.items;
        const total = res.total;
        const pending = all.filter((a: ActivityResponse) => a.approval_status === 'pending').length;
        const approved = all.filter((a: ActivityResponse) => a.approval_status === 'approved').length;
        const rejected = all.filter((a: ActivityResponse) => a.approval_status === 'rejected').length;
        return {
          total,
          pending_approval: pending,
          approved,
          rejected,
        };
      })
    );
  }
}
