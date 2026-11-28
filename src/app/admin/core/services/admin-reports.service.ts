import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  BookingVolumeReport,
  PlatformAnalyticsOverview,
} from '../models/admin-reports.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canViewReports } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminReportsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/reports`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewReports = computed(() => canViewReports(this.currentUser()));

  getAnalyticsOverview(): Observable<PlatformAnalyticsOverview> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getAnalyticsOverview());
    }
    return throwError(() => new Error('Advanced analytics are unavailable in the MVP. Use Dashboard or Bookings for live totals.'));
  }

  getBookingVolume(
    module: 'homestay' | 'rental_vehicle',
    createdFrom: string,
    createdBefore: string
  ): Observable<BookingVolumeReport> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getBookingVolume(module));
    }

    const params = new HttpParams()
      .set('module', module)
      .set('created_from', createdFrom)
      .set('created_before', createdBefore);

    return this.http.get<BookingVolumeReport>(`${this.baseUrl}/booking-volume`, { params });
  }
}
