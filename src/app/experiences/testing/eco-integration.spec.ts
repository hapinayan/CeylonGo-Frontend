import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { ActivityDetails } from '../models/activity';
import { ActivitiesApi, toActivityCard } from '../services/activities-api';

const base = environment.apiBaseUrl;

const sampleActivity: ActivityDetails = {
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

describe('Adventure Activities Details & API Integration', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serializes public discovery query parameters and maps activity details without inventing reviews', () => {
    const api = TestBed.inject(ActivitiesApi);
    api
      .discover({
        destination: 'Ella',
        category: 'hiking-trekking',
        date: '2026-12-12',
        participants: 2,
        min_price: 1000,
        max_price: 5000,
        sort: 'price_asc',
        limit: 8,
        offset: 0,
      })
      .subscribe((res) => {
        expect(res.items).toHaveLength(1);
        expect(toActivityCard(res.items[0]).rating).toBeNull();
      });

    const req = http.expectOne((r) => r.url === `${base}/activities`);
    expect(req.request.params.get('destination')).toBe('Ella');
    expect(req.request.params.get('category')).toBe('hiking-trekking');
    expect(req.request.params.get('date')).toBe('2026-12-12');
    expect(req.request.params.get('participants')).toBe('2');
    expect(req.request.params.get('min_price')).toBe('1000');
    expect(req.request.params.get('max_price')).toBe('5000');
    expect(req.request.params.get('sort')).toBe('price_asc');
    expect(req.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    req.flush({ items: [sampleActivity], next_offset: null });
  });

  it('renders ExperienceDetails with activity metadata, neutral reviews state, activity:null fallback, and 404 handling', async () => {
    const harness = await RouterTestingHarness.create('/experiences/41');
    expect(harness.routeNativeElement?.textContent).toContain('Loading experience');

    http.expectOne(`${base}/activities/41`).flush(sampleActivity);
    http.expectOne((r) => r.url === `${base}/activities/41/availability`).flush([]);
    harness.detectChanges();
    http
      .match((r) => r.url.startsWith(`${base}/weather/`))
      .forEach((r) => r.flush({}, { status: 503, statusText: 'Unavailable' }));
    http
      .expectOne(`${base}/recommendations/similar/41?limit=5`)
      .flush({ recommendation_type: 'similar_services', items: [] });
    harness.detectChanges();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Ella Ridge Hike');
    expect(text).toContain('Ridge viewpoint');
    expect(text).toContain('Stay on the marked trail');
    expect(text).toContain('Ella Trails');
    expect(text).toContain('not available in this Academic MVP release');
    expect(harness.routeNativeElement?.querySelector('img[src*="/api/v1/listings/41/photos/12"]')).not.toBeNull();

    // Activity with incomplete metadata (activity: null)
    await harness.navigateByUrl('/experiences/42');
    http.expectOne(`${base}/activities/42`).flush({ ...sampleActivity, id: 42, activity: null, photos: [] });
    http.expectOne((r) => r.url === `${base}/activities/42/availability`).flush([]);
    harness.detectChanges();
    http
      .match((r) => r.url.startsWith(`${base}/weather/`))
      .forEach((r) => r.flush({}, { status: 503, statusText: 'Unavailable' }));
    http
      .expectOne(`${base}/recommendations/similar/42?limit=5`)
      .flush({ recommendation_type: 'similar_services', items: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('schedule configuration is incomplete');

    // Missing / unpublished listing (404)
    await harness.navigateByUrl('/experiences/43');
    http.expectOne(`${base}/activities/43`).flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('removed or unpublished');
  }, 15000);
});
