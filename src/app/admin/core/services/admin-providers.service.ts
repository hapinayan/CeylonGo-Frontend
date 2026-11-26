import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  ProviderDetailResponse,
  ProviderListResponse,
  ProviderQueryParams,
} from '../models/admin-providers.models';
import {
  ProviderReviewActionResponse,
  RejectProviderRequest,
} from '../models/admin-verifications.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { canReviewVerifications } from '../utils/admin-permissions.utils';

/**
 * Service for managing Service Provider applications and directory.
 * Strictly separates live API execution from isolated development preview mode.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminProvidersService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/providers`;

  /**
   * Evaluates if isolated preview mode is active.
   */
  private get isPreviewMode(): boolean {
    return (
      environment.production === false &&
      (Boolean(environment.features?.adminPreviewMode) ||
        Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode']))
    );
  }

  /**
   * Retrieves a paginated and filtered list of service providers.
   */
  getProviders(params?: ProviderQueryParams): Observable<ProviderListResponse> {
    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      return of(this.previewState.getProviders(params));
    }

    let httpParams = new HttpParams();
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<ProviderListResponse>(this.baseUrl, { params: httpParams }).pipe(
      catchError((error) => {
        // Never silently fall back to demo preview data
        return throwError(() => error);
      })
    );
  }

  /**
   * Retrieves full details for a single provider.
   */
  getProviderById(id: number): Observable<ProviderDetailResponse> {
    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const provider = this.previewState.getProvider(id);
      if (!provider) {
        return throwError(() => new Error(`Provider #${id} not found.`));
      }
      return of(provider);
    }

    return this.http.get<ProviderDetailResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Approves a pending provider application.
   */
  approveProvider(id: number): Observable<ProviderReviewActionResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewVerifications(user)) {
      return throwError(
        () =>
          new Error(
            'Unauthorized: Only Super Administrators and Operations Administrators can approve applications.'
          )
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.approveProvider(id);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http.post<ProviderReviewActionResponse>(`${this.baseUrl}/${id}/approve`, {}).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Rejects a pending provider application with a mandatory reason note.
   */
  rejectProvider(id: number, payload: RejectProviderRequest): Observable<ProviderReviewActionResponse> {
    const user = this.adminAuthService.currentUser();
    if (!canReviewVerifications(user)) {
      return throwError(
        () =>
          new Error(
            'Unauthorized: Only Super Administrators and Operations Administrators can reject applications.'
          )
      );
    }

    if (this.isPreviewMode) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.rejectProvider(id, payload);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http.post<ProviderReviewActionResponse>(`${this.baseUrl}/${id}/reject`, payload).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
