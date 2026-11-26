import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminUser } from '../../core/models/admin-auth.models';
import {
  HomestayAdminDashboardResponse,
  HomestayListResponse,
  HomestayResponse,
} from '../../core/models/admin-homestays.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminHomestaysService } from '../../core/services/admin-homestays.service';
import { AdminHomestaysComponent } from './admin-homestays.component';

describe('AdminHomestaysComponent', () => {
  let component: AdminHomestaysComponent;
  let fixture: ComponentFixture<AdminHomestaysComponent>;
  let homestaysServiceMock: any;
  let authServiceMock: any;

  let userSignal = signal<AdminUser | null>({
    id: 1,
    full_name: 'Devin Rathnayake',
    email: 'devin@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  });

  const mockHomestays: HomestayResponse[] = [
    {
      id: 1,
      name: 'Kandy Lake Villa',
      description: 'Lakeside retreat',
      location: 'Kandy Lake Round',
      city: 'Kandy',
      district: 'Kandy',
      province: 'Central',
      price_per_night: 14500,
      max_guests: 4,
      is_active: true,
      approval_status: 'approved',
      verification_status: 'verified',
      created_at: '2026-11-20T10:00:00Z',
      images: [{ id: 1, homestay_id: 1, image_url: 'https://images.unsplash.com/photo-1', is_primary: true }],
      amenities: [{ id: 1, homestay_id: 1, amenity_name: 'Wi-Fi' }],
    },
    {
      id: 2,
      name: 'Ella Cloud View Cottage',
      description: 'Mountain homestay',
      location: 'Passara Road',
      city: 'Ella',
      district: 'Badulla',
      province: 'Uva',
      price_per_night: 9800,
      max_guests: 2,
      is_active: false,
      approval_status: 'pending',
      verification_status: 'pending',
      created_at: '2026-11-22T08:30:00Z',
      images: [],
      amenities: [],
    },
  ];

  const mockListResponse: HomestayListResponse = {
    items: mockHomestays,
    total: 2,
    page: 1,
    limit: 5,
    total_pages: 1,
  };

  const mockDashboard: HomestayAdminDashboardResponse = {
    listings: {
      total: 8,
      approved: 4,
      pending_approval: 2,
      draft: 0,
      rejected: 1,
      suspended: 1,
    },
    bookings: { total: 20, pending: 2, confirmed: 15, completed: 3, cancelled: 0, rejected: 0 },
    payments: { total_online_payments_count: 15, total_online_payments_volume: 250000, pending_refunds_count: 0, pending_refunds_volume: 0, currency: 'LKR' },
    campaigns: { total_campaigns: 1, active_campaigns: 1, pending_approval_campaigns: 0, total_campaign_budget: 25000, currency: 'LKR' },
    reviews: { total_reviews: 30, pending_moderation: 0, approved_reviews: 30, rejected_reviews: 0 },
  };

  beforeEach(async () => {
    userSignal = signal<AdminUser | null>({
      id: 1,
      full_name: 'Devin Rathnayake',
      email: 'devin@ceylongo.com',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
    });

    homestaysServiceMock = {
      getHomestays: vi.fn().mockReturnValue(of(mockListResponse)),
      getHomestayDashboard: vi.fn().mockReturnValue(of(mockDashboard)),
      reviewHomestay: vi.fn().mockReturnValue(of({ ...mockHomestays[1], approval_status: 'approved' })),
      verifyHomestay: vi.fn().mockReturnValue(of({ ...mockHomestays[1], verification_status: 'verified' })),
    };

    authServiceMock = {
      currentUser: userSignal,
      isDemoSession: () => true,
    };

    await TestBed.configureTestingModule({
      imports: [AdminHomestaysComponent],
      providers: [
        provideRouter([]),
        { provide: AdminHomestaysService, useValue: homestaysServiceMock },
        { provide: AdminAuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminHomestaysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create homestays component', () => {
    expect(component).toBeTruthy();
  });

  it('should render page title and dashboard breadcrumb link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Homestay Management');
    const breadcrumb = compiled.querySelector('.breadcrumb-link');
    expect(breadcrumb?.textContent).toContain('Dashboard');
  });

  it('should render summary KPI cards correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.kpiTotal()).toBe(8);
    expect(component.kpiApproved()).toBe(4);
    expect(component.kpiPending()).toBe(2);
    expect(component.kpiSuspended()).toBe(1);
    expect(component.kpiRejected()).toBe(1);

    expect(compiled.querySelector('.kpi-icon.total')).toBeTruthy();
    expect(compiled.querySelector('.kpi-icon.approved')).toBeTruthy();
    expect(compiled.querySelector('.kpi-icon.pending')).toBeTruthy();
  });

  it('should render table rows with homestay property details and badges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.homestay-row');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Kandy Lake Villa');
    expect(rows[0].textContent).toContain('Approved');
    expect(rows[0].textContent).toContain('Verified');

    expect(rows[1].textContent).toContain('Ella Cloud View Cottage');
    expect(rows[1].textContent).toContain('Pending');
  });

  it('should handle search input with debounce', async () => {
    component.onSearchInput('Kandy');
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    expect(homestaysServiceMock.getHomestays).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Kandy' })
    );
  });

  it('should render all 9 official Sri Lankan provinces plus All Provinces option', () => {
    expect(component.provinceOptions.length).toBe(10);
    expect(component.provinceOptions[0]).toEqual({ key: 'all', label: 'All Provinces' });
    expect(component.provinceOptions.map((o) => o.key)).toContain('Western');
    expect(component.provinceOptions.map((o) => o.key)).toContain('Northern');
    expect(component.provinceOptions.map((o) => o.key)).toContain('Central');
  });

  it('should disable district selector and show hint when All Provinces is selected', () => {
    component.provinceFilter.set('all');
    fixture.detectChanges();

    expect(component.isDistrictDisabled()).toBe(true);
    expect(component.districtOptions().length).toBe(1);
    expect(component.districtOptions()[0]).toEqual({ key: 'all', label: 'All Districts' });
  });

  it('should update dependent districts when a province is selected and enable district selector', () => {
    component.onProvinceFilterChange('Western');
    fixture.detectChanges();

    expect(component.provinceFilter()).toBe('Western');
    expect(component.isDistrictDisabled()).toBe(false);
    expect(component.districtOptions().length).toBe(4); // all + Colombo, Gampaha, Kalutara
    expect(component.districtOptions().map((o) => o.key)).toEqual(['all', 'Colombo', 'Gampaha', 'Kalutara']);
    expect(homestaysServiceMock.getHomestays).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'Western', page: 1 })
    );

    // Northern province has 5 districts
    component.onProvinceFilterChange('Northern');
    fixture.detectChanges();

    expect(component.provinceFilter()).toBe('Northern');
    expect(component.districtOptions().length).toBe(6); // all + 5 districts
    expect(component.districtOptions().map((o) => o.key)).toEqual([
      'all',
      'Jaffna',
      'Kilinochchi',
      'Mannar',
      'Mullaitivu',
      'Vavuniya',
    ]);
  });

  it('should reset district to All Districts when province changes or resets', () => {
    component.onProvinceFilterChange('Western');
    component.onDistrictFilterChange('Colombo');
    expect(component.districtFilter()).toBe('Colombo');

    // Changing province to Central resets district to 'all'
    component.onProvinceFilterChange('Central');
    expect(component.districtFilter()).toBe('all');
    expect(component.districtOptions().map((o) => o.key)).toEqual(['all', 'Kandy', 'Matale', 'Nuwara Eliya']);

    // Changing province to 'all' resets and disables district
    component.onProvinceFilterChange('all');
    expect(component.districtFilter()).toBe('all');
    expect(component.isDistrictDisabled()).toBe(true);
  });

  it('should filter homestays by district', () => {
    component.onProvinceFilterChange('Central');
    component.onDistrictFilterChange('Kandy');
    fixture.detectChanges();

    expect(homestaysServiceMock.getHomestays).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'Central', district: 'Kandy', page: 1 })
    );
  });

  it('should filter homestays by verification status and reset page to 1', () => {
    component.currentPage.set(2);
    component.onVerificationFilterChange('verified');
    fixture.detectChanges();

    expect(component.verificationFilter()).toBe('verified');
    expect(component.currentPage()).toBe(1);
    expect(homestaysServiceMock.getHomestays).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: 'verified', page: 1 })
    );
  });

  it('should pass combined search, district, status, and verification filters to getHomestays', () => {
    component.searchInput.set('Heritage');
    component.districtFilter.set('Galle');
    component.statusFilter.set('approved');
    component.verificationFilter.set('verified');
    component.currentPage.set(1);

    component.loadHomestays();
    fixture.detectChanges();

    expect(homestaysServiceMock.getHomestays).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Heritage',
        district: 'Galle',
        status: 'approved',
        verification_status: 'verified',
        page: 1,
      })
    );
  });

  it('should render clean empty state message when no homestays match filters', () => {
    homestaysServiceMock.getHomestays.mockReturnValue(
      of({ items: [], total: 0, page: 1, limit: 5, total_pages: 1 })
    );
    component.loadHomestays();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyRow = compiled.querySelector('.empty-row');
    expect(emptyRow).toBeTruthy();
    expect(emptyRow?.textContent).toContain('No homestays found matching your filters');
    expect(emptyRow?.textContent).toContain('No properties match your current search, district, or status filter settings.');
  });

  it('should clear all filters including province and district and reset search', () => {
    component.searchInput.set('Ella');
    component.provinceFilter.set('Uva');
    component.districtFilter.set('Badulla');
    component.statusFilter.set('pending');
    component.verificationFilter.set('verified');

    component.clearFilters();
    fixture.detectChanges();

    expect(component.searchInput()).toBe('');
    expect(component.provinceFilter()).toBe('all');
    expect(component.districtFilter()).toBe('all');
    expect(component.statusFilter()).toBe('all');
    expect(component.verificationFilter()).toBe('all');
    expect(component.currentPage()).toBe(1);
    expect(component.isDistrictDisabled()).toBe(true);
  });

  it('should open and close the Detail Inspection Modal', () => {
    expect(component.selectedHomestay()).toBeNull();

    component.openDetailModal(mockHomestays[0]);
    fixture.detectChanges();
    expect(component.selectedHomestay()?.id).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-admin-homestay-detail-modal')).toBeTruthy();

    component.closeDetailModal();
    fixture.detectChanges();
    expect(component.selectedHomestay()).toBeNull();
    expect(compiled.querySelector('app-admin-homestay-detail-modal')).toBeNull();
  });

  it('should open Review Dialog and submit approved decision', () => {
    component.openReviewDialog(mockHomestays[1]);
    fixture.detectChanges();
    expect(component.reviewingHomestay()?.id).toBe(2);

    component.submitReviewDecision({ decision: 'approved' });
    fixture.detectChanges();

    expect(homestaysServiceMock.reviewHomestay).toHaveBeenCalledWith(2, { decision: 'approved' });
    expect(component.reviewingHomestay()).toBeNull();
    expect(component.successBanner()).toContain('status updated');
  });

  it('should open Verification Dialog and submit physical verification status', () => {
    component.openVerifyDialog(mockHomestays[1]);
    fixture.detectChanges();
    expect(component.verifyingHomestay()?.id).toBe(2);

    component.submitVerifyDecision({ verification_status: 'verified', notes: 'Inspected on-site' });
    fixture.detectChanges();

    expect(homestaysServiceMock.verifyHomestay).toHaveBeenCalledWith(2, {
      verification_status: 'verified',
      notes: 'Inspected on-site',
    });
    expect(component.verifyingHomestay()).toBeNull();
    expect(component.successBanner()).toContain('physical verification updated');
  });

  it('should trigger manual refresh when Refresh Data button is clicked', () => {
    const refreshBtn = fixture.nativeElement.querySelector('#btn-refresh-homestays') as HTMLButtonElement;
    expect(refreshBtn).toBeTruthy();

    refreshBtn.click();
    fixture.detectChanges();

    expect(homestaysServiceMock.getHomestays).toHaveBeenCalled();
    expect(homestaysServiceMock.getHomestayDashboard).toHaveBeenCalled();
    expect(component.lastRefreshed()).toBeTruthy();
  });

  it('should hide review and verify action buttons for viewer role', () => {
    userSignal.set({
      id: 9,
      full_name: 'Viewer',
      email: 'viewer@ceylongo.com',
      role: 'viewer',
      admin_role: 'viewer',
      is_active: true,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const reviewBtn = compiled.querySelector('.btn-review');
    const verifyBtn = compiled.querySelector('.btn-verify');

    expect(reviewBtn).toBeNull();
    expect(verifyBtn).toBeNull();

    // Inspect button remains available for viewer
    const inspectBtn = compiled.querySelector('.btn-inspect');
    expect(inspectBtn).toBeTruthy();
  });

  it('should display error banner when homestay listing retrieval fails', () => {
    homestaysServiceMock.getHomestays.mockReturnValue(
      throwError(() => new Error('Connection refused'))
    );

    component.loadHomestays();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Connection refused');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notification-banner.error')).toBeTruthy();
  });
});
