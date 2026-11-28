import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminAuthService } from './admin-auth.service';
import { AdminBookingsService } from './admin-bookings.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminListingDirectoryService } from './admin-listing-directory.service';
import { environment } from '../../../../environments/environment';

describe('Admin live integration', () => {
  let http: HttpTestingController;
  const base = environment.apiBaseUrl + '/admin';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AdminAuthService, useValue: { currentUser: signal(null) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders dashboard metrics from HTTP and exposes backend failures', () => {
    let status: number | undefined;
    TestBed.inject(AdminDashboardService).getDashboard().subscribe({
      next: () => { throw new Error('Expected HTTP failure'); },
      error: (err) => { status = err.status; },
    });
    http.expectOne(base + '/dashboard').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });

  it('queries bookings across categories and uses persisted KPI responses', () => {
    const service = TestBed.inject(AdminBookingsService);
    let count: number | undefined;
    service.getBookings({ category: 'rental', status: 'pending', page: 2 }).subscribe();
    const request = http.expectOne((req) => req.url === base + '/bookings');
    expect(request.request.params.get('category')).toBe('rental');
    expect(request.request.params.get('booking_status')).toBe('pending');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], total: 0, page: 2, page_size: 20, total_pages: 0 });

    service.getBookingKPIs().subscribe((kpis) => { count = kpis.confirmed_bookings; });
    http.expectOne(base + '/bookings/summary').flush({ confirmed_bookings: 7 });
    expect(count).toBe(7);
  });

  it('preserves empty successful listing pages and ignores all selectors', () => {
    const directory = TestBed.inject(AdminListingDirectoryService);
    let total: number | undefined;
    directory.list('homestay', (item) => item.listing, { status: 'all', district: 'Kandy' })
      .subscribe((page) => { total = page.total; });
    const request = http.expectOne((req) => req.url === base + '/listing-directory');
    expect(request.request.params.get('category')).toBe('homestay');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.get('district')).toBe('Kandy');
    request.flush({ items: [], total: 0 });
    expect(total).toBe(0);
  });
});
