import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import {
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleListResponse,
} from '../models/admin-rentals.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminRentalsService } from './admin-rentals.service';

describe('AdminRentalsService', () => {
  let service: AdminRentalsService;
  let httpMock: HttpTestingController;

  let isDemo = false;
  let currentUser: AdminUser | null = {
    id: 1,
    email: 'admin@ceylongo.com',
    full_name: 'Lead Operations Admin',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  };

  const mockAuthService = {
    isDemoSession: () => isDemo,
    isAuthenticated: () => true,
    currentUser: () => currentUser,
    currentToken: () => 'valid-jwt-token',
  };

  const sampleVehicleDetail: AdminVehicleDetailResponse = {
    id: 1,
    provider_id: 3,
    provider_business_name: 'Southern Coastal Bike Rentals',
    vehicle_name: 'Honda Scoopy 110cc Automatic Scooter',
    vehicle_type: 'bike',
    model_year: 2024,
    license_plate: 'SP-BC-4412',
    seating_capacity: 2,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    price_per_day: 2500,
    district: 'Galle',
    city: 'Galle',
    status: 'available',
    approval_status: 'pending',
    verification_status: 'unverified',
    images_count: 3,
    documents_count: 2,
    verified_documents_count: 0,
  };

  const sampleDoc: AdminVehicleDocumentItem = {
    id: 101,
    vehicle_id: 1,
    document_type: 'revenue_license',
    document_url: 'https://cdn.ceylongo.com/docs/rev-101.svg',
    is_verified: true,
  };

  const mockPreviewState = {
    getRentals: () => ({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    }),
    getRental: () => sampleVehicleDetail,
    reviewRental: () => ({
      success: true,
      vehicle_id: 1,
      approval_status: 'approved' as const,
      message: 'Approved',
    }),
    getRentalDocuments: () => [sampleDoc],
    verifyRentalDocument: () => sampleDoc,
    verifyRentalStatus: () => ({
      success: true,
      vehicle_id: 1,
      verification_status: 'verified' as const,
      message: 'Verified',
    }),
    getRentalFleetSummary: () => ({
      total_vehicles: 8,
      pending_approval: 2,
      approved_vehicles: 5,
      verified_vehicles: 4,
      rejected_vehicles: 1,
      total_providers: 3,
    }),
  };

  beforeEach(() => {
    isDemo = false;
    currentUser = {
      id: 1,
      email: 'admin@ceylongo.com',
      full_name: 'Lead Operations Admin',
      role: 'operations_admin',
      admin_role: 'operations_admin',
      is_active: true,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminRentalsService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminRentalsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should enforce RBAC: reject unauthorized support_admin from viewing rental fleet', async () => {
    currentUser = {
      id: 2,
      email: 'support@ceylongo.com',
      full_name: 'Support Officer',
      role: 'support_admin',
      admin_role: 'support_admin',
      is_active: true,
    };

    let errorThrown: any = null;
    try {
      await new Promise((resolve, reject) => {
        service.getRentals().subscribe({
          next: resolve,
          error: reject,
        });
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeTruthy();
    expect(errorThrown.message).toContain('HTTP 403 Forbidden');
  });

  it('should query live rentals endpoint with query parameters in non-preview mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.getRentals({ page: 1, page_size: 20, vehicle_type: 'bike' }).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${environment.apiBaseUrl}/admin/rentals/vehicles` &&
      r.params.get('vehicle_type') === 'bike' &&
      r.params.get('page') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        {
          id: 1,
          provider_id: 3,
          provider_business_name: 'Southern Coastal Bike Rentals',
          vehicle_name: 'Honda Scoopy 110cc Automatic Scooter',
          vehicle_type: 'bike',
          license_plate: 'SP-BC-4412',
          price_per_day: 2500,
          district: 'Galle',
          status: 'available',
          approval_status: 'pending',
          verification_status: 'unverified',
          created_at: '2026-03-22T08:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    } as AdminVehicleListResponse);

    const res = await promise;
    expect(res.items.length).toBe(1);
    expect(res.items[0].vehicle_name).toBe('Honda Scoopy 110cc Automatic Scooter');
  });

  it('should delegate to preview state in preview mode', async () => {
    isDemo = true;

    const res = await new Promise<any>((resolve, reject) => {
      service.getRentals().subscribe({
        next: resolve,
        error: reject,
      });
    });

    expect(res).toBeTruthy();
    expect(res.items).toEqual([]);
  });

  it('should review vehicle listing in live mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.reviewRental(1, { decision: 'approved' }).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne({
      method: 'POST',
      url: `${environment.apiBaseUrl}/admin/rentals/vehicles/1/review`,
    });
    expect(req.request.body).toEqual({ decision: 'approved' });
    req.flush({
      success: true,
      vehicle_id: 1,
      approval_status: 'approved',
      message: 'Vehicle listing has been approved.',
    });

    const res = await promise;
    expect(res.approval_status).toBe('approved');
  });

  it('should verify document in live mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.verifyRentalDocument(1, 101, true, 'Valid revenue license').subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne({
      method: 'POST',
      url: `${environment.apiBaseUrl}/admin/rentals/vehicles/1/documents/101/verify`,
    });
    expect(req.request.body).toEqual({ is_verified: true, verification_notes: 'Valid revenue license' });
    req.flush(sampleDoc);

    const doc = await promise;
    expect(doc.is_verified).toBe(true);
  });
});
