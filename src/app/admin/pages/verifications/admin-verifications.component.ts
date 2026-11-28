import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminVerificationsService } from '../../core/services/admin-verifications.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ProviderVerificationItem, VerificationQueryParams } from '../../core/models/admin-verifications.models';
import {
  AdminSelectComponent,
  AdminSelectOption,
} from '../../shared/components/admin-select/admin-select.component';
import { AdminVerificationReviewModalComponent } from './components/admin-verification-review-modal/admin-verification-review-modal.component';

@Component({
  selector: 'app-admin-verifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminVerificationReviewModalComponent,
  ],
  templateUrl: './admin-verifications.component.html',
  styleUrls: ['./admin-verifications.component.scss']
})
export class AdminVerificationsComponent implements OnInit {
  private readonly verificationsService = inject(AdminVerificationsService);
  private readonly authService = inject(AdminAuthService);

  readonly isPreviewMode = computed(() => this.verificationsService.isPreviewMode());
  readonly canReview = computed(() => this.verificationsService.canReviewVerifications());
  readonly currentRole = computed(() => this.authService.currentUser()?.role ?? '');

  // Queue State
  readonly queueItems = signal<ProviderVerificationItem[]>([]);
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
  // Default to 'pending' as specified in requirements
  readonly statusFilter = signal<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  readonly categoryFilter = signal<string>('all');
  readonly searchQuery = signal<string>('');
  private searchDebounceTimer: any = null;

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
    { key: 25, label: '25' },
  ];

  // Selected item for modal
  readonly selectedVerification = signal<ProviderVerificationItem | null>(null);
  readonly isReviewModalOpen = signal<boolean>(false);

  // KPI Computations from full summary stats or active list
  readonly totalInQueue = signal<number>(0);
  readonly pendingCount = signal<number>(0);
  readonly approvedCount = signal<number>(0);
  readonly rejectedCount = signal<number>(0);

  // Pagination display helpers
  readonly startItemIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endItemIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  ngOnInit(): void {
    this.loadKPIs();
    this.loadQueue();
  }

  refreshData(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    this.loadKPIs();
    this.loadQueue(true);
  }

  loadKPIs(): void {
    // Load counts across all statuses
    this.verificationsService.getVerificationQueue({ status: 'all', page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.totalInQueue.set(res.total);
        const pending = res.items.filter(i => i.approval_status === 'pending').length;
        const approved = res.items.filter(i => i.approval_status === 'approved').length;
        const rejected = res.items.filter(i => i.approval_status === 'rejected').length;
        this.pendingCount.set(pending);
        this.approvedCount.set(approved);
        this.rejectedCount.set(rejected);
      },
      error: () => {
        // Fallback gracefully
      }
    });
  }

  loadQueue(isManualRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: VerificationQueryParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      status: this.statusFilter(),
      category: this.categoryFilter() === 'all' ? undefined : this.categoryFilter(),
      search: this.searchQuery().trim() || undefined
    };

    this.verificationsService.getVerificationQueue(params).subscribe({
      next: (res) => {
        this.queueItems.set(res.items);
        this.totalItems.set(res.total);
        this.currentPage.set(res.page);
        this.totalPages.set(res.total_pages);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.lastRefreshed.set(new Date());
        if (isManualRefresh) {
          this.successBanner.set('Verification queue refreshed successfully.');
          setTimeout(() => {
            if (this.successBanner() === 'Verification queue refreshed successfully.') {
              this.successBanner.set(null);
            }
          }, 3000);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.errorMessage.set(err?.message || 'Failed to load verification queue.');
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadQueue();
    }, 300);
  }

  onCategoryChange(category: string | number): void {
    this.categoryFilter.set(String(category));
    this.currentPage.set(1);
    this.loadQueue();
  }

  onStatusChange(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadQueue();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('pending');
    this.currentPage.set(1);
    this.loadQueue();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadQueue();
    }
  }

  onPageSizeChange(event: Event | number | string): void {
    let newSize: number;
    if (typeof event === 'number') {
      newSize = event;
    } else if (typeof event === 'string') {
      newSize = parseInt(event, 10);
    } else {
      const target = event.target as HTMLSelectElement;
      newSize = parseInt(target?.value, 10);
    }
    if (newSize && newSize !== this.pageSize()) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      this.loadQueue();
    }
  }

  openReviewModal(item: ProviderVerificationItem): void {
    this.selectedVerification.set(item);
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.selectedVerification.set(null);
    this.isReviewModalOpen.set(false);
  }

  onDecisionComplete(updatedItem: any): void {
    // Refresh both KPIs and queue after approval or rejection
    this.loadKPIs();
    this.loadQueue();
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'badge-status-approved';
      case 'rejected':
        return 'badge-status-rejected';
      case 'pending':
      default:
        return 'badge-status-pending';
    }
  }

  hasDocumentType(item: ProviderVerificationItem, type: string): boolean {
    return item.documents?.some(d => d.type === type && d.isAvailable) ?? false;
  }
}
