import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  AdminAccountItem,
  AdminInvitationRequest,
  AdminManagementQueryParams,
} from '../models/admin-management.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canManageAdmins } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminManagementService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canManageAdmins = computed(() => canManageAdmins(this.currentUser()));

  getAdminAccounts(params: AdminManagementQueryParams = {}): Observable<{
    items: AdminAccountItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    // Backend has no dedicated admin invitation endpoint; managed via preview state
    return of(this.previewStateService.getAdminAccounts(params, this.currentUser()));
  }

  inviteAdmin(payload: AdminInvitationRequest): Observable<AdminAccountItem> {
    return of(this.previewStateService.inviteAdmin(payload, this.currentUser()));
  }

  toggleAdminStatus(id: number, isActive: boolean): Observable<AdminAccountItem> {
    return of(this.previewStateService.toggleAdminStatus(id, isActive, this.currentUser()));
  }
}
