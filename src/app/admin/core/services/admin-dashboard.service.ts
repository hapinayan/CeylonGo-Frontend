import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AdminDashboardResponse } from '../models/admin-dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch live administrator dashboard metrics:
   * GET /api/v1/admin/dashboard
   */
  getDashboard(): Observable<AdminDashboardResponse> {
    const url = `${environment.apiBaseUrl}/admin/dashboard`;
    return this.http.get<AdminDashboardResponse>(url);
  }
}
