import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
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
@Injectable({
  providedIn: 'root',
})
export class AdminHomestaysService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/homestays`;

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

    // Live mode: backend only exposes GET /pending for homestay listing review
    let httpParams = new HttpParams();
    const limit = params?.limit || 50;
    httpParams = httpParams.set('limit', limit.toString());

    return this.http.get<HomestayResponse[]>(`${this.baseUrl}/pending`, { params: httpParams }).pipe(
      map((items) => {
        let filtered = items;
        if (params?.search && params.search.trim()) {
          const q = params.search.trim().toLowerCase();
          filtered = filtered.filter(
            (h) =>
              h.name.toLowerCase().includes(q) ||
              h.location.toLowerCase().includes(q) ||
              (h.city && h.city.toLowerCase().includes(q))
          );
        }
        if (params?.district && params.district.trim()) {
          const d = params.district.trim().toLowerCase();
          filtered = filtered.filter((h) => h.district && h.district.toLowerCase().includes(d));
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
        // Honest error propagation - never fallback to mock data on real API errors
        return throwError(() => error);
      })
    );
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

    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<HomestayResponse[]>(`${this.baseUrl}/pending`, { params }).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Retrieves homestay administration dashboard metrics via GET /dashboard.
   */
  getHomestayDashboard(): Observable<HomestayAdminDashboardResponse> {
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

    return this.http.get<HomestayAdminDashboardResponse>(`${this.baseUrl}/dashboard`).pipe(
      catchError((error) => throwError(() => error))
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

    return this.http.get<HomestayResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Submits a review decision (approve, reject, or suspend) via POST /{id}/review.
   * Requires Operations Admin or Super Admin role.
   */
  reviewHomestay(id: number, payload: HomestayReviewRequest): Observable<HomestayResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewHomestays(user)) {
      return throwError(
        () =>
          new Error(
            'HTTP 403 Forbidden: Only Super Administrators and Operations Administrators can review homestays.'
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

    return this.http.post<HomestayResponse>(`${this.baseUrl}/${id}/review`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Submits a physical verification update via POST /{id}/verify.
   * Requires Operations Admin or Super Admin role.
   */
  verifyHomestay(id: number, payload: HomestayVerificationRequest): Observable<HomestayResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canVerifyHomestays(user)) {
      return throwError(
        () =>
          new Error(
            'HTTP 403 Forbidden: Only Super Administrators and Operations Administrators can verify homestays.'
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

    return this.http.post<HomestayResponse>(`${this.baseUrl}/${id}/verify`, payload).pipe(
      catchError((error) => throwError(() => error))
    );
  }
}
