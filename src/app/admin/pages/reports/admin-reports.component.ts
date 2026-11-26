import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { PlatformAnalyticsOverview } from '../../core/models/admin-reports.models';
import { AdminReportsService } from '../../core/services/admin-reports.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss'],
})
export class AdminReportsComponent implements OnInit {
  private readonly reportsService = inject(AdminReportsService);

  readonly canView = this.reportsService.canViewReports;

  analytics: PlatformAnalyticsOverview | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  lastGenerated = new Date();

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.reportsService.getAnalyticsOverview().subscribe({
      next: (data) => {
        this.analytics = data;
        this.isLoading = false;
        this.lastGenerated = new Date();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to generate platform analytics reports.';
      },
    });
  }
}
