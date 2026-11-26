import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { MvpGuidePage } from '../../core/models/tour-guide.models';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { TourGuideService } from '../../core/services/tour-guide.service';
import { TourGuidesComponent } from './tour-guides.component';

describe('TourGuidesComponent (Live Backend Integration)', () => {
  let component: TourGuidesComponent;
  let fixture: ComponentFixture<TourGuidesComponent>;
  let guideService: TourGuideService;
  let httpMock: HttpTestingController;
  let authModalService: AuthModalService;
  let authService: AuthService;
  const apiBase = environment.apiBaseUrl;

  const sampleBackendResponse: MvpGuidePage = {
    items: [
      {
        listing: {
          id: 41,
          provider_id: 10,
          category: 'guide',
          title: 'Chaminda Perera',
          description: 'Certified local guide in Kandy.',
          district: 'Kandy',
          locality: 'Kandy City',
          price: '8000.00',
          currency: 'LKR',
          approval_status: 'approved',
          is_active: true,
          media: [],
          units: [],
          created_at: '2026-11-20T08:00:00Z',
        },
        provider_name: 'Kandy Heritage Walks',
        profile: {
          years_of_experience: 7,
          categories: ['cultural_heritage'],
          languages: [
            {
              language_code: 'en',
              language_name: 'English',
              proficiency_level: 'fluent',
              is_primary: true,
            },
          ],
          service_areas: [],
          cancellation_policy: null,
        },
        packages: [
          {
            id: 23,
            title: 'Kandy Temple & Lake Walk',
            description: 'Historical guided tour of Kandy.',
            duration_hours: '3.00',
            pricing_type: 'per_group',
            price: '8000.00',
            currency: 'LKR',
            max_people: 6,
            meeting_point: 'Queens Hotel',
            is_active: true,
          },
        ],
      },
    ],
    next_offset: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourGuidesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuidesComponent);
    component = fixture.componentInstance;
    guideService = TestBed.inject(TourGuideService);
    httpMock = TestBed.inject(HttpTestingController);
    authModalService = TestBed.inject(AuthModalService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('displays 0 Tour Guides and proper empty state when backend returns 0 approved guides', () => {
    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    httpMock
      .expectOne(`${apiBase}/tour-guides?limit=100&offset=0`)
      .flush({ items: [], next_offset: null });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('0 Tour Guides');
    expect(compiled.textContent).toContain('No approved tour guides available yet');
    expect(compiled.textContent).not.toContain('Preview Sample Data');
  });

  it('renders real guides returned from backend without hardcoded counts', () => {
    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    httpMock
      .expectOne(`${apiBase}/tour-guides?limit=100&offset=0`)
      .flush(sampleBackendResponse);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1 Tour Guides');
    const cards = compiled.querySelectorAll('.guide-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Chaminda Perera');
    expect(cards[0].textContent).toContain('LKR 8,000');
    const link = cards[0].querySelector('a.btn-view-profile');
    expect(link?.getAttribute('href')).toContain('/tour-guides/41');
  });

  it('shows explicit error and Retry button when backend request fails', () => {
    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    httpMock
      .expectOne(`${apiBase}/tour-guides?limit=100&offset=0`)
      .flush({ detail: 'Backend unreachable' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-title')?.textContent).toContain('Unable to Load Tour Guides');
    expect(compiled.querySelector('.retry-btn')).toBeTruthy();

    component.retryLoadGuides();
    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    httpMock
      .expectOne(`${apiBase}/tour-guides?limit=100&offset=0`)
      .flush(sampleBackendResponse);
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.guide-card').length).toBe(1);
  });

  it('opens TravelerAuthModal when guest clicks wishlist button', () => {
    httpMock.expectOne(`${apiBase}/tour-guides/categories`).flush([]);
    httpMock
      .expectOne(`${apiBase}/tour-guides?limit=100&offset=0`)
      .flush(sampleBackendResponse);
    fixture.detectChanges();

    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const openSpy = vi.spyOn(authModalService, 'open');

    const guide = guideService.allGuides()[0];
    component.toggleFavorite(guide, new MouseEvent('click'));

    expect(openSpy).toHaveBeenCalledWith(
      'login',
      null,
      expect.objectContaining({ type: 'wishlist' })
    );
  });
});
