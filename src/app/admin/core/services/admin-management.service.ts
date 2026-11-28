import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminAccountItem,
  AdminInvitationRequest,
  AdminInvitationItem,
  AdminInvitationResult,
  AdminManagementQueryParams,
} from '../models/admin-management.models';
import { AdminRole } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canManageAdmins } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

export interface AdminInvitationVerifyResponse {
  valid: boolean;
  email: string;
  full_name: string;
  role: AdminRole;
  department?: string;
  expires_at: string;
}

export interface AdminActivationResult {
  success: boolean;
  message: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminManagementService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService, { optional: true });

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canManageAdmins = computed(() => canManageAdmins(this.currentUser()));

  public isPreviewMode(): boolean {
    return this.adminAuthService.isDemoSession();
  }

  getAdminAccounts(params: AdminManagementQueryParams = {}): Observable<{
    items: AdminAccountItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    if (this.isPreviewMode() && this.previewStateService) {
      return of(this.previewStateService.getAdminAccounts(params, this.currentUser()));
    }

    let httpParams = new HttpParams();
    if (params.role && params.role !== 'all') httpParams = httpParams.set('role', params.role);
    if (params.status && params.status !== 'all') httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.page_size) httpParams = httpParams.set('page_size', params.page_size.toString());

    return this.http
      .get<{
        items: AdminAccountItem[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`${environment.apiBaseUrl}/admin/management/admins`, { params: httpParams });
  }

  inviteAdmin(payload: AdminInvitationRequest): Observable<AdminInvitationResult> {
    if (this.isPreviewMode() && this.previewStateService) {
      const invite = this.previewStateService.inviteAdmin(payload, this.currentUser());
      return of({ id: invite.id, delivery_status: 'preview' });
    }

    return this.http
      .post<AdminInvitationResult>(`${environment.apiBaseUrl}/admin/management/invitations`, payload);
  }

  toggleAdminStatus(id: number, isActive: boolean): Observable<AdminAccountItem> {
    if (this.isPreviewMode() && this.previewStateService) {
      return of(this.previewStateService.toggleAdminStatus(id, isActive, this.currentUser()));
    }

    return this.http
      .post<AdminAccountItem>(`${environment.apiBaseUrl}/admin/management/admins/${id}/status`, {
        is_active: isActive,
      });
  }

  getInvitations(): Observable<AdminInvitationItem[]> {
    return this.http.get<AdminInvitationItem[]>(environment.apiBaseUrl + '/admin/management/invitations');
  }

  updateInvitation(id: number, action: 'resend' | 'revoke'): Observable<AdminInvitationResult> {
    return this.http.post<AdminInvitationResult>(
      environment.apiBaseUrl + '/admin/management/invitations/' + id + '/' + action,
      {},
    );
  }

  verifyInvitation(token: string): Observable<AdminInvitationVerifyResponse> {
    return this.http.get<AdminInvitationVerifyResponse>(
      `${environment.apiBaseUrl}/admin/auth/invitations/verify`,
      { params: { token } }
    );
  }

  activateAccount(token: string, password: string): Observable<AdminActivationResult> {
    return this.http.post<AdminActivationResult>(
      `${environment.apiBaseUrl}/admin/auth/invitations/activate`,
      { token, password }
    );
  }
}
