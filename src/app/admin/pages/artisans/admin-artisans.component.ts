import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
  AdminArtisanBusinessKPIs,
  AdminArtisanListingItem,
  AdminArtisanProductItem,
  AdminArtisanReviewItem,
  ArtisanQueryParams,
} from '../../core/models/admin-artisans.models';
import { AdminArtisansService } from '../../core/services/admin-artisans.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminArtisanDetailModalComponent } from './components/admin-artisan-detail-modal/admin-artisan-detail-modal.component';
import { AdminArtisanRejectDialogComponent } from './components/admin-artisan-reject-dialog/admin-artisan-reject-dialog.component';

@Component({
  selector: 'app-admin-artisans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminSelectComponent,
    AdminArtisanDetailModalComponent,
    AdminArtisanRejectDialogComponent,
  ],
  templateUrl: './admin-artisans.component.html',
  styleUrls: ['./admin-artisans.component.scss'],
})
export class AdminArtisansComponent implements OnInit, OnDestroy {
  private readonly artisansService = inject(AdminArtisansService);

  readonly canView = this.artisansService.canViewArtisans;
  readonly canReview = this.artisansService.canReviewArtisans;
  readonly canModerate = this.artisansService.canModerateReviews;

  listings: AdminArtisanListingItem[] = [];
  kpis: AdminArtisanBusinessKPIs = {
    total_businesses: 0,
    approved_count: 0,
    pending_count: 0,
    rejected_count: 0,
    suspended_count: 0,
    verified_count: 0,
    featured_count: 0,
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
  selectedCategory = 'all';
  selectedStatus = 'all';

  provinceOptions: readonly AdminSelectOption[] = ADMIN_PROVINCE_FILTER_OPTIONS;
  districtOptions: readonly AdminSelectOption[] = ADMIN_DISTRICT_FILTER_OPTIONS;

  readonly categoryOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Craft Categories' },
    { key: 'handicrafts', label: 'Handicrafts' },
    { key: 'textiles', label: 'Textiles & Handloom' },
    { key: 'pottery', label: 'Pottery & Ceramics' },
    { key: 'woodwork', label: 'Woodwork & Carving' },
    { key: 'jewelry', label: 'Jewelry & Gemstones' },
    { key: 'tea_spices', label: 'Tea & Spices' },
    { key: 'leather', label: 'Leathercraft' },
    { key: 'other', label: 'Other Crafts' },
  ];

  readonly statusOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'pending', label: 'Pending Review', badgeColor: '#f59e0b' },
    { key: 'approved', label: 'Approved', badgeColor: '#10b981' },
    { key: 'rejected', label: 'Rejected', badgeColor: '#ef4444' },
    { key: 'suspended', label: 'Suspended', badgeColor: '#64748b' },
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
  selectedListing: AdminArtisanListingItem | null = null;
  selectedProducts: AdminArtisanProductItem[] = [];
  selectedReviews: AdminArtisanReviewItem[] = [];

  isRejectDialogOpen = false;
  rejectActionType: 'reject' | 'suspend' = 'reject';
  targetListingId: number | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadListings();
      });

    this.loadKPIs();
    this.loadListings();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadKPIs(): void {
    this.artisansService.getArtisanKPIs().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
      },
      error: () => {
        // Non-blocking
      },
    });
  }

  loadListings(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const params: ArtisanQueryParams = {
      page: this.currentPage,
      limit: this.pageSize,
      status: this.selectedStatus !== 'all' ? this.selectedStatus : undefined,
      craft_category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined,
      province: this.selectedProvince !== 'all' ? this.selectedProvince : undefined,
      district: this.selectedDistrict !== 'all' ? this.selectedDistrict : undefined,
      search: this.searchTerm.trim() || undefined,
    };

    this.artisansService.getArtisanListings(params).subscribe({
      next: (items) => {
        this.listings = items;
        this.totalItems = items.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load artisan business listings.';
        this.isLoading = false;
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
    this.loadListings();
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
    this.loadListings();
  }

  onCategoryChange(value: string | number): void {
    this.selectedCategory = String(value);
    this.currentPage = 1;
    this.loadListings();
  }

  onStatusChange(value: string | number): void {
    this.selectedStatus = String(value);
    this.currentPage = 1;
    this.loadListings();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadListings();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadListings();
    }
  }

  refreshData(): void {
    this.loadKPIs();
    this.loadListings();
  }

  // Inspection Modal
  openDetail(id: number): void {
    this.isLoading = true;
    this.artisansService.getArtisanListingById(id).subscribe({
      next: (listing) => {
        this.selectedListing = listing;
        this.artisansService.getShowcaseProducts({ listing_id: id }).subscribe({
          next: (prods) => (this.selectedProducts = prods),
        });
        this.artisansService.getReviews(id).subscribe({
          next: (revs) => (this.selectedReviews = revs),
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load artisan listing details.';
        this.isLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.selectedListing = null;
    this.selectedProducts = [];
    this.selectedReviews = [];
  }

  // Approval / Rejection / Suspension
  approveListing(id: number): void {
    if (!confirm('Approve this artisan business listing to publish it to the public catalog?')) {
      return;
    }

    this.isProcessing = true;
    this.artisansService.approveListing(id).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message || 'Artisan business approved successfully.';
        this.closeDetail();
        this.refreshData();
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to approve artisan listing.';
      },
    });
  }

  openRejectDialog(id: number, actionType: 'reject' | 'suspend' = 'reject'): void {
    this.targetListingId = id;
    this.rejectActionType = actionType;
    this.isRejectDialogOpen = true;
  }

  closeRejectDialog(): void {
    this.isRejectDialogOpen = false;
    this.targetListingId = null;
  }

  confirmRejectOrSuspend(reason: string): void {
    if (!this.targetListingId) return;

    this.isProcessing = true;
    const req =
      this.rejectActionType === 'reject'
        ? this.artisansService.rejectListing(this.targetListingId, { reason })
        : this.artisansService.suspendListing(this.targetListingId, { reason });

    req.subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message || `Listing ${this.rejectActionType}ed successfully.`;
        this.closeRejectDialog();
        this.closeDetail();
        this.refreshData();
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || `Failed to ${this.rejectActionType} listing.`;
      },
    });
  }

  toggleFeature(payload: { id: number; isFeatured: boolean }): void {
    this.isProcessing = true;
    this.artisansService.featureListing(payload.id, payload.isFeatured).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        if (this.selectedListing) {
          this.selectedListing.is_featured = payload.isFeatured;
        }
        this.refreshData();
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to update featured status.';
      },
    });
  }

  approveProduct(productId: number): void {
    this.isProcessing = true;
    this.artisansService.approveProduct(productId).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        const p = this.selectedProducts.find((item) => item.id === productId);
        if (p) p.approval_status = 'approved';
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to approve showcase product.';
      },
    });
  }

  rejectProduct(productId: number): void {
    this.isProcessing = true;
    this.artisansService.rejectProduct(productId, { reason: 'Specification non-conformity' }).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        const p = this.selectedProducts.find((item) => item.id === productId);
        if (p) p.approval_status = 'rejected';
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to reject showcase product.';
      },
    });
  }

  toggleReviewPublish(payload: { reviewId: number; isPublished: boolean }): void {
    this.isProcessing = true;
    this.artisansService.moderateReview(payload.reviewId, { is_published: payload.isPublished }).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.successMessage = res.message;
        const r = this.selectedReviews.find((item) => item.id === payload.reviewId);
        if (r) r.is_published = payload.isPublished;
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err?.message || 'Failed to moderate review.';
      },
    });
  }
}
