import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminArtisansService } from './admin-artisans.service';
import { AdminAuthService } from './admin-auth.service';

describe('AdminArtisansService', () => {
  let service: AdminArtisansService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Operations Admin',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getArtisanListings: () => [],
    getArtisanListingById: () => ({ id: 1 }),
    approveArtisanListing: () => ({ success: true, id: 1, message: 'Approved' }),
    rejectArtisanListing: () => ({ success: true, id: 1, message: 'Rejected' }),
    getArtisanKPIs: () => ({
      total_businesses: 8,
      approved_count: 4,
      pending_count: 2,
      rejected_count: 1,
      suspended_count: 1,
      verified_count: 4,
      featured_count: 2,
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminArtisansService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminArtisansService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewArtisans()).toBe(true);
    expect(service.canReviewArtisans()).toBe(true);
  });

  it('should query live artisan listings endpoint', () => {
    service.getArtisanListings({ status: 'pending' }).subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/artisan/listings'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('pending');
    req.flush([{ id: 1, title: 'Kandy Brass' }]);
  });

  it('should call approve listing endpoint', () => {
    service.approveListing(1).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/api/v1/admin/artisan/listings/1/approve'));
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, id: 1, message: 'Approved' });
  });

  it('should delegate to preview state in demo mode', () => {
    mockAuthService.isDemoSession = () => true;

    service.getArtisanKPIs().subscribe((kpis) => {
      expect(kpis.total_businesses).toBe(8);
    });

    mockAuthService.isDemoSession = () => false;
  });
});
