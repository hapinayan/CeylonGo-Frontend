import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminBookingsService } from './admin-bookings.service';

describe('AdminBookingsService', () => {
  let service: AdminBookingsService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Support Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getBookings: () => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    getBookingById: () => ({ id: 1, booking_reference: 'BK-01' }),
    getBookingKPIs: () => ({
      total_bookings: 10,
      confirmed_bookings: 6,
      pending_bookings: 2,
      completed_bookings: 1,
      cancelled_or_disputed: 1,
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminBookingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminBookingsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewBookings()).toBe(true);
  });

  it('should query live bookings endpoint', () => {
    service.getBookings({ status: 'confirmed' }).subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.items[0].booking_reference).toBe('BK-TG-101');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/admin/bookings'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('booking_status')).toBe('confirmed');
    req.flush({
      items: [
        {
          id: 101,
          booking_reference: 'BK-TG-101',
          traveler_id: 1,
          traveler_name: 'John Doe',
          traveler_email: 'john@example.com',
          tour_guide_id: 5,
          guide_name: 'Dinesh',
          tour_date: '2026-04-10',
          total_amount: 15000,
          currency: 'LKR',
          booking_status: 'confirmed',
          payment_status: 'captured',
          payment_method: 'online',
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
  });

  it('should query live booking KPIs summary endpoint', () => {
    service.getBookingKPIs().subscribe((kpi) => {
      expect(kpi.total_bookings).toBe(10);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/admin/bookings/summary'));
    expect(req.request.method).toBe('GET');
    req.flush({
      total_bookings: 10,
      confirmed_bookings: 6,
      pending_bookings: 2,
      completed_bookings: 1,
      cancelled_or_disputed: 1,
    });
  });
});
