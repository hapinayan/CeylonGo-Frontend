import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminTourGuideDetailResponse,
  AdminTourGuideListResponse,
  CredentialVerifyPayload,
  TourGuideBadgePayload,
  TourGuideDecisionPayload,
  TourGuideKPIs,
  TourGuideQueryParams,
} from '../models/admin-tour-guides.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import {
  canReviewTourGuides,
  canVerifyGuideCredentials,
  canViewTourGuides,
} from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminTourGuidesService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/tour-guides`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewGuides = computed(() => canViewTourGuides(this.currentUser()));
  readonly canReviewGuides = computed(() => canReviewTourGuides(this.currentUser()));
  readonly canVerifyCredentials = computed(() => canVerifyGuideCredentials(this.currentUser()));

  getTourGuides(params: TourGuideQueryParams = {}): Observable<AdminTourGuideListResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getTourGuides(params));
    }

    let httpParams = new HttpParams();
    if (params.approval_status && params.approval_status !== 'all') {
      httpParams = httpParams.set('approval_status', params.approval_status);
    }
    if (params.verification_status && params.verification_status !== 'all') {
      httpParams = httpParams.set('verification_status', params.verification_status);
    }
    if (params.district && params.district !== 'all') {
      httpParams = httpParams.set('district', params.district);
    }
    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', String(params.is_active));
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', String(params.page_size));
    }

    return this.http.get<AdminTourGuideListResponse>(this.baseUrl, { params: httpParams });
  }

  getTourGuideById(id: number): Observable<AdminTourGuideDetailResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getTourGuideById(id));
    }
    return this.http.get<AdminTourGuideDetailResponse>(`${this.baseUrl}/${id}`);
  }

  approveTourGuide(id: number, reason?: string): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveTourGuide(id, reason));
    }
    return this.http.post<{ success: boolean; tour_guide_id: number; message: string }>(
      `${this.baseUrl}/${id}/approve`,
      reason ? { reason } : {}
    );
  }

  rejectTourGuide(id: number, payload: TourGuideDecisionPayload): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectTourGuide(id, payload));
    }
    return this.http.post<{ success: boolean; tour_guide_id: number; message: string }>(
      `${this.baseUrl}/${id}/reject`,
      payload
    );
  }

  suspendTourGuide(id: number, payload?: TourGuideDecisionPayload): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.suspendTourGuide(id, payload));
    }
    return this.http.post<{ success: boolean; tour_guide_id: number; message: string }>(
      `${this.baseUrl}/${id}/suspend`,
      payload || {}
    );
  }

  reinstateTourGuide(id: number): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.reinstateTourGuide(id));
    }
    return this.http.post<{ success: boolean; tour_guide_id: number; message: string }>(
      `${this.baseUrl}/${id}/reinstate`,
      {}
    );
  }

  updateTourGuideBadge(id: number, payload: TourGuideBadgePayload): Observable<{ success: boolean; tour_guide_id: number; verification_status: string; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.updateTourGuideBadge(id, payload));
    }
    return this.http.post<{ success: boolean; tour_guide_id: number; verification_status: string; message: string }>(
      `${this.baseUrl}/${id}/verification-badge`,
      payload
    );
  }

  verifyGuideCredential(credentialId: number, payload: CredentialVerifyPayload): Observable<{ success: boolean; credential_id: number; verification_status: string; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.verifyGuideCredential(credentialId, payload));
    }
    return this.http.post<{ success: boolean; credential_id: number; verification_status: string; message: string }>(
      `${this.baseUrl}/credentials/${credentialId}/verify`,
      payload
    );
  }

  getTourGuideKPIs(): Observable<TourGuideKPIs> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getTourGuideKPIs());
    }
    return of({
      total_guides: 0,
      active_guides: 0,
      pending_approval: 0,
      verified_guides: 0,
    });
  }
}
