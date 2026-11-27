import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { MvpGuidePage, MvpGuideSlot } from '../models/tour-guide.models';
import { TourGuideService } from './tour-guide.service';

describe('TourGuideService (Live MVP API)', () => {
  let service: TourGuideService;
  let httpMock: HttpTestingController;
  const apiBase = environment.apiBaseUrl;

  const samplePage: MvpGuidePage = {
    items: [
      {
        listing: {
          id: 41,
          provider_id: 10,
          category: 'guide',
          title: 'Nadee Fernando',
          description: 'SLTDA licensed highland guide.\n\nDetailed bio.',
          district: 'Badulla',
          locality: 'Ella',
          latitude: '6.866700',
          longitude: '81.046600',
          price: '4500.00',
          currency: 'LKR',
          approval_status: 'approved',
          is_active: true,
          media: [
            {
              id: 501,
              storage_key: 'mvp-photo/p1.jpg',
              sort_order: 0,
              image_url: '/api/v1/listings/41/photos/501',
            },
          ],
          units: [],
          created_at: '2026-11-20T08:00:00Z',
        },
        provider_name: 'Ella Trails',
        profile: {
          years_of_experience: 6,
          categories: ['cultural_heritage', 'adventure_nature'],
          languages: [
            {
              language_code: 'en',
              language_name: 'English',
              proficiency_level: 'fluent',
              is_primary: true,
            },
          ],
          service_areas: [
            { province: 'Uva', district: 'Badulla', city: 'Ella', is_primary: true },
          ],
          cancellation_policy: 'Free cancellation up to 48 hours prior.',
        },
        packages: [
          {
            id: 23,
            title: 'Ella Heritage Walk',
            description: 'Explore local history with a guide.',
            itinerary: 'Nine Arch Bridge\nLittle Adams Peak',
            duration_hours: '2.00',
            pricing_type: 'per_group',
            price: '4500.00',
            currency: 'LKR',
            max_people: 4,
            included_services: 'Guide commentary',
            excluded_services: 'Entry tickets',
            meeting_point: 'Ella station',
            is_active: true,
          },
        ],
      },
    ],
    next_offset: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TourGuideService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts in live mode with empty guides list instead of hardcoded demo counts', () => {
    expect(service.isDemoMode()).toBe(false);
    expect(service.allGuides().length).toBe(0);
    expect(service.totalCount()).toBe(0);
  });

  it('loads real guides from GET /tour-guides and handles empty backend response with 0 guides', () => {
    service.loadGuides();

    const catReq = httpMock.expectOne(`${apiBase}/tour-guides/categories`);
    catReq.flush([{ slug: 'cultural_heritage', name: 'Cultural & Heritage', examples: 'Temples' }]);

    const listReq = httpMock.expectOne(`${apiBase}/tour-guides?limit=100&offset=0`);
    listReq.flush({ items: [], next_offset: null });

    expect(service.isLoading()).toBe(false);
    expect(service.errorMessage()).toBeNull();
    expect(service.allGuides().length).toBe(0);
    expect(service.totalCount()).toBe(0);
  });

  it('maps real backend guides, packages, and media URLs without fabricating counts or ratings', () => {
    service.loadGuides('Ella');

    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    const listReq = httpMock.expectOne(
      `${apiBase}/tour-guides?limit=100&offset=0&destination=Ella`
    );
    listReq.flush(samplePage);

    expect(service.totalCount()).toBe(1);
    const guide = service.allGuides()[0];
    expect(guide.id).toBe('41');
    expect(guide.name).toBe('Nadee Fernando');
    expect(guide.reviewsCount).toBe(0);
    expect(guide.rating).toBe(0);
    expect(guide.coverImageUrl).toBe('http://127.0.0.1:8000/api/v1/listings/41/photos/501');
    expect(guide.packages?.length).toBe(1);
    expect(guide.packages?.[0].pricingUnit).toBe('per_group');
  });

  it('sets errorMessage and does not fall back to demo data when backend fails', () => {
    service.loadGuides();

    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    const listReq = httpMock.expectOne(`${apiBase}/tour-guides?limit=100&offset=0`);
    listReq.flush({ detail: 'Service unavailable' }, { status: 503, statusText: 'Unavailable' });

    expect(service.allGuides().length).toBe(0);
    expect(service.errorMessage()).toBe('Service unavailable');
  });

  it('fetches availability quotes and persists wishlist via PUT/DELETE', async () => {
    const slotPromise = firstValueFrom(
      service.getGuideAvailability(41, 23, 2, '2026-12-12')
    );
    const availReq = httpMock.expectOne(
      `${apiBase}/tour-guides/41/availability?package_id=23&participants=2&date=2026-12-12`
    );
    const mockSlots: MvpGuideSlot[] = [
      {
        id: 72,
        package_id: 23,
        starts_at: '2026-12-12T03:30:00Z',
        ends_at: '2026-12-12T05:30:00Z',
        available: true,
        capacity: 4,
        total_amount: '4500.00',
        currency: 'LKR',
      },
    ];
    availReq.flush(mockSlots);

    const slots = await slotPromise;
    expect(slots.length).toBe(1);
    expect(slots[0].total_amount).toBe('4500.00');

    service.toggleFavorite('41');
    const putReq = httpMock.expectOne(`${apiBase}/tour-guides/41/wishlist`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ listing_id: 41, saved: true });
    expect(service.isFavorite('41')).toBe(true);

    service.toggleFavorite('41');
    const delReq = httpMock.expectOne(`${apiBase}/tour-guides/41/wishlist`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ listing_id: 41, saved: false });
    expect(service.isFavorite('41')).toBe(false);
  });
});
