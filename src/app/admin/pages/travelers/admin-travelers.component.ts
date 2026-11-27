import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  TravelerAccount,
  TravelerQueryParams,
  TravelerStatusUpdate,
} from '../../core/models/admin-travelers.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminTravelersService } from '../../core/services/admin-travelers.service';
import { AdminTravelerDetailModalComponent } from './components/admin-traveler-detail-modal/admin-traveler-detail-modal.component';
import { AdminTravelerStatusModalComponent } from './components/admin-traveler-status-modal/admin-traveler-status-modal.component';

@Component({
  selector: 'app-admin-travelers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    RouterLink,
    AdminTravelerDetailModalComponent,
    AdminTravelerStatusModalComponent,
  ],
  templateUrl: './admin-travelers.component.html',
  styleUrls: ['./admin-travelers.component.scss'],
})
export class AdminTravelersComponent implements OnInit, OnDestroy {
  private readonly travelersService = inject(AdminTravelersService);
  readonly authService = inject(AdminAuthService);

  // Reactive state
  readonly travelers = signal<TravelerAccount[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmittingStatus = signal<boolean>(false);
  readonly successBanner = signal<string | null>(null);

  // Pagination & Filtering
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);

  readonly statusFilter = signal<'all' | 'active' | 'suspended'>('all');
  readonly searchInput = signal<string>('');
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Modals state
  readonly detailModalTraveler = signal<TravelerAccount | null>(null);
  readonly statusModalTraveler = signal<TravelerAccount | null>(null);
  readonly statusModalTargetActive = signal<boolean>(false);

  // Computed properties
  readonly isSuperAdmin = this.authService.isSuperAdmin;
  readonly isDemo = computed(() => this.authService.isDemoSession());

  readonly totalActive = computed(() => {
    return this.travelers().filter((t) => t.is_active).length;
  });

  readonly totalSuspended = computed(() => {
    return this.travelers().filter((t) => !t.is_active).length;
  });

  readonly hasActiveFilters = computed(() => {
    return this.statusFilter() !== 'all' || this.searchInput().trim().length > 0;
  });

  ngOnInit(): void {
    // Setup debounced search
    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadTravelers();
      });

    this.loadTravelers();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchSubject.next(value);
  }

  onStatusFilterChange(filter: 'all' | 'active' | 'suspended'): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
    this.loadTravelers();
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.loadTravelers();
  }

  refreshData(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    this.loadTravelers(true);
  }

  loadTravelers(isManualRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: TravelerQueryParams = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      search: this.searchInput().trim() || undefined,
    };

    if (this.statusFilter() === 'active') {
      params.is_active = true;
    } else if (this.statusFilter() === 'suspended') {
      params.is_active = false;
    }

    this.travelersService.getTravelers(params).subscribe({
      next: (directory) => {
        this.travelers.set(directory.items || []);
        this.totalItems.set(directory.total || 0);
        this.totalPages.set(directory.total_pages || 1);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.lastRefreshed.set(new Date());
        if (isManualRefresh) {
          this.successBanner.set('Traveler directory refreshed successfully.');
          setTimeout(() => {
            if (this.successBanner() === 'Traveler directory refreshed successfully.') {
              this.successBanner.set(null);
            }
          }, 3000);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        const msg =
          err?.error?.detail ||
          err?.message ||
          'Failed to load traveler directory. Please check network connectivity or backend availability.';
        this.errorMessage.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadTravelers();
  }

  // =========================================================================
  // Modals Management
  // =========================================================================

  openDetail(traveler: TravelerAccount): void {
    this.detailModalTraveler.set(traveler);
  }

  closeDetail(): void {
    this.detailModalTraveler.set(null);
  }

  openStatusModal(traveler: TravelerAccount, targetActive: boolean): void {
    if (!this.isSuperAdmin()) {
      return; // Protected: only Super Admins can open status mutation
    }
    this.statusModalTraveler.set(traveler);
    this.statusModalTargetActive.set(targetActive);
  }

  closeStatusModal(): void {
    this.statusModalTraveler.set(null);
  }

  confirmStatusChange(update: TravelerStatusUpdate): void {
    const traveler = this.statusModalTraveler();
    if (!traveler) return;

    this.isSubmittingStatus.set(true);
    this.travelersService.updateTravelerStatus(traveler.id, update).subscribe({
      next: (updatedAccount) => {
        this.isSubmittingStatus.set(false);
        this.closeStatusModal();

        // Update local state smoothly
        const currentList = this.travelers().map((t) =>
          t.id === updatedAccount.id ? { ...t, is_active: updatedAccount.is_active } : t
        );
        this.travelers.set(currentList);

        const actionText = updatedAccount.is_active ? 'reactivated' : 'suspended';
        this.showSuccess(`Account for ${updatedAccount.full_name} has been successfully ${actionText}.`);
      },
      error: (err) => {
        this.isSubmittingStatus.set(false);
        const msg = err?.error?.detail || err?.message || 'Failed to update traveler account status.';
        this.errorMessage.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  private showSuccess(msg: string): void {
    this.successBanner.set(msg);
    setTimeout(() => {
      this.successBanner.set(null);
    }, 4000);
  }
}
