import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ProviderDetailResponse } from '../models/admin-providers.models';
import {
  ProviderReviewActionResponse,
  ProviderVerificationItem,
  RejectProviderRequest,
  VerificationDocumentType,
  VerificationQueryParams,
  VerificationQueueResponse,
} from '../models/admin-verifications.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canReviewVerifications } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

/**
 * Service managing verification queue, identity document inspection, and review decisions.
 * Strictly separates live API execution from isolated development preview mode.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminVerificationsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService, { optional: true });

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/providers`;

  public isPreviewMode(): boolean {
    return (
      environment.production === false &&
      (Boolean(environment.features?.adminPreviewMode) ||
        Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode']))
    );
  }

  public canReviewVerifications(): boolean {
    const user = this.adminAuthService.currentUser();
    return canReviewVerifications(user);
  }

  /**
   * Enforces verified role permissions for verification review operations.
   */
  private assertReviewPermission(): void {
    const user = this.adminAuthService.currentUser();
    if (!canReviewVerifications(user)) {
      throw new Error(
        'Unauthorized: Only administrators can perform verification reviews.'
      );
    }
  }

  /**
   * Retrieves the verification queue with active filtering and pagination.
   */
  getVerificationQueue(params?: VerificationQueryParams): Observable<VerificationQueueResponse> {
    if (this.isPreviewMode()) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const allItems = this.previewState.getVerificationQueue(params);
        const total = allItems.length;
        const page = Math.max(1, params?.page || 1);
        const limit = Math.max(1, Math.min(100, params?.limit || 10));
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pagedItems = allItems.slice((page - 1) * limit, page * limit);

        return of({
          items: pagedItems,
          total,
          page,
          limit,
          total_pages: totalPages,
        });
      } catch (err) {
        return throwError(() => err);
      }
    }

    let httpParams = new HttpParams();
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    // Backend defaults to pending if status is omitted or set
    if (params?.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    } else if (!params?.status) {
      httpParams = httpParams.set('status', 'pending');
    }
    if (params?.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    if (params?.category && params.category !== 'all') httpParams = httpParams.set('category', params.category);
    return this.http
      .get<
        | {
            items: Array<{
              id: number;
              user_id: number;
              full_name?: string;
              email?: string;
              business_name?: string;
              provider_type?: string;
              district?: string;
              approval_status?: string;
              verification_status?: string;
              created_at?: string;
              selfie_uploaded?: boolean;
              nic_front_uploaded?: boolean;
              nic_back_uploaded?: boolean;
            }>;
            total?: number;
            page?: number;
            limit?: number;
            total_pages?: number;
          }
        | Array<{
            id: number;
            user_id: number;
            full_name?: string;
            email?: string;
            business_name?: string;
            provider_type?: string;
            district?: string;
            approval_status?: string;
            verification_status?: string;
            created_at?: string;
            selfie_uploaded?: boolean;
            nic_front_uploaded?: boolean;
            nic_back_uploaded?: boolean;
          }>
      >(environment.apiBaseUrl + '/admin/provider-directory', { params: httpParams })
      .pipe(
        map((res) => {
          const rawItems = Array.isArray(res) ? res : res.items || [];
          const totalCount = Array.isArray(res) ? rawItems.length : res.total ?? rawItems.length;
          const currentPage = Array.isArray(res) ? (params?.page || 1) : res.page ?? 1;
          const currentLimit = Array.isArray(res) ? (params?.limit || 10) : res.limit ?? 10;
          const totalPagesCount = Array.isArray(res)
            ? Math.max(1, Math.ceil(totalCount / currentLimit))
            : res.total_pages ?? Math.max(1, Math.ceil(totalCount / currentLimit));

          const items: ProviderVerificationItem[] = rawItems.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            full_name: item.full_name ?? '',
            email: item.email || '',
            business_name: item.business_name ?? '',
            provider_type: item.provider_type ?? '',
            district: item.district ?? '',
            approval_status: (item.approval_status || item.verification_status || 'pending') as any,
            created_at: item.created_at ?? '',
            documents: [
              { type: 'selfie' as const, title: 'Selfie', isAvailable: item.selfie_uploaded === true },
              { type: 'nic_front' as const, title: 'Identity document front', isAvailable: item.nic_front_uploaded === true },
              { type: 'nic_back' as const, title: 'Identity document back', isAvailable: item.nic_back_uploaded === true },
            ],
          }));

          // Client-side category filtering if specified
          let filteredItems = items;
          if (params?.category && params.category !== 'all') {
            filteredItems = filteredItems.filter((i) => i.provider_type === params.category);
          }

          return {
            items: filteredItems,
            total: totalCount,
            page: currentPage,
            limit: currentLimit,
            total_pages: totalPagesCount,
          };
        }),
        catchError((error) => throwError(() => error))
      );
  }

  /**
   * Retrieves full details for a provider application.
   */
  getVerificationDetails(providerId: number): Observable<ProviderDetailResponse> {
    if (this.isPreviewMode()) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      const provider = this.previewState.getProvider(providerId);
      if (!provider) {
        return throwError(() => new Error(`Provider #${providerId} not found.`));
      }
      return of(provider);
    }

    return this.http.get<ProviderDetailResponse>(`${this.baseUrl}/${providerId}`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Retrieves an identity document securely.
   * In live mode, streams blob and creates safe Object URL.
   * In preview mode, returns safe SVG data URI.
   */
  getDocument(providerId: number, documentType: VerificationDocumentType): Observable<string> {
    try {
      this.assertReviewPermission();
    } catch (err) {
      return throwError(() => err);
    }

    if (this.isPreviewMode()) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const svgUri = this.previewState.getIdentityDocumentPreview(providerId, documentType);
        return of(svgUri);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http
      .get(`${this.baseUrl}/${providerId}/documents/${documentType}`, { responseType: 'blob' })
      .pipe(
        map((blob) => {
          const mime = blob.type.toLowerCase();
          const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
          if (mime && !allowedMimes.includes(mime)) {
            throw new Error(`Unsupported document media type: ${mime}`);
          }
          return URL.createObjectURL(blob);
        }),
        catchError((error) => throwError(() => error))
      );
  }

  /**
   * Revokes object URL to prevent memory leaks when documents close or switch.
   */
  revokeDocumentUrl(url?: string | null): void {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }

  /**
   * Approves a pending verification application.
   */
  approveVerification(providerId: number): Observable<ProviderReviewActionResponse> {
    try {
      this.assertReviewPermission();
    } catch (err) {
      return throwError(() => err);
    }

    if (this.isPreviewMode()) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.approveProvider(providerId);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http.post<ProviderReviewActionResponse>(`${this.baseUrl}/${providerId}/approve`, {}).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Rejects a pending verification application with a validated administrative reason.
   */
  rejectVerification(providerId: number, payload: RejectProviderRequest): Observable<ProviderReviewActionResponse> {
    try {
      this.assertReviewPermission();
    } catch (err) {
      return throwError(() => err);
    }

    const cleanedReason = (payload.reason || '').trim();
    if (cleanedReason.length < 5 || cleanedReason.length > 500) {
      return throwError(
        () => new Error('Rejection reason must be between 5 and 500 characters and cannot be empty or whitespace.')
      );
    }

    if (this.isPreviewMode()) {
      if (!this.previewState) {
        return throwError(() => new Error('Preview state service is unavailable in preview mode.'));
      }
      try {
        const result = this.previewState.rejectProvider(providerId, { reason: cleanedReason });
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http
      .post<ProviderReviewActionResponse>(`${this.baseUrl}/${providerId}/reject`, { reason: cleanedReason })
      .pipe(catchError((error) => throwError(() => error)));
  }
}
