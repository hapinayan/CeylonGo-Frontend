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
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleListItem,
  AdminVehicleReviewRequest,
  RentalQueryParams,
  RentalVehicleType,
} from '../../core/models/admin-rentals.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminRentalsService } from '../../core/services/admin-rentals.service';
import {
  canReviewRentals,
  canVerifyRentalDocuments,
  canViewRentals,
  isSuperAdminUser,
} from '../../core/utils/admin-permissions.utils';
import {
  AdminSelectComponent,
  AdminSelectOption,
} from '../../shared/components/admin-select/admin-select.component';
import { AdminVehicleDetailModalComponent } from './components/admin-vehicle-detail-modal/admin-vehicle-detail-modal.component';
import { AdminVehicleReviewDialogComponent } from './components/admin-vehicle-review-dialog/admin-vehicle-review-dialog.component';

@Component({
  selector: 'app-admin-rentals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminVehicleDetailModalComponent,
    AdminVehicleReviewDialogComponent,
  ],
  templateUrl: './admin-rentals.component.html',
  styleUrls: ['./admin-rentals.component.scss'],
})
export class AdminRentalsComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private readonly rentalsService = inject(AdminRentalsService);
  private readonly authService = inject(AdminAuthService);

  // Directory State
  readonly vehicles = signal<AdminVehicleListItem[]>([]);
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
  readonly vehicleTypeFilter = signal<string>('all');
  readonly provinceFilter = signal<string>('all');
  readonly districtFilter = signal<string>('all');
  readonly approvalFilter = signal<string>('all');
  readonly verificationFilter = signal<string>('all');

  // Dependent District Options & Disabled State
  readonly isDistrictDisabled = computed(() => this.provinceFilter() === 'all');
  readonly provinceOptions = ADMIN_PROVINCE_FILTER_OPTIONS;
  readonly districtOptions = computed(() => getDistrictFilterOptionsByProvince(this.provinceFilter()));

  // Dropdown Options
  readonly vehicleTypeOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Vehicle Types' },
    { key: 'bike', label: 'Motorbike / Scooter' },
    { key: 'bicycle', label: 'Bicycle (Non-Motorized)' },
    { key: 'tuk_tuk', label: 'Tuk-Tuk' },
  ];

  readonly approvalOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Approvals' },
    { key: 'pending', label: 'Pending Review', badgeColor: 'amber' },
    { key: 'approved', label: 'Approved', badgeColor: 'green' },
    { key: 'rejected', label: 'Rejected', badgeColor: 'red' },
    { key: 'suspended', label: 'Suspended', badgeColor: 'slate' },
  ];

  readonly verificationOptions: readonly AdminSelectOption<string>[] = [
    { key: 'all', label: 'All Verifications' },
    { key: 'verified', label: 'Verified', badgeColor: 'green' },
    { key: 'unverified', label: 'Unverified', badgeColor: 'slate' },
    { key: 'pending', label: 'Pending Audit', badgeColor: 'amber' },
    { key: 'rejected', label: 'Rejected', badgeColor: 'red' },
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
  readonly kpiVerified = signal<number>(0);
  readonly kpiRejected = signal<number>(0);

  // Modals & Action Dialogs State
  readonly selectedVehicle = signal<AdminVehicleDetailResponse | null>(null);
  readonly selectedVehicleDocs = signal<AdminVehicleDocumentItem[]>([]);
  readonly reviewingVehicle = signal<AdminVehicleDetailResponse | null>(null);
  readonly initialReviewDecision = signal<'approved' | 'rejected' | 'suspended'>('approved');

  // Search Debouncing
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Role and Environment Context
  readonly currentUser = this.authService.currentUser;
  readonly isSuperAdmin = computed(() => isSuperAdminUser(this.currentUser()));
  readonly canReview = computed(() => canReviewRentals(this.currentUser()));
  readonly canVerifyDocs = computed(() => canVerifyRentalDocuments(this.currentUser()));
  readonly canView = computed(() => canViewRentals(this.currentUser()));

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
        this.loadVehicles();
      });

    this.loadVehicles();
    this.loadKPIs();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadVehicles(): void {
    if (!this.canView()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to view rental fleet.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: RentalQueryParams = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      approval_status: this.approvalFilter() !== 'all' ? this.approvalFilter() : undefined,
      verification_status: this.verificationFilter() !== 'all' ? this.verificationFilter() : undefined,
      vehicle_type: this.vehicleTypeFilter() !== 'all' ? this.vehicleTypeFilter() : undefined,
      province: this.provinceFilter() !== 'all' ? this.provinceFilter() : undefined,
      district: this.districtFilter() !== 'all' ? this.districtFilter() : undefined,
      search: this.searchInput().trim() || undefined,
    };

    this.rentalsService.getRentals(params).subscribe({
      next: (res) => {
        this.vehicles.set(res.items);
        this.totalItems.set(res.total);
        this.totalPages.set(res.total_pages || 1);
        this.lastRefreshed.set(new Date());
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load rental vehicles.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
    });
  }

  loadKPIs(): void {
    this.rentalsService.getFleetSummary().subscribe({
      next: (summary) => {
        this.kpiTotal.set(summary.total_vehicles);
        this.kpiPending.set(summary.pending_approval);
        this.kpiApproved.set(summary.approved_vehicles);
        this.kpiVerified.set(summary.verified_vehicles);
        this.kpiRejected.set(summary.rejected_vehicles);
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

  onVehicleTypeFilterChange(value: string | number): void {
    this.vehicleTypeFilter.set(String(value));
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onProvinceFilterChange(value: string | number): void {
    this.provinceFilter.set(String(value));
    this.districtFilter.set('all');
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onDistrictFilterChange(value: string | number): void {
    this.districtFilter.set(String(value));
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onApprovalFilterChange(value: string | number): void {
    this.approvalFilter.set(String(value));
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onVerificationFilterChange(value: string | number): void {
    this.verificationFilter.set(String(value));
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
    this.loadVehicles();
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.vehicleTypeFilter.set('all');
    this.provinceFilter.set('all');
    this.districtFilter.set('all');
    this.approvalFilter.set('all');
    this.verificationFilter.set('all');
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onRefresh(): void {
    this.isRefreshing.set(true);
    this.loadVehicles();
    this.loadKPIs();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadVehicles();
    }
  }

  // Modals & Inspection
  openDetail(vehicleId: number): void {
    this.isLoading.set(true);
    this.rentalsService.getRental(vehicleId).subscribe({
      next: (detail) => {
        this.selectedVehicle.set(detail);
        this.rentalsService.getRentalDocuments(vehicleId).subscribe({
          next: (docs) => {
            this.selectedVehicleDocs.set(docs);
            this.isLoading.set(false);
          },
          error: () => {
            this.selectedVehicleDocs.set([]);
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Failed to load vehicle details.');
      },
    });
  }

  closeDetail(): void {
    this.selectedVehicle.set(null);
    this.selectedVehicleDocs.set([]);
  }

  openReviewDialog(vehicle: AdminVehicleDetailResponse, decision: 'approved' | 'rejected' | 'suspended' = 'approved'): void {
    this.reviewingVehicle.set(vehicle);
    this.initialReviewDecision.set(decision);
  }

  closeReviewDialog(): void {
    this.reviewingVehicle.set(null);
  }

  // Document Verification
  onVerifyDoc(event: { vehicleId: number; docId: number; isVerified: boolean }): void {
    if (!this.canVerifyDocs()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to verify documents.');
      return;
    }

    this.isProcessingAction.set(true);
    this.rentalsService.verifyRentalDocument(event.vehicleId, event.docId, event.isVerified).subscribe({
      next: (updatedDoc) => {
        this.isProcessingAction.set(false);
        const docs = this.selectedVehicleDocs().map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
        this.selectedVehicleDocs.set(docs);

        // Update detail count
        const curr = this.selectedVehicle();
        if (curr) {
          curr.verified_documents_count = docs.filter((d) => d.is_verified).length;
          this.selectedVehicle.set({ ...curr });
        }
        this.loadVehicles();
        this.loadKPIs();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.errorMessage.set(err.message || 'Failed to update document verification status.');
      },
    });
  }

  // Review Confirmation
  onConfirmReview(event: { vehicleId: number; payload: AdminVehicleReviewRequest }): void {
    if (!this.canReview()) {
      this.errorMessage.set('HTTP 403 Forbidden: You do not have permission to review vehicle listings.');
      return;
    }

    this.isProcessingAction.set(true);
    this.rentalsService.reviewRental(event.vehicleId, event.payload).subscribe({
      next: (res) => {
        this.isProcessingAction.set(false);
        this.reviewingVehicle.set(null);
        this.selectedVehicle.set(null);
        this.successBanner.set(`Vehicle listing #${res.vehicle_id} has been ${res.approval_status}.`);
        setTimeout(() => this.successBanner.set(null), 4000);
        this.loadVehicles();
        this.loadKPIs();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        this.errorMessage.set(err.message || 'Failed to update vehicle listing approval.');
      },
    });
  }
}
