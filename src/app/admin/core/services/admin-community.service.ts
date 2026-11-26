import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminCommunityReportListResponse,
  CommunityQueryParams,
  ModerateContentPayload,
} from '../models/admin-community.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canModerateCommunity, canViewCommunity } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminCommunityService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/community/admin`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewCommunity = computed(() => canViewCommunity(this.currentUser()));
  readonly canModerateCommunity = computed(() => canModerateCommunity(this.currentUser()));

  getCommunityReports(params: CommunityQueryParams = {}): Observable<AdminCommunityReportListResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getCommunityReports(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('report_status', params.status);
    }
    if (params.entity_type && params.entity_type !== 'all') {
      httpParams = httpParams.set('entity_type', params.entity_type);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }

    return this.http.get<AdminCommunityReportListResponse>(`${this.baseUrl}/reports`, {
      params: httpParams,
    });
  }

  reviewReport(id: number, payload: ModerateContentPayload): Observable<{ success: boolean; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.reviewCommunityReport(id, payload));
    }
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.baseUrl}/reports/${id}`,
      payload
    );
  }
}
