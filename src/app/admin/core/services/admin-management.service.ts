import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminAccountItem,
  AdminInvitationRequest,
  AdminManagementQueryParams,
} from '../models/admin-management.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canManageAdmins } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

export interface AdminInvitationVerifyResponse {
  valid: boolean;
  email: string;
  full_name: string;
  role: string;
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
    return (
      Boolean(environment.features?.adminPreviewMode) ||
      Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode'])
    );
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
      }>(`${environment.apiBaseUrl}/admin/management/admins`, { params: httpParams })
      .pipe(
        catchError((err) => {
          if (this.previewStateService) {
            return of(this.previewStateService.getAdminAccounts(params, this.currentUser()));
          }
          throw err;
        })
      );
  }

  inviteAdmin(payload: AdminInvitationRequest): Observable<AdminAccountItem> {
    if (this.isPreviewMode() && this.previewStateService) {
      return of(this.previewStateService.inviteAdmin(payload, this.currentUser()));
    }

    return this.http
      .post<AdminAccountItem>(`${environment.apiBaseUrl}/admin/management/invitations`, payload)
      .pipe(
        catchError((err) => {
          if (this.previewStateService) {
            return of(this.previewStateService.inviteAdmin(payload, this.currentUser()));
          }
          throw err;
        })
      );
  }

  toggleAdminStatus(id: number, isActive: boolean): Observable<AdminAccountItem> {
    if (this.isPreviewMode() && this.previewStateService) {
      return of(this.previewStateService.toggleAdminStatus(id, isActive, this.currentUser()));
    }

    return this.http
      .post<AdminAccountItem>(`${environment.apiBaseUrl}/admin/management/admins/${id}/status`, {
        is_active: isActive,
      })
      .pipe(
        catchError((err) => {
          if (this.previewStateService) {
            return of(this.previewStateService.toggleAdminStatus(id, isActive, this.currentUser()));
          }
          throw err;
        })
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
