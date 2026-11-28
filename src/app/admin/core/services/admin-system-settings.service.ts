import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { SystemSettingsBundle } from '../models/admin-system-settings.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canManageSystemSettings } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminSystemSettingsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canManageSettings = computed(() => canManageSystemSettings(this.currentUser()));

  getSettings(): Observable<SystemSettingsBundle> {
    return throwError(() => new Error('System settings are unavailable in the MVP.'));
  }

  updateSettings(
    section: 'general' | 'security' | 'service_fees' | 'notifications',
    payload: Record<string, unknown>
  ): Observable<SystemSettingsBundle> {
    return throwError(() => new Error('System settings are unavailable in the MVP.'));
  }
}
