import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminFinancialSummaryResponse,
  AdminPaymentTransactionItem,
  PaymentQueryParams,
} from '../../core/models/admin-payments.models';
import { AdminPaymentsService } from '../../core/services/admin-payments.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminPaymentDetailModalComponent } from './components/admin-payment-detail-modal/admin-payment-detail-modal.component';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSelectComponent,
    AdminPaymentDetailModalComponent,
  ],
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.scss'],
})
export class AdminPaymentsComponent implements OnInit, OnDestroy {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly canView = this.paymentsService.canViewPayments;
  readonly canManage = this.paymentsService.canManageFinances;

  payments: AdminPaymentTransactionItem[] = [];
  summary: AdminFinancialSummaryResponse = {
    total_gross_booking_revenue: 0,
    total_ceylongo_commission: 0,
    total_provider_liabilities: 0,
    total_verified_refunds: 0,
    total_settled_payouts: 0,
    pending_settlement_payouts: 0,
    total_advertising_revenue: 0,
    currency: 'LKR',
  };

  isLoading = false;
  errorMessage: string | null = null;
  lastSynced: Date = new Date();

  // Search & Filters
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedCategory = 'all';
  selectedStatus = 'all';

  readonly categoryOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Verticals' },
    { key: 'homestay', label: 'Homestay Stays' },
    { key: 'tour_guide', label: 'Tour Guide Escorts' },
    { key: 'rental', label: 'Vehicle Rentals' },
    { key: 'activity', label: 'Adventures' },
    { key: 'artisan', label: 'Artisan Visits' },
  ];

  readonly statusOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'captured', label: 'Simulated Success', badgeColor: '#10b981' },
    { key: 'pending', label: 'Pending Settlement', badgeColor: '#f59e0b' },
    { key: 'cash_on_delivery', label: 'Unpaid at Location', badgeColor: '#64748b' },
    { key: 'disputed', label: 'Flagged / Disputed', badgeColor: '#b45309' },
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
  selectedPayment: AdminPaymentTransactionItem | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadPayments();
      });

    this.loadSummary();
    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  metricsLoaded = false;
  summaryError: string | null = null;

  loadSummary(): void {
    this.metricsLoaded = false;
    this.summaryError = null;
    this.paymentsService.getFinancialSummary().subscribe({
      next: (summary) => {
        this.metricsLoaded = true;
        this.summary = summary;
        this.cdr.markForCheck();
      },
      error: () => {
        this.summaryError = 'Could not load live totals.';
        this.cdr.markForCheck();
      },
    });
  }

  loadPayments(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const params: PaymentQueryParams = {
      category: this.selectedCategory,
      status: this.selectedStatus,
      search: this.searchTerm.trim() || undefined,
      page: this.currentPage,
      page_size: this.pageSize,
    };

    this.paymentsService.getPayments(params).subscribe({
      next: (res) => {
        this.payments = res.items;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
        this.lastSynced = new Date();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to load transaction reconciliation queue.';
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onCategoryChange(val: string | number): void {
    this.selectedCategory = String(val);
    this.currentPage = 1;
    this.loadPayments();
  }

  onStatusChange(val: string | number): void {
    this.selectedStatus = String(val);
    this.currentPage = 1;
    this.loadPayments();
  }

  onPageSizeChange(val: string | number): void {
    this.pageSize = Number(val);
    this.currentPage = 1;
    this.loadPayments();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.currentPage) {
      this.currentPage = p;
      this.loadPayments();
    }
  }

  openDetail(payment: AdminPaymentTransactionItem): void {
    this.selectedPayment = payment;
  }

  closeDetail(): void {
    this.selectedPayment = null;
  }

  refreshData(): void {
    this.loadSummary();
    this.loadPayments();
  }
}
