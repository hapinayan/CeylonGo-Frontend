import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../../core/models/admin-auth.models';
import {
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleListItem,
} from '../../core/models/admin-rentals.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminRentalsService } from '../../core/services/admin-rentals.service';
import { AdminRentalsComponent } from './admin-rentals.component';

describe('AdminRentalsComponent', () => {
  let component: AdminRentalsComponent;
  let fixture: ComponentFixture<AdminRentalsComponent>;

  let currentUser: AdminUser | null = {
    id: 1,
    email: 'admin@ceylongo.com',
    full_name: 'Lead Operations Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  };

  const sampleVehicle: AdminVehicleListItem = {
    id: 1,
    provider_id: 3,
    provider_business_name: 'Southern Coastal Bike Rentals',
    vehicle_name: 'Honda Scoopy 110cc Automatic Scooter',
    vehicle_type: 'bike',
    license_plate: 'SP-BC-4412',
    price_per_day: 2500,
    district: 'Galle',
    province: 'Southern',
    status: 'available',
    approval_status: 'pending',
    verification_status: 'unverified',
    created_at: '2026-03-22T08:00:00Z',
  };

  const sampleVehicleDetail: AdminVehicleDetailResponse = {
    ...sampleVehicle,
    images_count: 3,
    documents_count: 2,
    verified_documents_count: 1,
  };

  const sampleDoc: AdminVehicleDocumentItem = {
    id: 101,
    vehicle_id: 1,
    document_type: 'revenue_license',
    document_url: 'https://cdn.ceylongo.com/docs/rev-101.svg',
    is_verified: true,
  };

  const mockRentalsService = {
    getRentals: () =>
      of({
        items: [sampleVehicle],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      }),
    getRental: () => of(sampleVehicleDetail),
    getRentalDocuments: () => of([sampleDoc]),
    getFleetSummary: () =>
      of({
        total_vehicles: 1,
        pending_approval: 1,
        approved_vehicles: 0,
        verified_vehicles: 0,
        rejected_vehicles: 0,
        total_providers: 1,
      }),
    reviewRental: (id: number, payload: { decision: string }) =>
      of({
        success: true,
        vehicle_id: id,
        approval_status: payload.decision as any,
        message: 'Review completed',
      }),
    verifyRentalDocument: (vId: number, dId: number, isVerified: boolean) =>
      of({ ...sampleDoc, is_verified: isVerified }),
  };

  const mockAuthService = {
    currentUser: () => currentUser,
    isDemoSession: () => false,
  };

  beforeEach(async () => {
    currentUser = {
      id: 1,
      email: 'admin@ceylongo.com',
      full_name: 'Lead Operations Admin',
      role: 'admin',
      admin_role: 'admin',
      is_active: true,
    };

    await TestBed.configureTestingModule({
      imports: [AdminRentalsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminRentalsService, useValue: mockRentalsService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRentalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load vehicles and fleet summary', () => {
    expect(component.vehicles().length).toBe(1);
    expect(component.vehicles()[0].vehicle_name).toBe('Honda Scoopy 110cc Automatic Scooter');
    expect(component.kpiTotal()).toBe(1);
    expect(component.kpiPending()).toBe(1);
  });

  it('should have district selector disabled when province is "all"', () => {
    expect(component.provinceFilter()).toBe('all');
    expect(component.isDistrictDisabled()).toBe(true);
  });

  it('should enable district selector when a province is chosen', () => {
    component.onProvinceFilterChange('Southern');
    expect(component.provinceFilter()).toBe('Southern');
    expect(component.districtFilter()).toBe('all');
    expect(component.isDistrictDisabled()).toBe(false);
    expect(component.districtOptions().length).toBe(4); // All Districts + Galle, Hambantota, Matara
  });

  it('should update vehicle type filter', () => {
    component.onVehicleTypeFilterChange('bike');
    expect(component.vehicleTypeFilter()).toBe('bike');
    expect(component.currentPage()).toBe(1);
  });

  it('should update approval status filter', () => {
    component.onApprovalFilterChange('pending');
    expect(component.approvalFilter()).toBe('pending');
  });

  it('should update verification status filter', () => {
    component.onVerificationFilterChange('verified');
    expect(component.verificationFilter()).toBe('verified');
  });

  it('should clear all filters', () => {
    component.onVehicleTypeFilterChange('bike');
    component.onProvinceFilterChange('Southern');
    component.clearFilters();

    expect(component.vehicleTypeFilter()).toBe('all');
    expect(component.provinceFilter()).toBe('all');
    expect(component.districtFilter()).toBe('all');
    expect(component.approvalFilter()).toBe('all');
    expect(component.verificationFilter()).toBe('all');
    expect(component.searchInput()).toBe('');
  });

  it('should open and close vehicle detail modal', () => {
    component.openDetail(1);
    expect(component.selectedVehicle()).toEqual(sampleVehicleDetail);

    component.closeDetail();
    expect(component.selectedVehicle()).toBeNull();
  });

  it('should open and close review dialog', () => {
    component.openReviewDialog(sampleVehicleDetail, 'approved');
    expect(component.reviewingVehicle()).toEqual(sampleVehicleDetail);
    expect(component.initialReviewDecision()).toBe('approved');

    component.closeReviewDialog();
    expect(component.reviewingVehicle()).toBeNull();
  });

  it('should submit review decision', () => {
    component.onConfirmReview({
      vehicleId: 1,
      payload: { decision: 'approved' },
    });
    expect(component.successBanner()).toContain('approved');
  });

  it('should verify document and update state', () => {
    component.selectedVehicle.set(sampleVehicleDetail);
    component.selectedVehicleDocs.set([sampleDoc]);

    component.onVerifyDoc({ vehicleId: 1, docId: 101, isVerified: true });
    expect(component.selectedVehicleDocs()[0].is_verified).toBe(true);
  });
});
