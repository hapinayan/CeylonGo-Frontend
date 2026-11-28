import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../core/interceptors/auth.interceptor';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { TravelerLayoutComponent } from '../layouts/traveler-layout/traveler-layout.component';
import { previewBookingRoutes } from './rental-booking-routes.development';
import { RentalDetails } from './rental-details';
import { RentalDiscover } from './rental-discover';
import { DEFAULT_QUERY, RentalVehicle, rentalDateError } from './rental-models';
import { previewSearch as developmentSearch } from './rental-preview.development';
import { RentalScroll } from './rental.routes';

const base = environment.apiBaseUrl + '/rental-vehicles';
const wishlist = environment.apiBaseUrl + '/rental-wishlist/';
const vehicle: RentalVehicle = {
  id: 12, vehicle_type: 'bike', vehicle_name: 'Coastal Motorbike', city: 'Galle',
  price_per_day: '1500.00', currency: 'LKR', created_at: '2025-01-01',
};

describe('Rental discovery', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const user = signal<{ id: number } | null>(null);
  const open = vi.fn();

  beforeEach(async () => {
    user.set(null);
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: TravelerLayoutComponent,
            children: [
              { path: 'bicycles', component: RentalDiscover },
              { path: 'bicycles/:id', component: RentalDetails },
            ],
          },
        ]),
        provideHttpClient(), provideHttpClientTesting(), RentalScroll,
        { provide: AuthService, useValue: { currentUser: user, isAuthenticated: () => !!user() } },
        {
          provide: AuthModalService,
          useValue: {
            open,
            isOpen: signal(false),
            currentStep: signal('entry'),
            userEmail: signal(''),
            intentMode: signal('login'),
            registeredFullName: signal(''),
            registrationId: signal(null),
            resetToken: signal(null),
            pendingAction: signal(null),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  function list(type: string, items: RentalVehicle[] = [], total = items.length) {
    const request = http.expectOne(req => req.url === base && req.params.get('vehicle_type') === type);
    request.flush({ items, total, pages: Math.ceil(total / 6) });
    harness.detectChanges();
    return request;
  }

  function page(): HTMLElement { return harness.routeNativeElement!; }

  async function click(label: string): Promise<void> {
    const control = [...page().querySelectorAll('button, a')].find(button => button.textContent?.trim() === label);
    expect(control).toBeDefined();
    (control as HTMLElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('renders loading, then merges both supported types without requesting tuk tuks', async () => {
    await harness.navigateByUrl('/bicycles?sort=price_asc');
    expect(page().textContent).toContain('Loading rentals');
    list('bike', [vehicle]);
    list('bicycle', [{ ...vehicle, id: 13, vehicle_type: 'bicycle', vehicle_name: 'City Bicycle', price_per_day: 800 }]);
    expect([...page().querySelectorAll('.card h3')].map(heading => heading.textContent)).toEqual(['City Bicycle', 'Coastal Motorbike']);
    expect(page().textContent).toContain('2 Rentals Found');
    http.verify();
  });

  it('cancels stale search requests and sends combined filters and pagination', async () => {
    await harness.navigateByUrl('/bicycles?type=bike');
    const stale = http.expectOne(req => req.url === base);
    await harness.navigateByUrl('/bicycles?type=bicycle&city=Galle&price=mid&pickup=2026-12-01&return=2026-12-03&sort=price_desc');
    expect(stale.cancelled).toBe(true);
    const first = list('bicycle', [{ ...vehicle, vehicle_type: 'bicycle' }], 8);
    expect(first.request.params.get('city')).toBe('Galle');
    expect(first.request.params.get('min_price')).toBe('1501');
    expect(first.request.params.get('max_price')).toBe('3000');
    expect(first.request.params.get('pickup_at')).toBe('2026-12-01T00:00:00+05:30');
    expect(first.request.params.get('return_at')).toBe('2026-12-03T00:00:00+05:30');
    expect(first.request.params.get('sort_by')).toBe('price_desc');
    await click('Next');
    expect(list('bicycle', [{ ...vehicle, vehicle_type: 'bicycle' }], 8).request.params.get('page')).toBe('2');
    expect(page().textContent).toContain('Page 2 of 2');
    await click('Clear All');
    expect(list('bike').request.params.has('city')).toBe(false);
    list('bicycle');
    expect(page().textContent).toContain('No approved rental vehicles available yet');
    http.verify();
  });

  it('queries the selected category and submits the location form', async () => {
    await harness.navigateByUrl('/bicycles');
    list('bike');
    list('bicycle');
    await click('Bicycles');
    list('bicycle');
    const city = page().querySelector<HTMLInputElement>('input[type=search]')!;
    city.value = 'Ella';
    city.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    expect(list('bicycle').request.params.get('city')).toBe('Ella');
    const pickup = page().querySelector<HTMLInputElement>('input[type=date]')!;
    pickup.value = '2026-12-01';
    city.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();
    expect(page().querySelector('#date-error')?.textContent).toContain('Choose both');
    http.verify();
  });

  it('retries a failed API request without showing fixture data', async () => {
    await harness.navigateByUrl('/bicycles?type=bike');
    http.expectOne(req => req.url === base).flush(null, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(page().textContent).toContain('Rentals couldn’t load');
    expect(page().textContent).not.toContain('Honda Dio');
    await click('Try Again');
    list('bike', [vehicle]);
    expect(page().textContent).toContain(vehicle.vehicle_name);
    http.verify();
  });

  it('keeps the query when opening details and returning', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    try {
      await harness.navigateByUrl('/bicycles?type=bike&city=Galle&page=2');
      list('bike', [vehicle], 12);
      const link = page().querySelector<HTMLAnchorElement>('.details-link')!;
      expect(link.getAttribute('href')).toBe('/bicycles/12?type=bike&city=Galle&page=2');
      link.click();
      await harness.fixture.whenStable();
      http.expectOne(base + '/12').flush(vehicle);
      http.expectOne(req => req.url === base + '/12/reviews').flush({ items: [], total: 0 });
      harness.detectChanges();
      http
        .match(`${environment.apiBaseUrl}/recommendations/similar/12?limit=5`)
        .forEach((req) => req.flush({ recommendation_type: 'similar_services', items: [] }));
      expect(page().textContent).toContain('No published reviews yet.');
      await click('Back');
      const back = list('bike', [vehicle], 12);
      expect(back.request.params.get('city')).toBe('Galle');
      expect(back.request.params.get('page')).toBe('2');
      http.verify();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('opens the existing login modal for guests and uses authenticated wishlist endpoints for travelers', async () => {
    await harness.navigateByUrl('/bicycles?type=bike');
    list('bike', [vehicle]);
    await harness.fixture.whenStable();
    const heart = page().querySelector<HTMLButtonElement>('app-rental-wishlist button')!;
    heart.click();
    expect(open).toHaveBeenCalledWith('login', heart);
    http.expectNone(req => req.url.startsWith(wishlist));
    user.set({ id: 42 });
    harness.detectChanges();
    await harness.fixture.whenStable();
    http.expectOne(wishlist + '12/status').flush({ saved: false });
    harness.detectChanges();
    heart.click();
    http.expectOne({ method: 'POST', url: wishlist + '12' }).flush({ saved: true });
    await harness.fixture.whenStable();
    http.expectOne(wishlist + '12/status').flush({ saved: true });
    harness.detectChanges();
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    heart.click();
    http.expectOne({ method: 'DELETE', url: wishlist + '12' }).flush({ saved: false });
    await harness.fixture.whenStable();
    http.expectOne(wishlist + '12/status').flush({ saved: false });
    http.verify();
  });

  it.each([401, 403])('can retry public catalog access after HTTP %s', async status => {
    await harness.navigateByUrl('/bicycles?type=bike');
    const request = http.expectOne(req => req.url === base);
    expect(request.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    request.flush(null, { status, statusText: 'Access denied' });
    harness.detectChanges();
    expect(page().textContent).toContain('denied access to the public catalog');
    await click('Try Again');
    list('bike');
    expect(page().textContent).toContain('No approved rental vehicles available yet');
    http.verify();
  });

  it('keeps details usable when reviews and search availability fail, then retries', async () => {
    await harness.navigateByUrl('/bicycles/12?pickup=2099-01-01&return=2099-01-02');
    expect(page().textContent).toContain('Loading vehicle details');
    http.expectOne(base + '/12').flush(null, { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(page().textContent).toContain('denied access to these public details');
    await click('Try Again');
    const loadDetails = () => {
      const detail = http.expectOne({ method: 'GET', url: base + '/12' });
      expect(detail.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
      detail.flush(vehicle);
      const reviews = http.expectOne(req => req.url === base + '/12/reviews');
      expect(reviews.request.params.get('limit')).toBe('5');
      const availability = http.expectOne(req => req.url === base + '/12/availability');
      expect(availability.request.params.get('start_date')).toBe('2099-01-01T00:00:00+05:30');
      expect(availability.request.params.get('end_date')).toBe('2099-01-02T00:00:00+05:30');
      return { reviews, availability };
    };
    const failed = loadDetails();
    failed.reviews.flush(null, { status: 503, statusText: 'Unavailable' });
    failed.availability.flush(null, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    http
      .match(`${environment.apiBaseUrl}/recommendations/similar/12?limit=5`)
      .forEach((req) => req.flush({ recommendation_type: 'similar_services', items: [] }));
    expect(page().textContent).toContain(vehicle.vehicle_name);
    expect(page().textContent).toContain('Availability couldn');
    expect(page().textContent).toContain('Reviews couldn');
    await click('Retry');
    const success = loadDetails();
    success.reviews.flush({ total: 1, average_rating: 4.5, page: 1, limit: 5, pages: 1,
      items: [{ id: 8, rating: '4.5', title: 'Published review', reviewer_name: null, comment: null }] });
    success.availability.flush({ vehicle_id: 12, is_available: false, unavailable_periods: [] });
    harness.detectChanges();
    http
      .match(`${environment.apiBaseUrl}/recommendations/similar/12?limit=5`)
      .forEach((req) => req.flush({ recommendation_type: 'similar_services', items: [] }));
    expect(page().textContent).toContain('Published review');
    expect(page().textContent).toContain('Unavailable for the search dates.');
    http.verify();
  });

  it('uses the read-only server quote after successful date validation and keeps the deposit separate', async () => {
    await harness.navigateByUrl('/bicycles/12?pickup=2099-01-01&return=2099-01-02');
    http.expectOne(base + '/12').flush(vehicle);
    http.expectOne(req => req.url === base + '/12/reviews').flush({ items: [], total: 0 });
    http.expectOne(req => req.url === base + '/12/availability').flush({ is_available: true });
    harness.detectChanges();
    http
      .match(`${environment.apiBaseUrl}/recommendations/similar/12?limit=5`)
      .forEach((req) => req.flush({ recommendation_type: 'similar_services', items: [] }));
    const dates = { pickup_at: '2099-01-01T09:00:00+05:30', return_at: '2099-01-02T09:00:00+05:30' };
    const validate = async (valid: boolean, collision = 'none') => {
      await click('Check availability');
      const request = http.expectOne({ method: 'POST', url: environment.apiBaseUrl + '/rental-bookings/validate-dates' });
      expect(request.request.body).toEqual({ ...dates, vehicle_id: 12 });
      expect(request.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
      request.flush({ ...dates, vehicle_id: 12, duration_days: 1, duration_hours: 24, is_valid: valid, collision_type: collision });
      harness.detectChanges();
    };
    const quote = () => {
      const request = http.expectOne({ method: 'POST', url: base + '/12/calculate-quote' });
      expect(request.request.body).toEqual(dates);
      expect(request.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
      return request;
    };
    await validate(false, 'maintenance');
    expect(page().textContent).toContain('Maintenance overlaps');
    http.expectNone(base + '/12/calculate-quote');
    await validate(true);
    quote().flush(null, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(page().textContent).toContain('Dates were available');
    expect(page().textContent).toContain('Check availability again to retry.');
    await validate(true);
    const stale = quote();
    const pickupTime = page().querySelector<HTMLInputElement>('input[type=time]')!;
    pickupTime.value = '10:00';
    pickupTime.dispatchEvent(new Event('input'));
    expect(stale.cancelled).toBe(true);
    pickupTime.value = '09:00';
    pickupTime.dispatchEvent(new Event('input'));
    await validate(true);
    quote().flush({ ...dates, vehicle_id: 12, total_price: '1234.56', security_deposit: '2000.25', selected_plan_name: 'Daily offer', currency: 'LKR' });
    harness.detectChanges();
    expect(page().textContent).toContain('LKR 1,234.56');
    expect(page().textContent).toContain('LKR 2,000.25 separately');
    expect(page().textContent).toContain('final booking total separately');
    http.verify();
  });

  const quoteUrl = base + '/12/calculate-quote';
  const validationUrl = environment.apiBaseUrl + '/rental-bookings/validate-dates';
  const pickup = '2099-01-01T03:30:00';
  const dropoff = '2099-01-02T03:30:00';

  async function openDateCheck(): Promise<void> {
    await harness.navigateByUrl('/bicycles/12?pickup=2099-01-01&return=2099-01-02');
    http.expectOne(base + '/12').flush(vehicle);
    http.expectOne(req => req.url === base + '/12/reviews').flush({ items: [], total: 0 });
    http.expectOne(req => req.url === base + '/12/availability').flush({ is_available: true });
    harness.detectChanges();
    http
      .match(`${environment.apiBaseUrl}/recommendations/similar/12?limit=5`)
      .forEach((req) => req.flush({ recommendation_type: 'similar_services', items: [] }));
  }

  async function requestQuote() {
    await click('Check availability');
    http.expectOne(validationUrl).flush({ vehicle_id: 12, is_valid: true, duration_days: 1, duration_hours: 24 });
    return http.expectOne(quoteUrl);
  }

  const serverQuote = {
    vehicle_id: 12, pickup_at: pickup, return_at: dropoff,
    total_price: '480.75', currency: 'LKR', selected_plan_name: 'Daily plan', security_deposit: null,
  };

  it('accepts UTC-normalized quote dates and distinguishes unknown and quoted zero deposits', async () => {
    await openDateCheck();
    (await requestQuote()).flush(serverQuote);
    harness.detectChanges();
    expect(page().textContent).toContain('Server rental estimate');
    expect(page().textContent).toContain('does not specify a security deposit');
    expect(page().textContent).toContain('does not hold the vehicle or guarantee a price');
    (await requestQuote()).flush({ ...serverQuote, security_deposit: '0.00' });
    harness.detectChanges();
    expect(page().textContent).toContain('LKR 0.00 separately');
    expect(page().textContent).toContain('required amount can differ');
    http.verify();
  });

  it('rejects a response for a different interval and distinguishes unavailable estimates', async () => {
    await openDateCheck();
    (await requestQuote()).flush({ ...serverQuote, return_at: '2099-01-03T03:30:00Z' });
    harness.detectChanges();
    expect(page().textContent).toContain('estimate is unavailable');
    expect(page().textContent).not.toContain('480.75');
    (await requestQuote()).flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(page().textContent).toContain('estimate is unavailable');
    expect(page().textContent).toContain('Dates were available');
    http.verify();
  });

  it('clears the checked interval and estimate when pickup passes', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(pickup + 'Z').getTime() - 500);
    try {
      await openDateCheck();
      (await requestQuote()).flush(serverQuote);
      harness.detectChanges();
      expect(page().textContent).toContain('480.75');
      vi.advanceTimersByTime(500);
      harness.detectChanges();
      expect(page().textContent).toContain('The pickup time has passed');
      expect(page().textContent).not.toContain('480.75');
      expect(page().textContent).not.toContain('Dates were available');
      http.verify();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reconciles a duplicate wishlist save and handles unauthorized and forbidden writes', async () => {
    user.set({ id: 42 });
    await harness.navigateByUrl('/bicycles?type=bike');
    list('bike', [vehicle]);
    await harness.fixture.whenStable();
    const heart = page().querySelector<HTMLButtonElement>('app-rental-wishlist button')!;
    const url = wishlist + '12';
    const status = (saved: boolean) => {
      http.expectOne({ method: 'GET', url: url + '/status' }).flush({ vehicle_id: 12, saved });
      harness.detectChanges();
    };
    status(false);
    heart.click();
    const add = http.expectOne({ method: 'POST', url });
    expect(add.request.body).toBeNull();
    add.flush(null, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();
    status(true);
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    heart.click();
    http.expectOne({ method: 'DELETE', url }).flush(null, { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(page().textContent).toContain('does not have permission');
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    heart.click();
    http.expectOne({ method: 'DELETE', url }).flush(null, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();
    expect(page().textContent).toContain('Sign in again');
    http.verify();
  });

  it.each(['1/booking', 'my-rentals', 'my-rentals/DEMO-001'])(
    'does not expose %s preview route when runtime preview is disabled',
    async route => {
      expect(previewBookingRoutes).toEqual([]);
      const router = TestBed.inject(Router);
      router.resetConfig([{ path: 'bicycles', children: [
        ...previewBookingRoutes,
        { path: '', component: RentalDiscover },
        { path: '**', redirectTo: '' },
      ] }]);

      const previewPath = '/bicycles/' + route;
      await harness.navigateByUrl(previewPath + '?preview=1');
      expect(router.url).toBe('/bicycles?preview=1');
      expect(page().querySelector('.booking-page')).toBeNull();
      list('bike');
      list('bicycle');
      http.verify();
    },
  );

  it('validates dates and combines preview category and sort', () => {
    expect(rentalDateError('2026-11-01', '2026-10-31')).toContain('after');
    expect(rentalDateError('2026-02-31', '2026-03-04')).toContain('valid');
    expect(rentalDateError('2026-11-01', '2026-11-03')).toBe('');
    expect(developmentSearch({ ...DEFAULT_QUERY, category: 'scooter', sort: 'price_desc' }).items.map(listing => listing.id)).toEqual([4, 1]);
  });
});
