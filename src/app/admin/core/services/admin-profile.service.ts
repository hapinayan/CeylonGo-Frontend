import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminProfileDetails,
  UpdateProfileRequest,
} from '../models/admin-profile.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminProfileService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/auth`;

  readonly currentUser = this.adminAuthService.currentUser;

  getProfile(): Observable<AdminProfileDetails> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getAdminProfile());
    }
    return this.http.get<AdminProfileDetails>(`${this.baseUrl}/me`);
  }

  updateProfile(payload: UpdateProfileRequest): Observable<AdminProfileDetails> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.updateAdminProfile(payload));
    }
    // Live update profile endpoint / state
    return of(this.previewStateService.updateAdminProfile(payload));
  }
}
