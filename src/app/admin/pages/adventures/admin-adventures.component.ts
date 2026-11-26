import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  ADMIN_PROVINCE_FILTER_OPTIONS,
  getDistrictFilterOptionsByProvince,
} from '../../core/constants/admin-districts.constants';
import {
  ActivityApprovalRequest,
  ActivityQueryParams,
  ActivityRejectionRequest,
  ActivityResponse,
} from '../../core/models/admin-activities.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminAdventuresService } from '../../core/services/admin-adventures.service';
import {
  canReviewActivities,
  canViewActivities,
  isSuperAdminUser,
} from '../../core/utils/admin-permissions.utils';
import {
  AdminSelectComponent,
  AdminSelectOption,
} from '../../shared/components/admin-select/admin-select.component';
import { AdminAdventureDetailModalComponent } from './components/admin-adventure-detail-modal/admin-adventure-detail-modal.component';
import { AdminAdventureRejectDialogComponent } from './components/admin-adventure-reject-dialog/admin-adventure-reject-dialog.component';

@Component({
  selector: 'app-admin-adventures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminAdventureDetailModalComponent,
    AdminAdventureRejectDialogComponent,
  ],
  templateUrl: './admin-adventures.component.html',
  styleUrls: ['./admin-adventures.component.scss'],
})
export class AdminAdventuresComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private readonly adventuresService = inject(AdminAdventuresService);
  private readonly authService = inject(AdminAuthService);

  // Directory State
  readonly activities = signal<ActivityResponse[]>([]);
  readonly totalItems = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalPages = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly isProcessingAction = signal<boolean>(false);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successBanner = signal<string | null>(null);

  // Filters State
  readonly searchInput = signal<string>('');
  readonly provinceFilter = signal<string>('all');
  readonly districtFilter = signal<string>('all');
  readonly categoryFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');

  // Dependent District Options & Disabled State
  readonly isDistrictDisabled = computed(() => this.provinceFilter() === 'all');
  readonly provinceOptions = ADMIN_PROVINCE_FILTER_OPTIONS;
  readonly districtOptions = computed(() => getDistrictFilterOptionsByProvince(this.provinceFilter()));

  // Dropdown Options
  readonly categoryOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'hiking', label: 'Hiking & Trekking' },
    { key: 'surfing', label: 'Surfing & Watersports' },
    { key: 'rafting', label: 'White Water Rafting' },
    { key: 'rock_climbing', label: 'Rock Climbing' },
    { key: 'scuba_diving', label: 'Scuba Diving & Snorkeling' },
    { key: 'wildlife_safari', label: 'Wildlife Safari' },
    { key: 'cultural_tour', label: 'Cultural Tour' },
    { key: 'cycling', label: 'Cycling & Mountain Biking' },
    { key: 'other', label: 'Other Adventures' },
  ];

  readonly statusOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'pending', label: 'Pending Review', badgeColor: 'amber' },
    { key: 'approved', label: 'Approved', badgeColor: 'green' },
    { key: 'rejected', label: 'Rejected', badgeColor: 'red' },
    { key: 'suspended', label: 'Suspended', badgeColor: 'slate' },
  ];

  readonly pageSizeOptions: readonly AdminSelectOption<number>[] = [
    { key: 10, label: '10' },
    { key: 25, label: '25' },
    { key: 50, label: '50' },
  ];

  // KPI Summary Statistics
  readonly kpiTotal = signal<number>(0);
  readonly kpiPending = signal<number>(0);
  readonly kpiApproved = signal<number>(0);
  readonly kpiRejected = signal<number>(0);

  // Modals & Action Dialogs State
  readonly selectedActivity = signal<ActivityResponse | null>(null);
  readonly rejectingActivity = signal<ActivityResponse | null>(null);

  // Search Debouncing
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Role and Environment Context
  readonly currentUser = this.authService.currentUser;
  readonly isSuperAdmin = computed(() => isSuperAdminUser(this.currentUser()));
  readonly canReview = computed(() => canReviewActivities(this.currentUser()));
  readonly canView = computed(() => canViewActivities(this.currentUser()));

  readonly isPreviewMode = computed(
    () =>
      this.authService.isDemoSession() ||
      (environment.production === false &&
        (Boolean(environment.features?.adminPreviewMode) ||
          Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode'])))
  );

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.searchInput.set(term);
        this.currentPage.set(1);
        this.loadActivities();
      });

    this.loadActivities();
    this.loadKPIs();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadActivities(): void {
    if (!this.canView()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to view adventure activities.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: ActivityQueryParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
      category: this.categoryFilter() !== 'all' ? this.categoryFilter() : undefined,
      province: this.provinceFilter() !== 'all' ? this.provinceFilter() : undefined,
      district: this.districtFilter() !== 'all' ? this.districtFilter() : undefined,
      search: this.searchInput().trim() || undefined,
    };

    this.adventuresService.getActivities(params).subscribe({
      next: (res) => {
        this.activities.set(res.items);
        this.totalItems.set(res.total);
        this.totalPages.set(res.total_pages || 1);
        this.lastRefreshed.set(new Date());
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load adventure activities.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
    });
  }

  loadKPIs(): void {
    this.adventuresService.getSummary().subscribe({
      next: (summary) => {
        this.kpiTotal.set(summary.total);
        this.kpiPending.set(summary.pending_approval);
        this.kpiApproved.set(summary.approved);
        this.kpiRejected.set(summary.rejected);
      },
      error: () => {
        // Non-critical metric failure
      },
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  onProvinceFilterChange(value: string | number): void {
    this.provinceFilter.set(String(value));
    this.districtFilter.set('all');
    this.currentPage.set(1);
    this.loadActivities();
  }

  onDistrictFilterChange(value: string | number): void {
    this.districtFilter.set(String(value));
    this.currentPage.set(1);
    this.loadActivities();
  }

  onCategoryFilterChange(value: string | number): void {
    this.categoryFilter.set(String(value));
    this.currentPage.set(1);
    this.loadActivities();
  }

  onStatusFilterChange(value: string | number): void {
    this.statusFilter.set(String(value));
    this.currentPage.set(1);
    this.loadActivities();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
    this.loadActivities();
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.provinceFilter.set('all');
    this.districtFilter.set('all');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.loadActivities();
  }

  onRefresh(): void {
    this.isRefreshing.set(true);
    this.loadActivities();
    this.loadKPIs();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadActivities();
    }
  }

  // Modals
  openDetail(activity: ActivityResponse): void {
    this.selectedActivity.set(activity);
  }

  closeDetail(): void {
    this.selectedActivity.set(null);
  }

  openRejectDialog(activity: ActivityResponse): void {
    this.rejectingActivity.set(activity);
  }

  closeRejectDialog(): void {
    this.rejectingActivity.set(null);
  }

  // Approval Action
  onApproveActivity(activity: ActivityResponse): void {
    if (!this.canReview()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to approve activities.');
      return;
    }

    this.isProcessingAction.set(true);
    const payload: ActivityApprovalRequest = {
      notes: 'Approved via admin dashboard',
    };

    this.adventuresService.approveActivity(activity.id, payload).subscribe({
      next: (updated) => {
        this.isProcessingAction.set(false);
        this.selectedActivity.set(null);
        this.successBanner.set(`Adventure "${updated.title}" approved successfully.`);
        setTimeout(() => this.successBanner.set(null), 4000);
        this.loadActivities();
        this.loadKPIs();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.errorMessage.set(err.message || 'Failed to approve activity.');
      },
    });
  }

  // Rejection Action
  onConfirmReject(event: { activityId: number; reason: string }): void {
    if (!this.canReview()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to reject activities.');
      return;
    }

    this.isProcessingAction.set(true);
    const payload: ActivityRejectionRequest = { reason: event.reason };

    this.adventuresService.rejectActivity(event.activityId, payload).subscribe({
      next: (updated) => {
        this.isProcessingAction.set(false);
        this.rejectingActivity.set(null);
        this.selectedActivity.set(null);
        this.successBanner.set(`Adventure "${updated.title}" rejected.`);
        setTimeout(() => this.successBanner.set(null), 4000);
        this.loadActivities();
        this.loadKPIs();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.errorMessage.set(err.message || 'Failed to reject activity.');
      },
    });
  }
}
