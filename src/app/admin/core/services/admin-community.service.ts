import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';

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

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/community`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewCommunity = computed(() => canViewCommunity(this.currentUser()));
  readonly canModerateCommunity = computed(() => canModerateCommunity(this.currentUser()));

  getCommunityReports(params: CommunityQueryParams = {}): Observable<AdminCommunityReportListResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getCommunityReports(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status === 'actioned' ? 'resolved' : params.status);
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

    return this.http.get<Omit<AdminCommunityReportListResponse, 'items' | 'total_pages'> & {
      items: (Omit<AdminCommunityReportListResponse['items'][number], 'status'> & {
        status: string; description?: string; review_notes?: string;
      })[];
    }>(this.baseUrl + '/reports', { params: httpParams }).pipe(
      map((page) => ({ ...page, total_pages: Math.ceil(page.total / page.page_size),
        items: page.items.map((item) => ({ ...item,
          status: (item.status === 'resolved' ? 'actioned' : item.status) as AdminCommunityReportListResponse['items'][number]['status'],
          details: item.description, moderator_notes: item.review_notes,
        })) }))
    );
  }

  reviewReport(id: number, payload: ModerateContentPayload): Observable<{ success: boolean; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.reviewCommunityReport(id, payload));
    }
    if (payload.action === 'suspend_author') {
      return throwError(() => new Error('Review the traveler account in the Travelers module.'));
    }
    const action_visibility = payload.action === 'hide' ? 'hidden'
      : payload.action === 'remove' ? 'deleted' : undefined;
    return this.http.patch(this.baseUrl + '/reports/' + id, {
      status: action_visibility ? 'resolved' : 'dismissed',
      review_notes: [payload.reason, payload.notes].filter(Boolean).join(' ? '),
      action_visibility,
    }).pipe(map(() => ({ success: true, message: 'Report decision saved.' })));
  }
}
