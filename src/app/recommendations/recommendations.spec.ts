import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { ANONYMOUS_API_REQUEST } from '../core/interceptors/auth.interceptor';
import { User } from '../core/models/auth.models';
import { TravelerAccountService } from '../traveler-account/traveler-account.service';
import { Card, Category, DETAIL_PATH } from './recommendation.models';
import { RecommendationService } from './recommendation.service';
import { Recommendations } from './recommendations';
import { RecommendationSettings } from './recommendation-settings';

const url = environment.apiBaseUrl + '/recommendations';
const card = (
  listing_id: number,
  category: Category = 'homestay',
  recommendation_reason = 'Popular among travelers',
): Card => ({
  listing_id,
  category,
  recommendation_reason,
  title: 'Listing ' + listing_id,
  short_description: '',
  district: 'Galle',
  location: 'Galle',
  cover_image_url: null,
  starting_price: null,
  currency: null,
  pricing_unit: null,
  rating: null,
  recommendation_score: 99,
  detail_route: '',
  bookable: false,
});

describe('Recommendations', () => {
  let api: RecommendationService;
  let http: HttpTestingController;
  const user = signal<User | null>(null);
  const token = signal<string | null>(null);
  const account = (id: number | null) => {
    user.set(id === null ? null : ({ id, role: 'traveler' } as User));
    token.set(id === null ? null : 'token-' + id);
    TestBed.tick();
  };
  const respondSettings = (enabled: boolean) =>
    http.expectOne(url + '/settings').flush({ behavioral_personalization: enabled });

  beforeEach(() => {
    user.set(null);
    token.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { currentUser: user, getToken: token, isAuthenticated: () => !!token() },
        },
      ],
    });
    api = TestBed.inject(RecommendationService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => http.verify());

  it('uses the documented public and traveler group endpoints and query parameters', () => {
    api.popular({ category: 'guide', limit: 3 }).subscribe();
    const popular = http.expectOne((req) => req.url === url + '/popular');
    expect(popular.request.params.get('category')).toBe('guide');
    expect(popular.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    popular.flush({ items: [] });
    api.home().subscribe();
    const home = http.expectOne(url + '/home');
    expect(home.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    home.flush({ sections: [] });
    account(1);
    respondSettings(false);
    api.me({ recommendation_type: 'favorite_destinations' }).subscribe();
    const personal = http.expectOne((req) => req.url === url + '/me');
    expect(personal.request.params.get('recommendation_type')).toBe('favorite_destinations');
    personal.flush({ items: [] });
    api.home().subscribe();
    const authenticated = http.expectOne(url + '/home');
    expect(authenticated.request.context.get(ANONYMOUS_API_REQUEST)).toBe(false);
    authenticated.flush({ sections: [] });
  });

  it('honors consent, normalizes searches, deduplicates views, and clears history', () => {
    const view = { event_type: 'view', listing_id: 2, category: 'artisan' } as const;
    api.track(view);
    http.expectNone(url + '/activity');
    account(1);
    respondSettings(false);
    api.track(view);
    http.expectNone(url + '/activity');
    api.updateSettings(true).subscribe();
    const patch = http.expectOne({ method: 'PATCH', url: url + '/settings' });
    expect(patch.request.body).toEqual({ behavioral_personalization: true });
    patch.flush({ behavioral_personalization: true });
    api.track(view);
    api.track(view);
    const recorded = http.expectOne({ method: 'POST', url: url + '/activity' });
    expect(recorded.request.body).toEqual(view);
    recorded.flush({ recorded: true, reason: 'recorded' });
    api.search({ category: 'adventure', destination: '  Ella  ' });
    const search = http.expectOne(url + '/activity');
    expect(search.request.body.destination).toBe('ella');
    search.flush({ recorded: true, reason: 'recorded' });
    const revision = api.revision();
    api.clearHistory().subscribe();
    http.expectOne({ method: 'DELETE', url: url + '/history' }).flush(null);
    expect(api.revision()).toBe(revision + 1);
    api.updateSettings(false).subscribe();
    http
      .expectOne({ method: 'PATCH', url: url + '/settings' })
      .flush({ behavioral_personalization: false });
    api.track(view);
    http.expectNone(url + '/activity');
  });

  it('refreshes only after the existing traveler preference save succeeds', () => {
    account(1);
    respondSettings(false);
    const revision = api.revision();
    const preferences = {
      interests: ['photography'] as const,
      preferred_destinations: [],
      budget_min: null,
      budget_max: null,
      travel_style: null,
      accommodation_preferences: [],
      transport_preferences: [],
    };
    TestBed.inject(TravelerAccountService)
      .savePreferences({
        ...preferences,
        interests: [...preferences.interests],
      })
      .subscribe();
    const save = http.expectOne({
      method: 'PUT',
      url: environment.apiBaseUrl + '/traveler/preferences',
    });
    expect(api.revision()).toBe(revision);
    save.flush(preferences);
    expect(api.revision()).toBe(revision + 1);
  });

  it('renders all categories with real Angular detail paths and labels fallback as popular', () => {
    const fixture = TestBed.createComponent(Recommendations);
    fixture.detectChanges();
    TestBed.tick();
    expect(fixture.nativeElement.querySelector('[aria-busy]')).toBeTruthy();
    const categories = Object.keys(DETAIL_PATH) as Category[];
    http
      .expectOne((req) => req.url === url + '/home')
      .flush({
        sections: [
          {
            recommendation_type: 'recommended_for_you',
            items: categories.map((kind, index) => card(index + 1, kind)),
          },
          { recommendation_type: 'because_you_viewed', items: [] },
        ],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Popular Experiences');
    expect(fixture.nativeElement.textContent).not.toContain('Because You Viewed');
    expect(fixture.nativeElement.textContent).not.toContain('99');
    const links: HTMLAnchorElement[] = [...fixture.nativeElement.querySelectorAll('article a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/homestays/1',
      '/experiences/2',
      '/tour-guides/3',
      '/bicycles/4',
      '/bicycles/5',
      '/artisans/6',
    ]);
  });

  it('excludes the source and duplicates, retries failed similar requests, and ignores empty groups', () => {
    const fixture = TestBed.createComponent(Recommendations);
    fixture.componentRef.setInput('sourceId', 11);
    fixture.componentRef.setInput('category', 'guide');
    fixture.detectChanges();
    TestBed.tick();
    const request = () => http.expectOne((req) => req.url === url + '/similar/11');
    request().flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    TestBed.tick();
    request().flush({
      recommendation_type: 'similar_services',
      items: [card(11), card(12), card(12)],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Similar Services');
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Listing 11');
  });

  it('confirms history deletion and shows backend failures without clearing implicitly', () => {
    account(1);
    const fixture = TestBed.createComponent(RecommendationSettings);
    fixture.detectChanges();
    TestBed.tick();
    respondSettings(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').checked).toBe(false);
    fixture.nativeElement.querySelector('section button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your bookings, wishlist items');
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    const buttons = [...dialog.querySelectorAll('button')];
    buttons.find((button) => button.textContent?.includes('Clear history'))!.click();
    const request = http.expectOne({ method: 'DELETE', url: url + '/history' });
    request.flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not clear recommendation history.');
  });

  it('cancels obsolete requests and hides another account’s results immediately', () => {
    const fixture = TestBed.createComponent(Recommendations);
    fixture.detectChanges();
    TestBed.tick();
    const pending = http.expectOne((req) => req.url === url + '/home');
    account(1);
    expect(pending.cancelled).toBe(true);
    respondSettings(false);
    http
      .expectOne((req) => req.url === url + '/home')
      .flush({
        sections: [
          {
            recommendation_type: 'recommended_for_you',
            items: [card(4, 'bike', 'Matches your interests')],
          },
        ],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Listing 4');
    account(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Listing 4');
    respondSettings(false);
    const second = http.expectOne((req) => req.url === url + '/home');
    account(null);
    expect(second.cancelled).toBe(true);
    http.expectOne((req) => req.url === url + '/home').flush({ sections: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No recommendations are available');
  });
});
