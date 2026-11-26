import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanService } from '../../services/artisan.service';
import { FavoriteService } from '../../services/favorite.service';
import { ArtisanDiscoveryComponent } from './artisan-discovery.component';

describe('ArtisanDiscoveryComponent', () => {
  let component: ArtisanDiscoveryComponent;
  let fixture: ComponentFixture<ArtisanDiscoveryComponent>;

  const mockPagination = {
    items: [
      {
        id: 121,
        provider_profile_id: 9,
        title: 'Vavuniya Hand-finished Clay Planter',
        description: 'Sample craft showcase in terracotta.',
        craft_category: 'Pottery & Ceramics',
        district: 'Vavuniya',
        city: 'Vavuniya',
        latitude: 8.7514,
        longitude: 80.4971,
        price: 2200,
        currency: 'LKR',
        cover_image_url: '/images/s2.jpeg',
        is_active: true,
        is_verified: true,
        is_featured: false,
        approval_status: 'approved',
        average_rating: null,
        total_reviews: 0,
      },
      {
        id: 120,
        provider_profile_id: 8,
        title: 'Mullaitivu Incised Clay Bowl',
        description: 'Traditional handmade clay craft.',
        craft_category: 'Pottery & Ceramics',
        district: 'Mullaitivu',
        city: 'Mullaitivu',
        latitude: 9.2671,
        longitude: 80.8143,
        price: 1750,
        currency: 'LKR',
        cover_image_url: null,
        is_active: true,
        is_verified: true,
        is_featured: false,
        approval_status: 'approved',
        average_rating: null,
        total_reviews: 0,
      },
    ],
    total: 2,
    page: 1,
    page_size: 12,
    total_pages: 1,
  };

  const artisanServiceMock = {
    getListings: vi.fn().mockReturnValue(of(mockPagination)),
    getCategories: vi.fn().mockReturnValue(of(['Handicrafts', 'Pottery & Ceramics'])),
  };

  const favoriteServiceMock = {
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: true })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    artisanServiceMock.getListings.mockReturnValue(of(mockPagination));

    await TestBed.configureTestingModule({
      imports: [ArtisanDiscoveryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtisanDiscoveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders Search bar and 9 SVG icon categories without Demo banner or duplicate chrome', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-traveler-navbar')).toBeNull();
    expect(el.querySelector('.search-pill-bar')).toBeTruthy();
    expect(el.querySelectorAll('.category-icon-card').length).toBe(9);
    expect(el.querySelector('app-footer')).toBeNull();
    expect(el.querySelector('.demo-mode-badge')).toBeFalsy();
  });

  it('renders actual listing count and cards without fabricated ratings', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.results-count')?.textContent?.trim()).toBe('2 Artisans Found');
    expect(el.querySelectorAll('app-artisan-card').length).toBe(2);
    expect(el.querySelectorAll('app-rating-stars').length).toBe(0);
  });

  it('displays error state with Retry Connection button without falling back to mock data', () => {
    artisanServiceMock.getListings.mockReturnValue(throwError(() => new Error('Network failure')));
    component.fetchListings();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.hasError()).toBe(true);
    expect(component.listings().length).toBe(0);
    expect(el.querySelector('.error-state')?.textContent).toContain('Unable to Load Artisans');
    expect(el.querySelector('.results-count')?.textContent?.trim()).toBe('0 Artisans Found');
  });

  it('applies filters from the filters modal and resets on clearAllFilters', () => {
    component.openFiltersModal();
    component.draftDistrict = 'Kandy';
    component.draftMaxPrice = 3000;
    component.applyModalFilters();

    expect(component.selectedDistrict()).toBe('Kandy');
    expect(component.maxPrice()).toBe(3000);

    component.clearAllFilters();
    expect(component.selectedDistrict()).toBeNull();
    expect(component.maxPrice()).toBeNull();
  });
});
