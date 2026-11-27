import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AdminDashboardResponse } from '../models/admin-dashboard.models';

export const DEMO_DASHBOARD_METRICS: AdminDashboardResponse = {
  providers: {
    total_profiles: 48,
    pending_applications: 7,
  },
  pending_approvals: {
    homestay_listings: 4,
    activity_listings: 3,
    eco_experience_listings: 2,
    artisan_listings: 5,
    rental_vehicles: 3,
    tour_guide_profiles: 2,
  },
  bookings: {
    homestay: 124,
    rental_vehicle: 86,
    tour_guide: 52,
  },
  traveler_eligibility: {
    pending_rental_checks: 6,
  },
};

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch administrator dashboard metrics.
   * If environment.features.adminPreviewMode is true, falls back to realistic sample data
   * when the local backend database is unavailable.
   */
  getDashboard(): Observable<AdminDashboardResponse> {
    if (!environment.production && environment.features?.adminPreviewMode) {
      return of(DEMO_DASHBOARD_METRICS);
    }
    const url = `${environment.apiBaseUrl}/admin/dashboard`;
    return this.http.get<AdminDashboardResponse>(url);
  }
}
