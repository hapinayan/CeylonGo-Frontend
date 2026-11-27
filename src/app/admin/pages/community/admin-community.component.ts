import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminCommunityReportItem,
  CommunityQueryParams,
  ModerateContentPayload,
} from '../../core/models/admin-community.models';
import { AdminCommunityService } from '../../core/services/admin-community.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminCommunityReviewModalComponent } from './components/admin-community-review-modal/admin-community-review-modal.component';

@Component({
  selector: 'app-admin-community',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSelectComponent,
    AdminCommunityReviewModalComponent,
  ],
  templateUrl: './admin-community.component.html',
  styleUrls: ['./admin-community.component.scss'],
})
export class AdminCommunityComponent implements OnInit, OnDestroy {
  private readonly communityService = inject(AdminCommunityService);

  readonly canView = this.communityService.canViewCommunity;
  readonly canModerate = this.communityService.canModerateCommunity;

  reports: AdminCommunityReportItem[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Search & Filters
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedEntityType = 'all';
  selectedStatus = 'all';

  readonly entityTypeOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Content Types' },
    { key: 'post', label: 'Community Posts' },
    { key: 'comment', label: 'Discussion Comments' },
    { key: 'profile', label: 'Traveler Profiles' },
    { key: 'hashtag', label: 'Trending Hashtags' },
  ];

  readonly statusOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Report Statuses' },
    { key: 'pending', label: 'Pending Review', badgeColor: '#f59e0b' },
    { key: 'actioned', label: 'Actioned / Moderated', badgeColor: '#10b981' },
    { key: 'reviewed', label: 'Reviewed / Closed', badgeColor: '#64748b' },
  ];

  readonly pageSizeOptions: readonly AdminSelectOption[] = [
    { key: 10, label: '10 per page' },
    { key: 20, label: '20 per page' },
    { key: 50, label: '50 per page' },
  ];

  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;

  selectedReport: AdminCommunityReportItem | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadReports();
      });

    this.loadReports();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const params: CommunityQueryParams = {
      entity_type: this.selectedEntityType,
      status: this.selectedStatus,
      search: this.searchTerm.trim() || undefined,
      page: this.currentPage,
      page_size: this.pageSize,
    };

    this.communityService.getCommunityReports(params).subscribe({
      next: (res) => {
        this.reports = res.items;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to load community reports.';
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onEntityTypeChange(val: string | number): void {
    this.selectedEntityType = String(val);
    this.currentPage = 1;
    this.loadReports();
  }

  onStatusChange(val: string | number): void {
    this.selectedStatus = String(val);
    this.currentPage = 1;
    this.loadReports();
  }

  onPageSizeChange(val: string | number): void {
    this.pageSize = Number(val);
    this.currentPage = 1;
    this.loadReports();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.currentPage) {
      this.currentPage = p;
      this.loadReports();
    }
  }

  openReview(report: AdminCommunityReportItem): void {
    this.selectedReport = report;
  }

  closeReview(): void {
    this.selectedReport = null;
  }

  executeAction(payload: ModerateContentPayload): void {
    if (!this.selectedReport) return;
    const reportId = this.selectedReport.id;

    this.communityService.reviewReport(reportId, payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Report actioned successfully.';
        this.closeReview();
        this.loadReports();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to action report.';
      },
    });
  }
}
