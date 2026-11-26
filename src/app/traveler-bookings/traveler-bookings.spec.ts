import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { TravelerBackNavigationService } from '../core/services/traveler-back-navigation.service';
import { User } from '../core/models/auth.models';
import { adapt, SharedBookingResponse } from './booking-api';
import { bookingGroup, bookingKey, matchesBooking, uniqueBookings } from './booking-model';
import { canSimulateCancellation } from './booking-preview.development';
import { travelerBookingRoutes } from './booking.routes';

@Component({ template: '<p>Home page</p>' })
class HomeStub {}

const user = (id: number, role = 'traveler'): User => ({
  id, role, full_name: 'Test Traveler ' + id, email: 'synthetic@example.test', is_active: true, created_at: '',
});
const base = environment.apiBaseUrl;
const homestayRow: SharedBookingResponse = {
  id: 4,
  listing_id: 15,
  booking_reference: 'HS-4',
  starts_at: '2095-11-26T14:00:00Z',
  ends_at: '2095-11-28T11:00:00Z',
  quantity: 2,
  total_amount: '9000.50',
  currency: 'LKR',
  status: 'confirmed',
};
const rentalRow: SharedBookingResponse = {
  id: 4,
  listing_id: 12,
  booking_reference: 'RB-4',
  starts_at: '2020-11-25T09:00:00Z',
  ends_at: '2020-11-26T09:00:00Z',
  quantity: 1,
  total_amount: '2300.00',
  currency: 'LKR',
  status: 'completed',
  rental_unit_ids: [31],
  payments: [
    {
      id: 9,
      booking_id: 4,
      request_key: 'req-4',
      attempt_no: 1,
      method: 'simulated',
      status: 'demo_succeeded',
      display_amount: '2300.00',
      currency: 'LKR',
      created_at: '2020-11-25T08:50:00Z',
    },
  ],
};

const sharedCategories = ['homestay', 'adventure', 'guide', 'bike', 'bicycle'];

describe('Traveler Bookings', () => {
  const identity = signal<User | null>(null);
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const expectShared = (category: string) =>
    http.expectOne(r => r.url === base + '/bookings/my' && r.params.get('category') === category);
  const body = () => harness.routeNativeElement?.textContent ?? '';

  beforeEach(async () => {
    identity.set(null);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter([
        { path: '', component: HomeStub },
        { path: 'auth', component: HomeStub },
        { path: 'provider/dashboard', component: HomeStub },
        { path: 'my-bookings', children: travelerBookingRoutes },
      ]),
      { provide: AuthService, useValue: { currentUser: identity, isAuthenticated: () => !!identity() } },
    ] });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  it('adapts distinct IDs and derives grouping and payment state from shared BookingResponse contracts', () => {
    const stay = adapt.homestay(homestayRow);
    const bike = adapt.rental(rentalRow);
    expect(bookingKey(stay)).toBe('homestay/4');
    expect(bookingKey(bike)).toBe('rental/4');
    expect([stay.status, stay.paymentStatus]).toEqual(['confirmed', 'unpaid']);
    expect([bike.status, bike.paymentStatus, bike.paymentMethod]).toEqual(['completed', 'demo_succeeded', 'simulated']);
    expect(bookingGroup(stay, Date.parse('2100-01-01'))).toBe('all');
    expect(bookingGroup(stay, Date.parse('2095-01-01'))).toBe('upcoming');
    expect(bookingGroup(bike)).toBe('completed');
    expect(matchesBooking(bike, 'RB-4 bike')).toBe(true);
  });

  it('uses shared GET /bookings/my categories, keeps loaded results on partial failure, and retries only that service', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings?status=completed&q=RB-4');
    expect(harness.routeNativeElement!.querySelector('[aria-busy="true"]')).toBeTruthy();
    expectShared('homestay').flush([homestayRow]);
    expectShared('adventure').flush([]);
    expectShared('guide').flush(null, { status: 503, statusText: 'Unavailable' });
    expectShared('bike').flush([rentalRow]);
    expectShared('bicycle').flush([]);
    harness.detectChanges();
    expect(body()).toContain('RB-4');
    expect(body()).not.toContain('HS-4');
    expect(body()).toContain('Tour Guide bookings');
    expect([...harness.routeNativeElement!.querySelectorAll('.filters span')].map(node => node.textContent)).toEqual(['(2)', '(1)', '(0)', '(1)', '(0)']);

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.service-notices button')!.click();
    expectShared('guide').flush([]);
    harness.detectChanges();
    expect(body()).toContain('RB-4');
    expect(body()).not.toContain('couldn’t load');
    http.verify();
  });

  it('loads shared GET /bookings/{booking_id} detail with payment state and preserves dashboard query on the back link', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings?status=completed&q=RB-4');
    for (const cat of sharedCategories) {
      expectShared(cat).flush(cat === 'bike' ? [rentalRow] : []);
    }
    harness.detectChanges();
    const href = harness.routeNativeElement!.querySelector('.booking-actions a')!.getAttribute('href')!;
    expect(href).toBe('/my-bookings/rental/4?status=completed&q=RB-4');
    await harness.navigateByUrl(href);
    http.expectOne(base + '/bookings/4').flush(rentalRow);
    harness.detectChanges();
    expect(body()).toContain('Booking Details');
    expect(body()).toContain('demo succeeded');
    expect(body()).toContain('simulated');
    expect(harness.routeNativeElement!.querySelector('.back')).toBeNull();
    const backNav = TestBed.inject(TravelerBackNavigationService);
    expect(backNav.resolveFallbackUrl(TestBed.inject(Router).url)).toBe('/my-bookings?status=completed&q=RB-4');
    http.verify();
  });

  it('keeps guests and providers from issuing booking requests', async () => {
    await harness.navigateByUrl('/my-bookings');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/auth?returnUrl=%2Fmy-bookings');
    identity.set(user(2, 'provider'));
    await harness.navigateByUrl('/my-bookings/rental/4');
    expect(TestBed.inject(Router).url).toBe('/provider/dashboard');
    http.verify();
  });

  it('clears previous data immediately and cancels in-flight history when the traveler changes', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings');
    expectShared('homestay').flush([homestayRow]);
    const pending = sharedCategories.slice(1).map(expectShared);
    harness.detectChanges();
    expect(body()).toContain('HS-4');

    identity.set(user(2));
    harness.detectChanges();
    expect(body()).not.toContain('HS-4');
    await harness.fixture.whenStable();
    expect(pending.every(request => request.cancelled)).toBe(true);
    for (const cat of sharedCategories) {
      expectShared(cat).flush([]);
    }
    harness.detectChanges();
    expect(body()).toContain('No bookings yet.');
    http.verify();
  });

  it('deduplicates overlapping history rows by service and original ID', () => {
    const first = adapt.homestay(homestayRow);
    const bike = adapt.rental(rentalRow);
    expect(uniqueBookings([first, { ...first, status: 'expired' }, bike])).toEqual([first, bike]);
  });

  it('distinguishes unauthorized details from forbidden details via GET /bookings/{id}', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/guide/4');
    http.expectOne(base + '/bookings/4').flush(null, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();
    expect(body()).toContain('Sign in again to view this booking');
    http.verify();
  });

  it('permits live cancellation via confirmation dialog and PATCH /bookings/{id}/status', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/homestay/4');
    http.expectOne(base + '/bookings/4').flush(homestayRow);
    harness.detectChanges();

    const cancelBtn = harness.routeNativeElement!.querySelector('.btn-danger-outline') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    harness.detectChanges();

    const confirmBtn = harness.routeNativeElement!.querySelector('app-account-confirm-dialog .btn-primary') as HTMLButtonElement;
    confirmBtn.click();

    const patchReq = http.expectOne({ method: 'PATCH', url: base + '/bookings/4/status' });
    expect(patchReq.request.body).toEqual({ to_status: 'cancelled', reason: null });
    patchReq.flush({ ...homestayRow, status: 'cancelled' });
    harness.detectChanges();
    expect(body()).toContain('Booking cancelled successfully.');
    expect(body()).toContain('cancelled');
    http.verify();
  });

  it('permits the demonstration only for selected future unpaid states', () => {
    const row = adapt.homestay(homestayRow);
    expect(canSimulateCancellation(row)).toBe(true);
    expect(canSimulateCancellation({ ...row, paymentStatus: 'paid' })).toBe(false);
    expect(canSimulateCancellation({ ...row, status: 'completed' })).toBe(false);
    expect(canSimulateCancellation({ ...row, start: '2000-01-01' })).toBe(false);
  });
});
