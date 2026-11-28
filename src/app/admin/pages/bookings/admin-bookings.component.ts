import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminBookingDetailResponse,
  AdminBookingKPIs,
  AdminBookingListItem,
  BookingCategory,
  BookingQueryParams,
} from '../../core/models/admin-bookings.models';
import { AdminBookingsService } from '../../core/services/admin-bookings.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminBookingDetailModalComponent } from './components/admin-booking-detail-modal/admin-booking-detail-modal.component';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSelectComponent,
    AdminBookingDetailModalComponent,
  ],
  templateUrl: './admin-bookings.component.html',
  styleUrls: ['./admin-bookings.component.scss'],
})
export class AdminBookingsComponent implements OnInit, OnDestroy {
  private readonly bookingsService = inject(AdminBookingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly canView = this.bookingsService.canViewBookings;

  bookings: AdminBookingListItem[] = [];
  kpis: AdminBookingKPIs = {
    total_bookings: 0,
    confirmed_bookings: 0,
    pending_bookings: 0,
    completed_bookings: 0,
    cancelled_or_disputed: 0,
  };

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Search & Filters
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedCategory: BookingCategory | string = 'all';
  selectedStatus = 'all';
  dateFrom = '';
  dateTo = '';

  readonly categoryOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Booking Categories' },
    { key: 'homestay', label: 'Homestay Stays' },
    { key: 'tour_guide', label: 'Tour Guide Escorts' },
    { key: 'rental', label: 'Vehicle Rentals' },
    { key: 'activity', label: 'Outdoor Activities' },
    { key: 'artisan', label: 'Artisan Reservations' },
  ];

  readonly statusOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'confirmed', label: 'Confirmed', badgeColor: '#10b981' },
    { key: 'pending', label: 'Pending', badgeColor: '#f59e0b' },
    { key: 'completed', label: 'Completed', badgeColor: '#0284c7' },
    { key: 'cancelled', label: 'Cancelled', badgeColor: '#ef4444' },
    { key: 'refund_pending', label: 'Refund Pending', badgeColor: '#b45309' },
  ];

  readonly pageSizeOptions: readonly AdminSelectOption[] = [
    { key: 10, label: '10 per page' },
    { key: 20, label: '20 per page' },
    { key: 50, label: '50 per page' },
  ];

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;

  // Detail Modal
  selectedBookingDetail: AdminBookingDetailResponse | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadBookings();
      });

    this.loadKPIs();
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  metricsLoaded = false;
  metricsError: string | null = null;

  loadKPIs(): void {
    this.metricsLoaded = false;
    this.metricsError = null;
    this.bookingsService.getBookingKPIs().subscribe({
      next: (kpis) => {
        this.metricsLoaded = true;
        this.kpis = kpis;
        this.cdr.markForCheck();
      },
      error: () => {
        this.metricsError = 'Could not load live totals.';
        this.cdr.markForCheck();
      },
    });
  }

  loadBookings(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const params: BookingQueryParams = {
      page: this.currentPage,
      page_size: this.pageSize,
      category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined,
      status: this.selectedStatus !== 'all' ? this.selectedStatus : undefined,
      search: this.searchTerm.trim() || undefined,
      date_from: this.dateFrom || undefined,
      date_to: this.dateTo || undefined,
    };

    this.bookingsService.getBookings(params).subscribe({
      next: (res) => {
        this.bookings = res.items;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load booking directory.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onCategoryChange(value: string | number): void {
    this.selectedCategory = String(value);
    this.currentPage = 1;
    this.loadBookings();
  }

  onStatusChange(value: string | number): void {
    this.selectedStatus = String(value);
    this.currentPage = 1;
    this.loadBookings();
  }

  onDateFilterChange(): void {
    this.currentPage = 1;
    this.loadBookings();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadBookings();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadBookings();
    }
  }

  refreshData(): void {
    this.loadKPIs();
    this.loadBookings();
  }

  openDetail(booking: AdminBookingListItem): void {
    this.isLoading = true;
    this.bookingsService.getBookingById(booking.id).subscribe({
      next: (detail) => {
        this.selectedBookingDetail = detail;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load booking dossier.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetail(): void {
    this.selectedBookingDetail = null;
  }
}
