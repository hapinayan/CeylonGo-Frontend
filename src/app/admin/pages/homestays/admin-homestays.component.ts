import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  ADMIN_DISTRICT_FILTER_OPTIONS,
  ADMIN_PROVINCE_FILTER_OPTIONS,
  getDistrictFilterOptionsByProvince,
} from '../../core/constants/admin-districts.constants';
import {
  HomestayApprovalStatus,
  HomestayQueryParams,
  HomestayResponse,
  HomestayReviewRequest,
  HomestayVerificationRequest,
  HomestayVerificationStatus,
} from '../../core/models/admin-homestays.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminHomestaysService } from '../../core/services/admin-homestays.service';
import {
  canReviewHomestays,
  canVerifyHomestays,
  canViewHomestays,
  isSuperAdminUser,
} from '../../core/utils/admin-permissions.utils';
import {
  AdminSelectComponent,
  AdminSelectOption,
} from '../../shared/components/admin-select/admin-select.component';
import { AdminHomestayDetailModalComponent } from './components/admin-homestay-detail-modal/admin-homestay-detail-modal.component';
import { AdminHomestayReviewDialogComponent } from './components/admin-homestay-review-dialog/admin-homestay-review-dialog.component';
import { AdminHomestayVerifyDialogComponent } from './components/admin-homestay-verify-dialog/admin-homestay-verify-dialog.component';

@Component({
  selector: 'app-admin-homestays',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminHomestayDetailModalComponent,
    AdminHomestayReviewDialogComponent,
    AdminHomestayVerifyDialogComponent,
  ],
  templateUrl: './admin-homestays.component.html',
  styleUrls: ['./admin-homestays.component.scss'],
})
export class AdminHomestaysComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private readonly homestaysService = inject(AdminHomestaysService);
  private readonly authService = inject(AdminAuthService);

  // Directory State
  readonly homestays = signal<HomestayResponse[]>([]);
  readonly totalItems = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);
  readonly totalPages = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successBanner = signal<string | null>(null);

  // Filters State
  readonly searchInput = signal<string>('');
  readonly provinceFilter = signal<string>('all');
  readonly districtFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');
  readonly verificationFilter = signal<string>('all');

  // Dependent District Options & Disabled State
  readonly isDistrictDisabled = computed(() => this.provinceFilter() === 'all');
  readonly provinceOptions = ADMIN_PROVINCE_FILTER_OPTIONS;
  readonly districtOptions = computed(() => getDistrictFilterOptionsByProvince(this.provinceFilter()));

  // Page Size Selector Options
  readonly pageSizeOptions: readonly AdminSelectOption<number>[] = [
    { key: 5, label: '5' },
    { key: 10, label: '10' },
    { key: 20, label: '20' },
  ];

  // KPI Summary Statistics
  readonly kpiTotal = signal<number>(0);
  readonly kpiApproved = signal<number>(0);
  readonly kpiPending = signal<number>(0);
  readonly kpiSuspended = signal<number>(0);
  readonly kpiRejected = signal<number>(0);

  // Modals & Action Dialogs State
  readonly selectedHomestay = signal<HomestayResponse | null>(null);
  readonly reviewingHomestay = signal<HomestayResponse | null>(null);
  readonly verifyingHomestay = signal<HomestayResponse | null>(null);

  // Search Debouncing
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Role and Environment Context
  readonly currentUser = this.authService.currentUser;
  readonly isSuperAdmin = computed(() => isSuperAdminUser(this.currentUser()));
  readonly canReview = computed(() => canReviewHomestays(this.currentUser()));
  readonly canVerify = computed(() => canVerifyHomestays(this.currentUser()));
  readonly canView = computed(() => canViewHomestays(this.currentUser()));

  readonly isPreviewMode = computed(
    () =>
      this.authService.isDemoSession() ||
      (environment.production === false &&
        (Boolean(environment.features?.adminPreviewMode) ||
          Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode'])))
  );

  readonly statusOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Listing Statuses' },
    { key: 'pending', label: 'Pending Review', badgeColor: 'amber' },
    { key: 'approved', label: 'Approved', badgeColor: 'green' },
    { key: 'suspended', label: 'Suspended', badgeColor: 'slate' },
    { key: 'rejected', label: 'Rejected', badgeColor: 'red' },
  ];

  readonly verificationOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Verifications' },
    { key: 'verified', label: 'Verified', badgeColor: 'green' },
    { key: 'unverified', label: 'Unverified', badgeColor: 'slate' },
    { key: 'pending', label: 'Pending Inspection', badgeColor: 'amber' },
    { key: 'rejected', label: 'Verification Failed', badgeColor: 'red' },
  ];

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.searchInput.set(term);
        this.currentPage.set(1);
        this.loadHomestays();
      });

    this.loadHomestays();
    this.loadDashboardKPIs();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  /**
   * Manual refresh handler that reloads both directory records and KPI statistics.
   */
  refreshData(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    this.loadHomestays(true);
    this.loadDashboardKPIs();
  }

  /**
   * Loads homestays with active search, filter, and pagination parameters.
   */
  loadHomestays(isManualRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: HomestayQueryParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.searchInput().trim()) {
      params.search = this.searchInput().trim();
    }
    if (this.provinceFilter() !== 'all') {
      params.province = this.provinceFilter();
    }
    if (this.districtFilter() !== 'all') {
      params.district = this.districtFilter();
    }
    if (this.statusFilter() !== 'all') {
      params.status = this.statusFilter();
    }
    if (this.verificationFilter() !== 'all') {
      params.verification_status = this.verificationFilter();
    }

    this.homestaysService.getHomestays(params).subscribe({
      next: (res) => {
        this.homestays.set(res.items);
        this.totalItems.set(res.total);
        this.totalPages.set(res.total_pages);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.lastRefreshed.set(new Date());

        if (isManualRefresh) {
          this.successBanner.set('Homestay listings and metrics synchronized successfully.');
          setTimeout(() => this.successBanner.set(null), 3500);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        const msg = err?.error?.detail || err?.message || 'Failed to load homestay listings.';
        this.errorMessage.set(msg);
      },
    });
  }

  /**
   * Loads homestay platform summary KPI statistics.
   */
  loadDashboardKPIs(): void {
    this.homestaysService.getHomestayDashboard().subscribe({
      next: (dashboard) => {
        this.kpiTotal.set(dashboard.listings.total);
        this.kpiApproved.set(dashboard.listings.approved);
        this.kpiPending.set(dashboard.listings.pending_approval);
        this.kpiSuspended.set(dashboard.listings.suspended);
        this.kpiRejected.set(dashboard.listings.rejected);
      },
      error: () => {
        this.errorMessage.set('Could not load live homestay totals.');
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onProvinceFilterChange(province: string | number): void {
    this.provinceFilter.set(String(province));
    this.districtFilter.set('all');
    this.currentPage.set(1);
    this.loadHomestays();
  }

  onDistrictFilterChange(district: string | number): void {
    this.districtFilter.set(String(district));
    this.currentPage.set(1);
    this.loadHomestays();
  }

  onStatusFilterChange(status: string | number): void {
    this.statusFilter.set(String(status));
    this.currentPage.set(1);
    this.loadHomestays();
  }

  onVerificationFilterChange(status: string | number): void {
    this.verificationFilter.set(String(status));
    this.currentPage.set(1);
    this.loadHomestays();
  }

  onPageSizeChange(size: string | number): void {
    const num = Number(size) || 5;
    this.pageSize.set(num);
    this.currentPage.set(1);
    this.loadHomestays();
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.provinceFilter.set('all');
    this.districtFilter.set('all');
    this.statusFilter.set('all');
    this.verificationFilter.set('all');
    this.currentPage.set(1);
    this.loadHomestays();
  }

  // Modals & Dialogs
  openDetailModal(item: HomestayResponse): void {
    this.selectedHomestay.set(item);
  }

  closeDetailModal(): void {
    this.selectedHomestay.set(null);
  }

  openReviewDialog(item: HomestayResponse): void {
    this.reviewingHomestay.set(item);
  }

  closeReviewDialog(): void {
    this.reviewingHomestay.set(null);
  }

  submitReviewDecision(payload: HomestayReviewRequest): void {
    const homestay = this.reviewingHomestay();
    if (!homestay) return;

    this.homestaysService.reviewHomestay(homestay.id, payload).subscribe({
      next: (updated) => {
        this.closeReviewDialog();
        this.successBanner.set(
          `Homestay #${updated.id} (${updated.name}) review status updated to '${updated.approval_status}'.`
        );
        setTimeout(() => this.successBanner.set(null), 4000);
        this.loadHomestays();
        this.loadDashboardKPIs();
      },
      error: (err) => {
        const msg = err?.error?.detail || err?.message || 'Review action submission failed.';
        this.errorMessage.set(msg);
      },
    });
  }

  openVerifyDialog(item: HomestayResponse): void {
    this.verifyingHomestay.set(item);
  }

  closeVerifyDialog(): void {
    this.verifyingHomestay.set(null);
  }

  submitVerifyDecision(payload: HomestayVerificationRequest): void {
    const homestay = this.verifyingHomestay();
    if (!homestay) return;

    this.homestaysService.verifyHomestay(homestay.id, payload).subscribe({
      next: (updated) => {
        this.closeVerifyDialog();
        this.successBanner.set(
          `Homestay #${updated.id} (${updated.name}) physical verification updated to '${updated.verification_status}'.`
        );
        setTimeout(() => this.successBanner.set(null), 4000);
        this.loadHomestays();
        this.loadDashboardKPIs();
      },
      error: (err) => {
        const msg = err?.error?.detail || err?.message || 'Verification update failed.';
        this.errorMessage.set(msg);
      },
    });
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadHomestays();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }
}
