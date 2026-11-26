import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  PROVIDER_CATEGORY_DISPLAY_NAMES,
  ProviderApprovalStatus,
  ProviderCategory,
  ProviderDetailResponse,
  ProviderListItem,
  ProviderType,
} from '../../core/models/admin-providers.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminProvidersService } from '../../core/services/admin-providers.service';
import { isSuperAdminUser } from '../../core/utils/admin-permissions.utils';
import { AdminProviderDetailModalComponent } from './components/admin-provider-detail-modal/admin-provider-detail-modal.component';
import {
  AdminSelectComponent,
  AdminSelectOption,
} from '../../shared/components/admin-select/admin-select.component';

@Component({
  selector: 'app-admin-providers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminProviderDetailModalComponent,
  ],
  templateUrl: './admin-providers.component.html',
  styleUrls: ['./admin-providers.component.scss'],
})
export class AdminProvidersComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private readonly providersService = inject(AdminProvidersService);
  private readonly authService = inject(AdminAuthService);

  // Directory State
  readonly providers = signal<ProviderListItem[]>([]);
  readonly totalItems = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5); // Default 5 to readily confirm multi-page navigation with preview fixtures
  readonly totalPages = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successBanner = signal<string | null>(null);

  // Filters State
  readonly searchInput = signal<string>('');
  readonly categoryFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');

  // KPI Summary Statistics (derived from available loaded dataset or service)
  readonly kpiTotal = signal<number>(0);
  readonly kpiApproved = signal<number>(0);
  readonly kpiPending = signal<number>(0);
  readonly kpiRejected = signal<number>(0);

  // Modals & Inspection State
  readonly selectedProvider = signal<ProviderDetailResponse | null>(null);

  // Search Debouncing
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Role and Environment Context
  readonly currentUser = this.authService.currentUser;
  readonly isSuperAdmin = computed(() => isSuperAdminUser(this.currentUser()));
  readonly isPreviewMode = computed(
    () =>
      environment.production === false &&
      (Boolean(environment.features?.adminPreviewMode) ||
        Boolean((environment as unknown as Record<string, unknown>)['adminPreviewMode']))
  );

  readonly categoryOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'homestay', label: 'Homestay' },
    { key: 'tour_guide', label: 'Tour Guide' },
    { key: 'activity', label: 'Adventure & Activities' },
    { key: 'rental', label: 'Bike & Bicycle Rentals' },
    { key: 'artisan', label: 'Local Artisan & Small Business' },
    { key: 'eco_tourism', label: 'Eco Tourism' },
  ];

  readonly pageSizeOptions: readonly AdminSelectOption<number>[] = [
    { key: 5, label: '5' },
    { key: 10, label: '10' },
    { key: 20, label: '20' },
  ];

  readonly statusOptions: { key: string; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending Review' },
    { key: 'rejected', label: 'Rejected' },
  ];

  ngOnInit(): void {
    // Setup debounced search subscription
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.searchInput.set(term);
        this.currentPage.set(1);
        this.loadProviders();
      });

    this.loadProviders();
    this.loadSummaryKPIs();
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
    this.loadProviders(true);
    this.loadSummaryKPIs();
  }

  /**
   * Loads providers with active search, filter, and pagination parameters.
   */
  loadProviders(isManualRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: {
      page: number;
      limit: number;
      search?: string;
      category?: ProviderCategory;
      status?: ProviderApprovalStatus;
    } = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    const trimmedSearch = this.searchInput().trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }

    if (this.categoryFilter() !== 'all') {
      params.category = this.categoryFilter() as ProviderCategory;
    }

    if (this.statusFilter() !== 'all') {
      params.status = this.statusFilter() as ProviderApprovalStatus;
    }

    this.providersService.getProviders(params).subscribe({
      next: (res) => {
        this.providers.set(res.items);
        this.totalItems.set(res.total);
        this.currentPage.set(res.page);
        this.totalPages.set(res.total_pages);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.lastRefreshed.set(new Date());
        if (isManualRefresh) {
          this.successBanner.set('Service provider directory refreshed successfully.');
          setTimeout(() => {
            if (this.successBanner() === 'Service provider directory refreshed successfully.') {
              this.successBanner.set(null);
            }
          }, 3000);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.errorMessage.set(
          err.message || 'Unable to retrieve service providers. Please verify connection and retry.'
        );
      },
    });
  }

  /**
   * Fetches full count statistics across directory for accurate summary cards.
   */
  loadSummaryKPIs(): void {
    this.providersService.getProviders({ limit: 100 }).subscribe({
      next: (res) => {
        this.kpiTotal.set(res.total);
        this.kpiApproved.set(res.items.filter((p) => p.approval_status === 'approved').length);
        this.kpiPending.set(res.items.filter((p) => p.approval_status === 'pending').length);
        this.kpiRejected.set(res.items.filter((p) => p.approval_status === 'rejected').length);
      },
      error: () => {
        // Non-blocking for summary cards
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onCategoryFilterChange(category: string | number): void {
    this.categoryFilter.set(String(category));
    this.currentPage.set(1);
    this.loadProviders();
  }

  onPageSizeChange(size: string | number): void {
    const num = Number(size) || 5;
    this.pageSize.set(num);
    this.currentPage.set(1);
    this.loadProviders();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadProviders();
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.loadProviders();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadProviders();
    }
  }

  /**
   * Opens provider detail modal for profile inspection.
   */
  openDetail(provider: ProviderListItem): void {
    this.providersService.getProviderById(provider.id).subscribe({
      next: (fullDetail) => {
        this.selectedProvider.set(fullDetail);
      },
      error: (err) => {
        this.errorMessage.set(`Failed to load provider #${provider.id}: ${err.message}`);
      },
    });
  }

  closeDetail(): void {
    this.selectedProvider.set(null);
  }

  getCategoryLabel(type: ProviderType | string): string {
    return PROVIDER_CATEGORY_DISPLAY_NAMES[type as ProviderCategory] || type;
  }
}
