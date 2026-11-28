import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  ADMIN_DISTRICT_FILTER_OPTIONS,
  ADMIN_PROVINCE_FILTER_OPTIONS,
  getDistrictFilterOptionsByProvince,
  getProvinceByDistrict,
  PROVINCE_DISTRICT_MAP,
  SriLankaDistrictName,
  SriLankaProvince,
} from '../../core/constants/admin-districts.constants';
import {
  AdminTourGuideDetailResponse,
  AdminTourGuideListItem,
  CredentialVerifyPayload,
  TourGuideBadgePayload,
  TourGuideCredential,
  TourGuideKPIs,
  TourGuideQueryParams,
} from '../../core/models/admin-tour-guides.models';
import { AdminTourGuidesService } from '../../core/services/admin-tour-guides.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminCredentialVerifyDialogComponent } from './components/admin-credential-verify-dialog/admin-credential-verify-dialog.component';
import { AdminTourGuideDetailModalComponent } from './components/admin-tour-guide-detail-modal/admin-tour-guide-detail-modal.component';
import { AdminTourGuideRejectDialogComponent } from './components/admin-tour-guide-reject-dialog/admin-tour-guide-reject-dialog.component';

@Component({
  selector: 'app-admin-tour-guides',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminTourGuideDetailModalComponent,
    AdminTourGuideRejectDialogComponent,
    AdminCredentialVerifyDialogComponent,
  ],
  templateUrl: './admin-tour-guides.component.html',
  styleUrls: ['./admin-tour-guides.component.scss'],
})
export class AdminTourGuidesComponent implements OnInit, OnDestroy {
  private readonly tourGuidesService = inject(AdminTourGuidesService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly canView = this.tourGuidesService.canViewGuides;
  readonly canReview = this.tourGuidesService.canReviewGuides;
  readonly canVerify = this.tourGuidesService.canVerifyCredentials;

  guides: AdminTourGuideListItem[] = [];
  kpis: TourGuideKPIs = {
    total_guides: 0,
    active_guides: 0,
    pending_approval: 0,
    verified_guides: 0,
  };

  isLoading = false;
  isProcessing = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Search & Filters
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedProvince = 'all';
  selectedDistrict = 'all';
  selectedApproval = 'all';
  selectedVerification = 'all';

  provinceOptions: readonly AdminSelectOption[] = ADMIN_PROVINCE_FILTER_OPTIONS;
  districtOptions: readonly AdminSelectOption[] = ADMIN_DISTRICT_FILTER_OPTIONS;

  readonly approvalOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Approvals' },
    { key: 'pending', label: 'Pending Review', badgeColor: '#f59e0b' },
    { key: 'approved', label: 'Approved', badgeColor: '#10b981' },
    { key: 'rejected', label: 'Rejected', badgeColor: '#ef4444' },
    { key: 'suspended', label: 'Suspended', badgeColor: '#64748b' },
  ];

  readonly verificationOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Badges' },
    { key: 'verified', label: 'Verified Badge', badgeColor: '#0284c7' },
    { key: 'pending', label: 'Pending Verification', badgeColor: '#f59e0b' },
    { key: 'unverified', label: 'Unverified', badgeColor: '#94a3b8' },
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

  // Modals & Dialogs
  selectedGuideDetail: AdminTourGuideDetailResponse | null = null;
  isRejectDialogOpen = false;
  rejectActionType: 'reject' | 'suspend' = 'reject';
  targetGuideId: number | null = null;

  isVerifyDialogOpen = false;
  targetCredential: TourGuideCredential | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadGuides();
      });

    this.loadKPIs();
    this.loadGuides();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadKPIs(): void {
    this.tourGuidesService.getTourGuideKPIs().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.cdr.markForCheck();
      },
      error: () => {
        // Non-blocking
      },
    });
  }

  loadGuides(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const params: TourGuideQueryParams = {
      page: this.currentPage,
      page_size: this.pageSize,
      approval_status: this.selectedApproval !== 'all' ? this.selectedApproval : undefined,
      verification_status: this.selectedVerification !== 'all' ? this.selectedVerification : undefined,
      province: this.selectedProvince !== 'all' ? this.selectedProvince : undefined,
      district: this.selectedDistrict !== 'all' ? this.selectedDistrict : undefined,
      search: this.searchTerm.trim() || undefined,
    };

    this.tourGuidesService.getTourGuides(params).subscribe({
      next: (res) => {
        this.guides = res.items;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load tour guide directory.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onProvinceChange(value: string | number): void {
    this.selectedProvince = String(value);
    this.currentPage = 1;

    if (this.selectedProvince === 'all') {
      this.districtOptions = ADMIN_DISTRICT_FILTER_OPTIONS;
    } else {
      this.districtOptions = getDistrictFilterOptionsByProvince(this.selectedProvince);
      const districts = PROVINCE_DISTRICT_MAP[this.selectedProvince as SriLankaProvince] || [];
      if (this.selectedDistrict !== 'all' && !districts.includes(this.selectedDistrict as SriLankaDistrictName)) {
        this.selectedDistrict = 'all';
      }
    }
    this.loadGuides();
  }

  onDistrictChange(value: string | number): void {
    this.selectedDistrict = String(value);
    this.currentPage = 1;

    if (this.selectedDistrict !== 'all') {
      const parentProvince = getProvinceByDistrict(this.selectedDistrict);
      if (parentProvince && this.selectedProvince !== parentProvince) {
        this.selectedProvince = parentProvince;
        this.districtOptions = getDistrictFilterOptionsByProvince(parentProvince);
      }
    }
    this.loadGuides();
  }

  onApprovalChange(value: string | number): void {
    this.selectedApproval = String(value);
    this.currentPage = 1;
    this.loadGuides();
  }

  onVerificationChange(value: string | number): void {
    this.selectedVerification = String(value);
    this.currentPage = 1;
    this.loadGuides();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadGuides();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadGuides();
    }
  }

  refreshData(): void {
    this.loadKPIs();
    this.loadGuides();
  }

  // Inspection Modal
  openDetail(id: number): void {
    this.isLoading = true;
    this.tourGuidesService.getTourGuideById(id).subscribe({
      next: (detail) => {
        this.selectedGuideDetail = detail;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load tour guide details.';
        this.isLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.selectedGuideDetail = null;
  }

  // Review Actions
  approveGuide(id: number): void {
    if (!confirm('Are you sure you want to approve this tour guide profile for public discovery?')) {
      return;
    }

    this.isProcessing = true;
    this.tourGuidesService.approveTourGuide(id).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message || 'Tour guide approved successfully.';
        this.closeDetail();
        this.refreshData();
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to approve tour guide.';
      },
    });
  }

  openRejectDialog(id: number, actionType: 'reject' | 'suspend' = 'reject'): void {
    this.targetGuideId = id;
    this.rejectActionType = actionType;
    this.isRejectDialogOpen = true;
  }

  closeRejectDialog(): void {
    this.isRejectDialogOpen = false;
    this.targetGuideId = null;
  }

  confirmRejectOrSuspend(reason: string): void {
    if (!this.targetGuideId) return;

    this.isProcessing = true;
    const req =
      this.rejectActionType === 'reject'
        ? this.tourGuidesService.rejectTourGuide(this.targetGuideId, { reason })
        : this.tourGuidesService.suspendTourGuide(this.targetGuideId, { reason });

    req.subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message || `Tour guide ${this.rejectActionType}ed successfully.`;
        this.closeRejectDialog();
        this.closeDetail();
        this.refreshData();
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || `Failed to ${this.rejectActionType} tour guide.`;
      },
    });
  }

  // Verification Badge
  toggleGuideBadge(payload: { guideId: number; action: 'grant' | 'revoke' }): void {
    this.isProcessing = true;
    this.tourGuidesService.updateTourGuideBadge(payload.guideId, payload).subscribe({
      next: (res: any) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        if (this.selectedGuideDetail) {
          this.selectedGuideDetail.guide.verification_status = res.verification_status as any;
        }
        this.refreshData();
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to update guide badge.';
      },
    });
  }

  // Credential Verification
  openVerifyCredentialDialog(payload: { guideId: number; credential: TourGuideCredential }): void {
    this.targetGuideId = payload.guideId;
    this.targetCredential = payload.credential;
    this.isVerifyDialogOpen = true;
  }

  closeVerifyCredentialDialog(): void {
    this.isVerifyDialogOpen = false;
    this.targetCredential = null;
  }

  confirmCredentialVerification(payload: CredentialVerifyPayload): void {
    if (!this.targetCredential) return;

    this.isProcessing = true;
    this.tourGuidesService.verifyGuideCredential(this.targetCredential.id, payload).subscribe({
      next: (res: any) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        this.closeVerifyCredentialDialog();
        if (this.selectedGuideDetail) {
          this.openDetail(this.selectedGuideDetail.guide.id);
        }
        this.refreshData();
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to verify credential.';
      },
    });
  }
}
