import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { routes } from '../../../app.routes';
import { providerAuthGuard } from '../../../core/guards/provider-auth.guard';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityDetails, ActivityPage } from '../../models/activity';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { Discover } from './discover';

const base = environment.apiBaseUrl;

const ellaHike: ActivityDetails = {
  id: 41,
  title: 'Ella Ridge Hike',
  description: 'A guided hike along the ridge.',
  district: 'Badulla',
  locality: 'Ella',
  latitude: '6.866700',
  longitude: '81.046600',
  price_per_participant: '2500.00',
  currency: 'LKR',
  activity: {
    category: 'hiking-trekking',
    meeting_point: 'Ella main entrance',
    duration_minutes: 120,
    min_participants: 1,
    max_participants: 8,
    minimum_age: 12,
    highlights: ['Ridge viewpoint'],
    included: ['Guide'],
    excluded: ['Transport'],
    equipment: 'Bring trail shoes',
    facilities: null,
    safety_instructions: 'Stay on the marked trail',
    restrictions: null,
    cancellation_policy: null,
  },
  photos: [{ id: 12, image_url: '/api/v1/listings/41/photos/12', alt_text: 'Ridge trail' }],
  provider_id: 9,
  provider_name: 'Ella Trails',
  rating: null,
  reviews: [],
};

const yalaSafari: ActivityDetails = {
  ...ellaHike,
  id: 42,
  title: 'Yala Wildlife Safari',
  district: 'Hambantota',
  locality: 'Tissamaharama',
  price_per_participant: '12000.00',
  activity: {
    ...ellaHike.activity!,
    category: 'wildlife-safari',
    duration_minutes: 240,
    max_participants: 6,
  },
  photos: [],
};

describe('Experiences Discovery Page (Backend Integration)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Discover>;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Discover],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            isAuthenticated: () => false,
            getToken: () => null,
            getCurrentUser: () => {
              throw new Error('Not authenticated');
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Discover);
    page = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  function flushInitial(response: ActivityPage = { items: [ellaHike, yalaSafari], next_offset: null }): void {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url === `${base}/activities`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('sort')).toBe('newest');
    expect(req.request.params.get('limit')).toBe('8');
    expect(req.request.params.get('offset')).toBe('0');
    req.flush(response);
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    const button = [...page.querySelectorAll('button')].find(
      (el) => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === label,
    );
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  it('loads approved activities from GET /activities without hardcoded demo data or fake ratings', () => {
    expect(TestBed.inject(EXPERIENCE_CATALOG)).toEqual({ preview: false, experiences: [] });
    fixture.detectChanges();
    expect(page.textContent).toContain('Loading experiences');

    const req = http.expectOne((r) => r.url === `${base}/activities`);
    req.flush({ items: [ellaHike, yalaSafari], next_offset: null });
    fixture.detectChanges();

    const cards = [...page.querySelectorAll('.experience-card')];
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Ella Ridge Hike');
    expect(cards[0].textContent).toContain('Ella, Badulla');
    expect(cards[0].textContent).toContain('LKR 2,500.00');
    expect(cards[0].textContent).toContain('2 hours');
    expect(cards[0].textContent).toContain('Max 8 people');
    expect(page.querySelector('.card-rating')).toBeNull();
    expect(page.querySelector('.count-pill')?.textContent).toContain('2');
  });

  it('sends destination, date, participants, category, price filters, sorting, and offset pagination to backend', () => {
    flushInitial();

    // Destination, date, participants search
    fixture.componentInstance.searchForm.setValue({
      location: '  Ella ',
      date: '2026-12-12',
      travelers: 3,
    });
    fixture.componentInstance.search();
    fixture.detectChanges();

    const searchReq = http.expectOne((r) => r.url === `${base}/activities` && r.params.get('destination') === 'Ella');
    expect(searchReq.request.params.get('date')).toBe('2026-12-12');
    expect(searchReq.request.params.get('participants')).toBe('3');
    searchReq.flush({ items: [ellaHike], next_offset: null });
    fixture.detectChanges();

    // Category filter with exact slug
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    clickButton('Hiking & Trekking');

    const catReq = http.expectOne(
      (r) => r.url === `${base}/activities` && r.params.get('category') === 'hiking-trekking',
    );
    expect(navSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { category: 'hiking-trekking' },
        queryParamsHandling: 'merge',
      }),
    );
    catReq.flush({ items: [ellaHike], next_offset: null });
    fixture.detectChanges();

    // Price filter validation & submission
    fixture.componentInstance.filterForm.setValue({ minPrice: 5000, maxPrice: 1000 });
    fixture.componentInstance.applyPriceFilters();
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toContain('minimum');
    http.expectNone((r) => r.url === `${base}/activities`);

    fixture.componentInstance.filterForm.setValue({ minPrice: 1000, maxPrice: 5000 });
    fixture.componentInstance.applyPriceFilters();
    fixture.detectChanges();
    const priceReq = http.expectOne(
      (r) =>
        r.url === `${base}/activities` &&
        r.params.get('min_price') === '1000' &&
        r.params.get('max_price') === '5000',
    );
    priceReq.flush({ items: [ellaHike], next_offset: 8 });
    fixture.detectChanges();

    // Sort change
    fixture.componentInstance.changeSort('price_asc');
    fixture.detectChanges();
    const sortReq = http.expectOne(
      (r) => r.url === `${base}/activities` && r.params.get('sort') === 'price_asc',
    );
    sortReq.flush({ items: [ellaHike], next_offset: 8 });
    fixture.detectChanges();

    // Next page using next_offset
    clickButton('Next page');
    const page2Req = http.expectOne(
      (r) => r.url === `${base}/activities` && r.params.get('offset') === '8',
    );
    page2Req.flush({ items: [yalaSafari], next_offset: null });
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(2);
    expect(page.querySelector('.experience-card')?.textContent).toContain('Yala Wildlife Safari');
  });

  it('handles empty state when no approved activities exist and error/retry state on failure', () => {
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === `${base}/activities`)
      .flush({ detail: 'Service unavailable' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    expect(page.textContent).toContain('Could not load experiences');
    expect(page.querySelectorAll('.experience-card')).toHaveLength(0);

    clickButton('Retry');
    http.expectOne((r) => r.url === `${base}/activities`).flush({ items: [], next_offset: null });
    fixture.detectChanges();

    expect(page.textContent).toContain('No approved experiences available yet');
  });
});

describe('Experiences Route & Guard Structure', () => {
  it('preserves route structure and guards', async () => {
    const travelerShell = routes.find((route) => route.path === '' && Array.isArray(route.children));
    const experiencesRoute =
      travelerShell?.children?.find((route) => route.path === 'experiences') ??
      routes.find((route) => route.path === 'experiences');
    expect(experiencesRoute).toBeDefined();
    expect(routes.find((route) => route.path === 'provider/dashboard')?.canActivate).toEqual([
      providerAuthGuard,
    ]);
    const children = await experiencesRoute?.loadChildren?.();
    expect(children).toEqual([
      expect.objectContaining({ path: 'wishlist' }),
      expect.objectContaining({ path: 'bookings' }),
      expect.objectContaining({ path: 'bookings/:bookingId' }),
      expect.objectContaining({ path: ':id/book' }),
      expect.objectContaining({ path: '' }),
      expect.objectContaining({ path: ':id' }),
    ]);
  });
});
