import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { LiveCatalog } from '../pages/discover/live-catalog';
import { experiencesRoutes } from '../experiences.routes';
import { EXPERIENCE_CATALOG } from '../services/catalog';
import { EcoApi } from '../services/eco-api';

const url = environment.apiBaseUrl + '/eco-experiences';
const item = {
  id: 42, title: 'Forest Walk', eco_category: 'Forest & Nature Trails', city: 'Ella', district: 'Badulla',
  duration_hours: '2.50', base_price: '1200.50', currency: 'LKR', pricing_type: 'per_group',
  max_group_size: 6, has_verified_eco_badge: true,
};
const page = { items: [item], page: 1, page_size: 8, total: 9, total_pages: 2 };

describe('Public Eco API and UI', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes.map(route => route.path === 'experiences' ? {
        ...route,
        loadChildren: () => experiencesRoutes.map(child => ({
          ...child,
          providers: [{ provide: EXPERIENCE_CATALOG, useValue: { preview: false, experiences: [] } }],
        })),
      } : route)), provideHttpClient(), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('serializes supported filters and maps pricing without inventing reviews or images', () => {
    TestBed.inject(EcoApi).browse({
      search: 'Ella & hills', category: 'Forest & Nature Trails', badgeOnly: true, page: 2,
      district: 'Badulla', minPrice: 0, maxPrice: 2500, minDuration: 1.5, maxDuration: 4,
    }).subscribe(result => expect(result).toEqual({
      items: [{
        id: '42', title: 'Forest Walk', category: 'eco', categoryLabel: 'Forest & Nature Trails',
        location: 'Ella, Badulla', currency: 'LKR', price: 1200.5, unit: 'group',
      }],
      total: 9, pages: 2,
    }));
    const request = http.expectOne(req => req.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('Ella & hills');
    expect(request.request.params.get('category')).toBe('Forest & Nature Trails');
    expect(request.request.params.get('eco_badge_only')).toBe('true');
    expect(request.request.params.get('district')).toBe('Badulla');
    expect(request.request.params.get('min_price')).toBe('0');
    expect(request.request.params.get('max_price')).toBe('2500');
    expect(request.request.params.get('min_duration_hours')).toBe('1.5');
    expect(request.request.params.get('max_duration_hours')).toBe('4');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('8');
    expect(request.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    request.flush(page);
  });

  it('loads category metadata, cancels stale searches, and renders loading, error, retry, paging and empty states', () => {
    const fixture = TestBed.createComponent(LiveCatalog);
    const element: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    expect(element.textContent).toContain('Loading experiences');
    http.expectOne(url + '/categories').flush([item.eco_category]);
    const stale = http.expectOne(req => req.url === url);
    fixture.componentInstance.searchInput.setValue('Ella');
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(stale.cancelled).toBe(true);
    http.expectOne(req => req.params.get('search') === 'Ella').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.textContent).toContain('Could not load experiences');
    expect(element.querySelectorAll('.experience-card')).toHaveLength(0);
    fixture.componentInstance.retry();
    fixture.detectChanges();
    http.expectOne(url + '/categories').flush([item.eco_category]);
    http.expectOne(req => req.params.get('search') === 'Ella').flush(page);
    fixture.detectChanges();
    expect(element.textContent).toContain('9 Experiences');
    expect(element.querySelector('.experience-card')?.textContent).toContain('LKR 1,200.5 / group');
    expect(element.querySelector<HTMLAnchorElement>('.experience-card h3 a')?.getAttribute('href')).toBe('/experiences/42');
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    http.expectOne(req => req.url === url && req.params.get('page') === '2')
      .flush({ ...page, items: [], total: 0, total_pages: 0 });
    fixture.detectChanges();
    expect(element.textContent).toContain('No experiences match');
    expect(element.querySelectorAll('.eco-range-filters')).toHaveLength(1);
  });

  it('resets paging and clears the Eco taxonomy when returning to All Experiences', () => {
    const fixture = TestBed.createComponent(LiveCatalog);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url + '/categories').flush([item.eco_category]);
    http.expectOne(req => req.url === url).flush(page);
    component.setCategory(item.eco_category);
    component.page.set(2);
    fixture.detectChanges();
    http.expectOne(req => req.params.get('category') === item.eco_category && req.params.get('page') === '2').flush(page);
    component.selectCategory('all');
    fixture.detectChanges();
    http.expectOne(req => req.url === url && !req.params.has('category') && req.params.get('page') === '1').flush(page);
  });

  it('opens numeric detail routes, renders Eco data, and handles unpublished or missing results', async () => {
    const harness = await RouterTestingHarness.create('/experiences/42');
    expect(harness.routeNativeElement?.textContent).toContain('Loading experience');
    http.expectOne(url + '/42').flush({
      ...item, description: 'A guided walk', environmental_guidelines: 'Stay on marked paths',
      wildlife_safety_summary: 'Observe at a distance', meeting_point: 'Trailhead', min_participants: 2,
      images: [{ id: 1, image_url: '/uploads/eco_experiences/forest.jpg', is_primary: true, sort_order: 0 }],
    });
    http.expectOne(req => req.url === url + '/42/reviews').flush({ total: 1, average_rating: 5, items: [] });
    http.expectOne(req => req.url === url + '/42/availability').flush([]);
    harness.detectChanges();
    http.expectOne(req => req.url === environment.apiBaseUrl + '/weather/locations')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('The weather service is currently unavailable.');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Stay on marked paths');
    expect(harness.routeNativeElement?.textContent).toContain('Verified Eco-Friendly Badge');
    expect(harness.routeNativeElement?.textContent).toContain('No open slots');
    expect(harness.routeNativeElement?.querySelector('img[src*="forest.jpg"]')).not.toBeNull();
    await harness.navigateByUrl('/experiences/43');
    http.expectOne(url + '/43').flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('removed or unpublished');
  }, 15000);
});
