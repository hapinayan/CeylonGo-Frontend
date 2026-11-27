import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { MvpGuideDetails, MvpGuideSlot } from '../../../core/models/tour-guide.models';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { LiveWeatherService } from '../../../core/services/live-weather.service';
import { TourGuideDetailComponent } from './tour-guide-detail.component';

describe('TourGuideDetailComponent (Live Backend Integration)', () => {
  let component: TourGuideDetailComponent;
  let fixture: ComponentFixture<TourGuideDetailComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let authModalService: AuthModalService;
  let router: Router;
  const apiBase = environment.apiBaseUrl;

  const sampleDetail: MvpGuideDetails = {
    listing: {
      id: 41,
      provider_id: 10,
      category: 'guide',
      title: 'Chaminda Perera',
      description: 'Certified highland and cultural guide.',
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
          storage_key: 'mvp-photo/1.jpg',
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
      categories: ['cultural_heritage'],
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
        itinerary: 'Station\nBridge',
        duration_hours: '2.00',
        pricing_type: 'per_group',
        price: '4500.00',
        currency: 'LKR',
        max_people: 6,
        included_services: 'Guide commentary',
        excluded_services: 'Entry tickets',
        meeting_point: 'Ella station',
        is_active: true,
      },
      {
        id: 24,
        title: 'Ella Sunrise Hike',
        description: 'Morning nature trek in Ella.',
        duration_hours: '3.00',
        pricing_type: 'per_person',
        price: '2500.00',
        currency: 'LKR',
        max_people: 8,
        meeting_point: 'Ella station',
        is_active: true,
      },
    ],
  };

  const sampleSlots: MvpGuideSlot[] = [
    {
      id: 72,
      package_id: 23,
      starts_at: '2026-12-12T03:30:00Z',
      ends_at: '2026-12-12T05:30:00Z',
      available: true,
      capacity: 6,
      total_amount: '4500.00',
      currency: 'LKR',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourGuideDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LiveWeatherService,
          useValue: {
            getCurrentWeather: vi.fn().mockReturnValue(EMPTY),
            getForecast: vi.fn().mockReturnValue(EMPTY),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '41' }),
              queryParamMap: convertToParamMap({ travelers: '3' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuideDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    authModalService = TestBed.inject(AuthModalService);
    router = TestBed.inject(Router);
    fixture.detectChanges();

    httpMock.expectOne(`${apiBase}/tour-guides/41`).flush(sampleDetail);
    httpMock
      .expectOne(`${apiBase}/tour-guides/41/availability?package_id=23&participants=3`)
      .flush(sampleSlots);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders backend guide profile, packages, single non-duplicated photo, map, and server-quoted total', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Chaminda Perera');
    expect(compiled.textContent).toContain('Specializations');
    expect(compiled.textContent).toContain('Qualifications & Licenses');
    expect(compiled.textContent).toContain('Tour Packages (2)');
    expect(compiled.textContent).toContain('Book This Guide');
    expect(compiled.querySelector('.gallery-one')).toBeTruthy();
    expect(compiled.querySelectorAll('.gallery-tile').length).toBe(1);
    expect(compiled.querySelector('app-location-picker')).toBeTruthy();
    expect(component.totalPrice()).toBe(4500);
  });

  it('re-fetches availability and server-calculated quote when switching to per_person package', () => {
    const hikePkg = component.packages()[1];
    component.selectPackage(hikePkg);

    httpMock
      .expectOne(`${apiBase}/tour-guides/41/availability?package_id=24&participants=3`)
      .flush([
        {
          id: 75,
          package_id: 24,
          starts_at: '2026-12-13T01:30:00Z',
          ends_at: '2026-12-13T04:30:00Z',
          available: true,
          capacity: 8,
          total_amount: '7500.00',
          currency: 'LKR',
        },
      ]);

    expect(component.totalPrice()).toBe(7500);
  });

  it('gates Continue to Booking behind traveler login and forwards slotId when signed in', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValueOnce(false);
    const openSpy = vi.spyOn(authModalService, 'open');

    component.continueToBooking();
    expect(openSpy).toHaveBeenCalledWith('login', undefined, expect.objectContaining({ type: 'booking' }));

    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.continueToBooking();

    expect(navSpy).toHaveBeenCalledWith(
      ['/tour-guides', '41', 'booking'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          packageId: '23',
          slotId: 72,
          travelers: 3,
        }),
      })
    );
  });
});
