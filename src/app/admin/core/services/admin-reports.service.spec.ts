import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'ops@ceylongo.lk',
    full_name: 'Operations Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getAnalyticsOverview: () => ({
      total_travelers: 100,
      active_travelers: 80,
      total_providers: 20,
      verified_providers: 18,
      total_revenue_lkr: 500000,
      commission_revenue_lkr: 50000,
      period: 'Q1',
      category_distribution: [],
      recent_booking_volume: [],
    }),
    getBookingVolume: () => ({
      module: 'homestay' as const,
      created_from: '2026-03-01T00:00:00Z',
      created_before: '2026-03-26T00:00:00Z',
      total: 10,
      by_status: [],
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminReportsService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminReportsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewReports()).toBe(true);
  });

  it('should query live booking volume endpoint', () => {
    service.getBookingVolume('homestay', '2026-03-01', '2026-03-26').subscribe((res) => {
      expect(res.total).toBe(12);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/reports/booking-volume'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('module')).toBe('homestay');
    req.flush({ module: 'homestay', created_from: '2026-03-01', created_before: '2026-03-26', total: 12, by_status: [] });
  });
});
