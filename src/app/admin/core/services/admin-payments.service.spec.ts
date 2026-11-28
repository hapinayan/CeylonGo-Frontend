import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminPaymentsService } from './admin-payments.service';

describe('AdminPaymentsService', () => {
  let service: AdminPaymentsService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'finance@ceylongo.lk',
    full_name: 'Finance Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getFinancialSummary: () => ({
      total_gross_booking_revenue: 1000,
      total_ceylongo_commission: 100,
      total_provider_liabilities: 800,
      total_verified_refunds: 0,
      total_settled_payouts: 500,
      pending_settlement_payouts: 300,
      total_advertising_revenue: 0,
      currency: 'LKR',
    }),
    getPayments: () => ({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminPaymentsService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminPaymentsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewPayments()).toBe(true);
    expect(service.canManageFinances()).toBe(true);
  });

  it('should query live financial summary endpoint', () => {
    service.getFinancialSummary().subscribe((res) => {
      expect(res.total_gross_booking_revenue).toBe(100000);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/admin/payments/summary'));
    expect(req.request.method).toBe('GET');
    req.flush({ total_gross_booking_revenue: 100000, currency: 'LKR' });
  });

  it('should query live payments endpoint', () => {
    service.getPayments({ status: 'captured' }).subscribe((res) => {
      expect(res.total).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/admin/payments'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('captured');
    req.flush({ items: [{ id: 1 }], total: 1, page: 1, page_size: 20, total_pages: 1 });
  });
});
