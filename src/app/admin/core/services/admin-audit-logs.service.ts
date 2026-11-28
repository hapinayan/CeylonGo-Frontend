import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminAuditLogListResponse,
  AuditLogQueryParams,
} from '../models/admin-audit-logs.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canViewAuditLogs } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminAuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/audit-log-directory`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewAuditLogs = computed(() => canViewAuditLogs(this.currentUser()));

  getAuditLogs(params: AuditLogQueryParams = {}): Observable<AdminAuditLogListResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getAuditLogs(params, this.currentUser()));
    }

    let httpParams = new HttpParams();
    if (params.admin_user_id) httpParams = httpParams.set("admin_user_id", params.admin_user_id);
    if (params.action_type && params.action_type !== 'all') {
      httpParams = httpParams.set('action_type', params.action_type);
    }
    if (params.entity_type && params.entity_type !== 'all') {
      httpParams = httpParams.set('entity_type', params.entity_type);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.date_from) {
      httpParams = httpParams.set('date_from', params.date_from);
    }
    if (params.date_to) {
      httpParams = httpParams.set('date_to', params.date_to);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }

    return this.http.get<AdminAuditLogListResponse>(this.baseUrl, { params: httpParams });
  }
}
