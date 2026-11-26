import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/auth.models';
import { adapt } from './booking-api';
import { bookingGroup, bookingKey, matchesBooking, uniqueBookings } from './booking-model';
import { canSimulateCancellation } from './booking-preview.development';
import { travelerBookingRoutes } from './booking.routes';

@Component({ template: '<p>Home page</p>' })
class HomeStub {}

const user = (id: number, role = 'traveler'): User => ({
  id, role, full_name: 'Test Traveler ' + id, email: 'synthetic@example.test', is_active: true, created_at: '',
});
const base = environment.apiBaseUrl;
const homestay = {
  id: 4, homestay_id: 15, homestay_name: 'Ella Guest House', total_price: '9000.50', currency: 'LKR',
  status: 'confirmed', payment_status: 'unpaid', check_in: '2095-11-26', check_out: '2095-11-28', guests: 2,
};
const rental = {
  id: 4, vehicle_id: 12, booking_reference: 'RB-4', vehicle_name: 'Coastal Scooter', total_price: '2300', currency: 'LKR',
  status: 'completed', payment_status: 'paid', pickup_at: '2020-11-25T09:00:00Z', return_at: '2020-11-26T09:00:00Z',
  pickup_location_name: 'Galle',
};
const endpoints = ['/bookings/me', '/activity-bookings/me', '/eco-reservations/me', '/tour-guide-bookings/me',
  '/rental-bookings/me', '/artisan-reservations/me'];

describe('Traveler Bookings', () => {
  const identity = signal<User | null>(null);
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const expectList = (path: string) => http.expectOne(request => request.url === base + path);
  const body = () => harness.routeNativeElement?.textContent ?? '';

  beforeEach(async () => {
    identity.set(null);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter([{ path: '', component: HomeStub }, { path: 'auth', component: HomeStub }, { path: 'provider/dashboard', component: HomeStub },
        { path: 'my-bookings', children: travelerBookingRoutes }]),
      { provide: AuthService, useValue: { currentUser: identity, isAuthenticated: () => !!identity() } },
    ] });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  it('adapts distinct IDs and preserves separate backend payment and lifecycle states', () => {
    const stay = adapt.homestay(homestay), bike = adapt.rental(rental);
    expect(bookingKey(stay)).toBe('homestay/4');
    expect(bookingKey(bike)).toBe('rental/4');
    expect([stay.status, stay.paymentStatus]).toEqual(['confirmed', 'unpaid']);
    expect(bookingGroup(stay, Date.parse('2100-01-01'))).toBe('all');
    expect(bookingGroup(stay, Date.parse('2095-01-01'))).toBe('upcoming');
    expect(bookingGroup(bike)).toBe('completed');
    expect(matchesBooking(bike, 'RB-4 Galle bike')).toBe(true);
  });

  it('combines status and search, keeps loaded results when a service fails, and retries only that service', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings?status=completed&q=galle');
    expect(body()).toContain('Loading bookings');
    expectList('/bookings/me').flush([homestay]);
    expectList('/activity-bookings/me').flush([]);
    expectList('/eco-reservations/me').flush([]);
    expectList('/tour-guide-bookings/me').flush(null, {status: 503, statusText: 'Unavailable'});
    expectList('/rental-bookings/me').flush({ items: [rental], pages: 2 });
    expectList('/artisan-reservations/me').flush([]);
    harness.detectChanges();
    expect(body()).toContain('Coastal Scooter');
    expect(body()).not.toContain('Ella Guest House');
    expect(body()).toContain('Tour Guide bookings');
    expect(body()).toContain('only loaded bookings');
    expect([...harness.routeNativeElement!.querySelectorAll('.filters span')].map(node => node.textContent)).toEqual(['2','1','1','0']);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.service-notices button')!.click();
    expectList('/tour-guide-bookings/me').flush({ items: [], total_pages: 0 });
    harness.detectChanges();
    expect(body()).toContain('Coastal Scooter');
    expect(body()).not.toContain('couldn’t load');
    http.verify();
  });

  it('uses service-scoped detail navigation and keeps the dashboard query on the back link', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings?status=completed&q=galle');
    for (const path of endpoints) {
      expectList(path).flush(path.includes('rental') ? { items: [rental], pages: 1 } :
        path.includes('tour-guide') ? { items: [], total_pages: 0 } : []);
    }
    harness.detectChanges();
    const href = harness.routeNativeElement!.querySelector('.booking-actions a')!.getAttribute('href')!;
    expect(href).toBe('/my-bookings/rental/4?status=completed&q=galle');
    await harness.navigateByUrl(href);
    http.expectOne(base + '/rental-bookings/4').flush(rental);
    harness.detectChanges();
    expect(body()).toContain('Booking Details');
    expect(body()).toContain('Payment status');
    expect(harness.routeNativeElement!.querySelector('.back')!.getAttribute('href')).toBe('/my-bookings?status=completed&q=galle');
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
    expectList('/bookings/me').flush([homestay]);
    const pending = endpoints.slice(1).map(expectList);
    harness.detectChanges();
    expect(body()).toContain('Ella Guest House');

    identity.set(user(2));
    harness.detectChanges();
    expect(body()).not.toContain('Ella Guest House');
    await harness.fixture.whenStable();
    expect(pending.every(request => request.cancelled)).toBe(true);
    for (const path of endpoints) {
      expectList(path).flush(path.includes('rental') ? {items: [], pages: 0} : path.includes('tour-guide') ? {items: [], total_pages: 0} : []);
    }
    harness.detectChanges();
    expect(body()).toContain('No bookings are available');
    http.verify();
  });

  it('deduplicates overlapping history rows by service and original ID', () => {
    const first = adapt.homestay(homestay);
    const bike = adapt.rental(rental);
    expect(uniqueBookings([first, { ...first, status: 'expired' }, bike])).toEqual([first, bike]);
  });

  it('loads owner-scoped refund history with a GET and retries without replacing payment status', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/eco/4');
    http.expectOne({ method: 'GET', url: base + '/eco-reservations/4' }).flush({
      id: 4, reference: 'ECO-4', experience_id: 81, slot_id: 19, participants: 2,
      starts_at: '2095-11-26T09:00:00Z', ends_at: '2095-11-26T11:00:00Z', status: 'cancelled',
      payment_status: 'refund_pending', payment_method: 'online', total: '3000.00', currency: 'LKR',
    });
    harness.detectChanges();
    expect(body()).toContain('Reserved slot');
    const clickRefunds = () => [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent!.includes('refund history'))!.click();
    clickRefunds();
    http.expectOne({ method: 'GET', url: base + '/eco-reservations/4/payments/refunds' })
      .flush(null, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(body()).toContain('Refund history is unavailable');
    expect(body()).toContain('refund pending');
    clickRefunds();
    http.expectOne({ method: 'GET', url: base + '/eco-reservations/4/payments/refunds' })
      .flush([{ id: 8, amount: '2500', currency: 'LKR', refund_status: 'processing' }]);
    harness.detectChanges();
    expect(body()).toContain('LKR 2,500.00');
    expect(body()).toContain('processing');
    expect(body()).toContain('refund pending');
    http.verify();
  });

  it('reads contact only after a successful owned detail and drops in-flight data on session change', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/homestay/4');
    const detail = http.expectOne({ method: 'GET', url: base + '/bookings/4' });
    http.expectNone(base + '/homestays/15/contact');
    detail.flush({ ...homestay, nightly_rate_snapshot: '2000.50', free_cancellation_hours_snapshot: 0 });
    harness.detectChanges();
    expect(body()).toContain('Booked nightly rate');
    expect(body()).toContain('0 hours');
    const contact = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent!.includes('View provider contact'))!;
    contact.click();
    const pending = http.expectOne({ method: 'GET', url: base + '/homestays/15/contact' });
    identity.set(user(2));
    harness.detectChanges();
    expect(body()).not.toContain(homestay.homestay_name);
    await harness.fixture.whenStable();
    expect(pending.cancelled).toBe(true);
    http.expectOne(base + '/bookings/4').flush(null, { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(body()).toContain('Your account cannot access this booking');
    http.expectNone(base + '/homestays/15/contact');
    http.verify();
  });

  it('distinguishes unauthorized details from forbidden details and sends no follow-up reads', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/guide/4');
    http.expectOne(base + '/tour-guide-bookings/4').flush(null, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();
    expect(body()).toContain('Sign in again to view this booking');
    http.verify();
  });

  it('permits the demonstration only for selected future unpaid states', () => {
    const row = adapt.homestay(homestay);
    expect(canSimulateCancellation(row)).toBe(true);
    expect(canSimulateCancellation({ ...row, paymentStatus: 'paid' })).toBe(false);
    expect(canSimulateCancellation({ ...row, status: 'completed' })).toBe(false);
    expect(canSimulateCancellation({ ...row, start: '2000-01-01' })).toBe(false);
  });

  it('uses only the traveler-owned list to resolve activity detail and does not guess an endpoint', async () => {
    identity.set(user(1));
    await harness.navigateByUrl('/my-bookings/activity/4');
    expectList('/activity-bookings/me').flush([]);
    harness.detectChanges();
    expect(body()).toContain('This booking was not found');
    http.verify();
  });
});
