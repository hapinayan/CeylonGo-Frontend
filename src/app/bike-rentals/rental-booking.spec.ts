import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { RentalBooking } from './rental-booking';
import { RentalDetails } from './rental-details';
import { RentalVehicle } from './rental-models';
import { BookingDetail } from '../experiences/pages/traveler/booking-detail';
import { MyExperienceBookings } from '../experiences/pages/traveler/bookings';
import { TravelSession } from '../experiences/services/travel-session';

describe('Rental details, 3-step booking checkout, and shared My Bookings integration', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const user = signal<{ id: number; full_name: string; email: string } | null>({
    id: 42,
    full_name: 'Amaya Perera',
    email: 'amaya@example.com',
  });

  const bike: RentalVehicle = {
    id: 21,
    vehicle_type: 'bike',
    vehicle_name: 'Honda XR150',
    city: 'Kandy',
    district: 'Kandy',
    price_per_day: 3200,
    currency: 'LKR',
    created_at: '2026-01-01',
    primary_image_url: '/photo1.jpg',
    images: [
      { id: 1, image_url: '/photo1.jpg' },
      { id: 2, image_url: '/photo2.jpg' },
      { id: 3, image_url: '/photo3.jpg' },
    ],
    security_deposit: 5000,
    helmets: { helmet_provided: true, requires_helmet: true },
  };

  const bicycle: RentalVehicle = {
    id: 22,
    vehicle_type: 'bicycle',
    vehicle_name: 'Giant Talon MTB',
    city: 'Ella',
    price_per_day: 1200,
    currency: 'LKR',
    created_at: '2026-01-01',
    primary_image_url: '/cycle1.jpg',
    bicycle_type: 'Mountain',
    helmets: { helmet_provided: true, requires_helmet: false, lock_included: true },
  };

  const api = environment.apiBaseUrl;

  beforeEach(async () => {
    user.set({ id: 42, full_name: 'Amaya Perera', email: 'amaya@example.com' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'bicycles/:id', component: RentalDetails },
          { path: 'bicycles/:id/booking', component: RentalBooking },
          { path: 'experiences/bookings', component: MyExperienceBookings },
          { path: 'experiences/bookings/:bookingId', component: BookingDetail },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: user,
            isAuthenticated: () => !!user(),
            getToken: () => (user() ? 'token-42' : null),
          },
        },
        { provide: TravelSession, useValue: { account: user } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  function page(): HTMLElement {
    return harness.routeNativeElement!;
  }

  it('deduplicates gallery photos and exempts bicycles from driving licence requirements', async () => {
    await harness.navigateByUrl('/bicycles/22');
    http.expectOne(`${api}/rental-vehicles/22`).flush(bicycle);
    http.expectOne((r) => r.url === `${api}/rental-vehicles/22/reviews`).flush({ items: [], total: 0, average_rating: 0 });
    harness.detectChanges();
    await harness.fixture.whenStable();
    http.expectOne(`${api}/rental-wishlist/22/status`).flush({ vehicle_id: 22, saved: false });
    http
      .match(`${api}/recommendations/similar/22?limit=5`)
      .forEach((r) => r.flush({ recommendation_type: 'similar_services', items: [] }));
    harness.detectChanges();

    expect(page().textContent).toContain('No driving licence required for this bicycle.');
    expect(page().textContent).not.toContain('View All Photos');

    await harness.navigateByUrl('/bicycles/21');
    http.expectOne(`${api}/rental-vehicles/21`).flush(bike);
    http.expectOne((r) => r.url === `${api}/rental-vehicles/21/reviews`).flush({ items: [], total: 0, average_rating: 0 });
    harness.detectChanges();
    await harness.fixture.whenStable();
    http.expectOne(`${api}/rental-wishlist/21/status`).flush({ vehicle_id: 21, saved: false });
    http
      .match(`${api}/recommendations/similar/21?limit=5`)
      .forEach((r) => r.flush({ recommendation_type: 'similar_services', items: [] }));
    harness.detectChanges();

    expect(page().textContent).toContain('Valid motorcycle driving license required');
    expect(page().textContent).toContain('View All Photos (3)');
    http.verify();
  });

  it('runs 3-step live rental booking with Academic Demo retry without duplicate POST /bookings', async () => {
    await harness.navigateByUrl(
      '/bicycles/21/booking?pickup_at=2099-02-01T09:00:00%2B05:30&return_at=2099-02-03T09:00:00%2B05:30&days=2&quantity=1',
    );
    http.expectOne(`${api}/rental-vehicles/21`).flush(bike);
    harness.detectChanges();

    expect(page().textContent).toContain('Honda XR150');
    expect(page().textContent).toContain('LKR 6,400.00');

    const checkboxes = page().querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes[0].click();
    const expiryInput = page().querySelector<HTMLInputElement>('#license-valid-until')!;
    expiryInput.value = '2099-03-01';
    expiryInput.dispatchEvent(new Event('input'));
    checkboxes[1].click();
    harness.detectChanges();

    const continueBtn = [...page().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Continue to Payment'),
    )!;
    continueBtn.click();

    const quoteReq = http.expectOne({ method: 'POST', url: `${api}/rental-vehicles/21/calculate-quote` });
    quoteReq.flush({
      vehicle_id: 21,
      pickup_at: '2099-02-01T03:30:00Z',
      return_at: '2099-02-03T03:30:00Z',
      quantity: 1,
      is_available: true,
      available_quantity: 2,
      duration_days: 2,
      duration_hours: 48,
      rate: '3200.00',
      total_price: '6400.00',
      currency: 'LKR',
      requires_driving_license: true,
      selected_plan_name: 'Daily rate',
      security_deposit: null,
    });
    await harness.fixture.whenStable();
    harness.detectChanges();

    const outcomeSelect = page().querySelector<HTMLSelectElement>('#demo-outcome-select')!;
    outcomeSelect.value = 'failure';
    outcomeSelect.dispatchEvent(new Event('change'));
    harness.detectChanges();

    const submitBtn = [...page().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Submit Booking Request'),
    )!;
    submitBtn.click();

    const createReq = http.expectOne({ method: 'POST', url: `${api}/bookings` });
    expect(createReq.request.body.listing_id).toBe(21);
    expect(createReq.request.body.quantity).toBe(1);
    expect(createReq.request.body.expected_total).toBe('6400.00');
    expect(createReq.request.body.motorcycle_license_confirmed).toBe(true);
    expect(createReq.request.body.license_valid_until).toBe('2099-03-01');
    createReq.flush({
      id: 700,
      listing_id: 21,
      traveler_id: 42,
      request_key: createReq.request.body.request_key,
      starts_at: '2099-02-01T09:00:00+05:30',
      ends_at: '2099-02-03T09:00:00+05:30',
      quantity: 1,
      total_amount: '6400.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-26T00:00:00Z',
      booking_reference: 'RENT-700',
    });

    await Promise.resolve();
    const failPayReq = http.expectOne({ method: 'POST', url: `${api}/payments/simulate` });
    expect(failPayReq.request.body.attempt_no).toBe(1);
    expect(failPayReq.request.body.simulate_outcome).toBe('failure');
    failPayReq.flush({
      id: 801,
      booking_id: 700,
      request_key: failPayReq.request.body.request_key,
      attempt_no: 1,
      method: 'simulated',
      status: 'failed',
      display_amount: '6400.00',
      currency: 'LKR',
      created_at: '2026-11-26T00:00:00Z',
      resolved_at: '2026-11-26T00:00:00Z',
    });

    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page().textContent).toContain('Simulated online payment failed');

    const switchBtn = [...page().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Switch to Pay at Location'),
    )!;
    switchBtn.click();

    http.expectNone({ method: 'POST', url: `${api}/bookings` });
    const locPayReq = http.expectOne({ method: 'POST', url: `${api}/payments/at-location` });
    expect(locPayReq.request.body.booking_id).toBe(700);
    locPayReq.flush({
      id: 802,
      booking_id: 700,
      request_key: locPayReq.request.body.request_key,
      attempt_no: 2,
      method: 'at_location',
      status: 'unpaid',
      display_amount: '6400.00',
      currency: 'LKR',
      created_at: '2026-11-26T00:00:00Z',
      resolved_at: null,
    });

    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page().textContent).toContain('Booking Request Submitted — Awaiting Provider Confirmation');
    expect(page().textContent).toContain('RENT-700');
    expect(page().textContent).toContain('Unpaid');
    http.verify();
  });

  it('loads Bike & Bicycle Rentals tab on MyExperienceBookings and resolves shared listing fallback on BookingDetail', async () => {
    await harness.navigateByUrl('/experiences/bookings');
    http.expectOne((r) => r.url === `${api}/bookings/my` && r.params.get('category') === 'adventure').flush([]);
    harness.detectChanges();

    const rentalsTab = [...page().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Bike & Bicycle Rentals'),
    )!;
    rentalsTab.click();
    harness.detectChanges();
    await harness.fixture.whenStable();

    const bikeBooking = {
      id: 901,
      listing_id: 22,
      traveler_id: 42,
      starts_at: '2099-03-01T09:00:00+05:30',
      ends_at: '2099-03-03T09:00:00+05:30',
      quantity: 2,
      total_amount: '2400.00',
      currency: 'LKR',
      status: 'pending',
      booking_reference: 'CYC-901',
    };
    http.expectOne((r) => r.url === `${api}/bookings/my` && r.params.get('category') === 'bike').flush([]);
    http.expectOne((r) => r.url === `${api}/bookings/my` && r.params.get('category') === 'bicycle').flush([bikeBooking]);
    await harness.fixture.whenStable();
    http.expectOne(`${api}/bookings/901`).flush({ ...bikeBooking, payments: [] });
    http.expectOne(`${api}/activities/22`).flush(null, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    http.expectOne(`${api}/listings/22`).flush({
      id: 22,
      category: 'bicycle',
      title: 'Giant Talon MTB',
      city: 'Ella',
      district: 'Badulla',
    });
    harness.detectChanges();

    expect(page().textContent).toContain('Giant Talon MTB');
    expect(page().textContent).toContain('CYC-901');
    expect(page().textContent).toContain('2 days');

    await harness.navigateByUrl('/experiences/bookings/901');
    harness.detectChanges();
    http.expectOne(`${api}/bookings/901`).flush({ ...bikeBooking, payments: [] });
    http.expectOne(`${api}/activities/22`).flush(null, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    http.expectOne(`${api}/listings/22`).flush({
      id: 22,
      category: 'bicycle',
      title: 'Giant Talon MTB',
      city: 'Ella',
      district: 'Badulla',
    });
    harness.detectChanges();

    expect(page().textContent).toContain('Pickup & Return');
    expect(page().textContent).toContain('Giant Talon MTB');
    expect(page().textContent).toContain('No driving licence required for this bicycle.');
    expect(page().textContent).toContain('View vehicle');
    http.verify();
  });
});
