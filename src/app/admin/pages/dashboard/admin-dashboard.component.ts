import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AdminDashboardResponse } from '../../core/models/admin-dashboard.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminDashboardService } from '../../core/services/admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly route = inject(ActivatedRoute);

  readonly currentUser = this.adminAuthService.currentUser;
  readonly isSuperAdmin = this.adminAuthService.isSuperAdmin;
  readonly roleDisplayName = this.adminAuthService.roleDisplayName;
  readonly isDemoPreview = signal<boolean>(!environment.production && !!environment.features?.adminPreviewMode);

  readonly dashboardData = signal<AdminDashboardResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);
  readonly permissionNotice = signal<string | null>(null);

  ngOnInit(): void {
    const accessDenied = this.route.snapshot.queryParams['accessDenied'];
    if (accessDenied === 'super-admin-required') {
      this.permissionNotice.set(
        'Access Restricted: That module requires Super Admin privileges. You have been returned to the operational dashboard.'
      );
    }
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
        this.lastUpdated.set(new Date());
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status === 401) {
          this.errorMessage.set('Session expired or unauthorized. Please re-authenticate.');
        } else if (error.status === 403) {
          this.errorMessage.set('Access forbidden: Insufficient dashboard viewing permissions.');
        } else if (error.status === 0) {
          this.errorMessage.set('Network connection failed. Unable to fetch live metrics.');
        } else {
          this.errorMessage.set(error?.error?.detail || 'Failed to load dashboard metrics. Please retry.');
        }
      },
    });
  }

  dismissNotice(): void {
    this.permissionNotice.set(null);
  }

  get totalPendingApprovals(): number {
    const data = this.dashboardData();
    if (!data) return 0;
    const p = data.pending_approvals;
    const providerPending = data.providers?.pending_applications || 0;
    return (
      providerPending +
      (p?.homestay_listings || 0) +
      (p?.rental_vehicles || 0) +
      (p?.tour_guide_profiles || 0) +
      (p?.activity_listings || 0) +
      (p?.artisan_listings || 0)
    );
  }

  get totalBookingsRecorded(): number {
    const b = this.dashboardData()?.bookings;
    if (!b) return 0;
    return (b.homestay || 0) + (b.rental_vehicle || 0) + (b.tour_guide || 0) + (b.activity || 0);
  }
}
