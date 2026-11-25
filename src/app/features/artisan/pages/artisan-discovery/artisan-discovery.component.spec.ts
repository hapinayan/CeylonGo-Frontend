import { ComponentFixture, TestBed } from '@angular/core/testing';
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
        id: 1,
        provider_profile_id: 10,
        title: 'Kandy Heritage Crafts',
        craft_category: 'Woodcarving & Masks',
        district: 'Kandy',
        city: 'Kandy',
        latitude: 7.2906,
        longitude: 80.6337,
        cover_image_url: '/images/s2.jpeg',
        is_active: true,
        is_verified: true,
        is_featured: true,
        approval_status: 'approved',
        average_rating: 4.9,
        total_reviews: 186,
      },
      {
        id: 2,
        provider_profile_id: 11,
        title: 'Ruhunu Pottery House',
        craft_category: 'Pottery & Ceramics',
        district: 'Matara',
        city: 'Matara',
        latitude: 5.9549,
        longitude: 80.555,
        cover_image_url: '/images/s2.jpeg',
        is_active: true,
        is_verified: true,
        is_featured: false,
        approval_status: 'approved',
        average_rating: 4.8,
        total_reviews: 142,
      },
    ],
    total: 2,
    page: 1,
    page_size: 12,
  };

  const artisanServiceMock = {
    getListings: vi.fn().mockReturnValue(of(mockPagination)),
    getCategories: vi.fn().mockReturnValue(of(['Handicrafts', 'Pottery & Ceramics'])),
    getDistricts: vi.fn().mockReturnValue(of(['Kandy', 'Matara', 'Galle'])),
  };

  const favoriteServiceMock = {
    productFavoriteIds: vi.fn().mockReturnValue(new Set()),
    businessWishlistIds: vi.fn().mockReturnValue(new Set()),
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: true })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    artisanServiceMock.getListings.mockReturnValue(of(mockPagination));

    await TestBed.configureTestingModule({
      imports: [ArtisanDiscoveryComponent],
      providers: [
        provideRouter([]),
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ search: '', category: '' }),
            snapshot: {
              queryParamMap: {
                get: (key: string) => null,
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

  it('renders hero title and subtitle matching approved design', () => {
    const title = fixture.nativeElement.querySelector('.hero-title');
    expect(title.textContent).toContain('Discover Local Artisans & Small Businesses');

    const sub = fixture.nativeElement.querySelector('.hero-subtitle');
    expect(sub.textContent).toContain('Support Sri Lankan artisans');
  });

  it('renders dynamic results count', () => {
    const count = fixture.nativeElement.querySelector('.results-count');
    expect(count.textContent).toContain('2 Local Artisans & Businesses');
  });

  it('renders 2 artisan cards from loaded data', () => {
    const cards = fixture.nativeElement.querySelectorAll('app-artisan-card');
    expect(cards.length).toBe(2);
  });

  it('toggles filters drawer on Filters button click', () => {
    expect(component.showFiltersDrawer()).toBe(false);
    component.toggleFiltersDrawer();
    expect(component.showFiltersDrawer()).toBe(true);
  });

  it('sets error state and isolates mock fixtures when backend API fails in production mode', () => {
    artisanServiceMock.getListings.mockReturnValue(throwError(() => new Error('Connection refused')));
    component.fetchListings();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.isFixtureMode()).toBe(false);
    expect(component.listings().length).toBe(0);
  });

  it('activates verified test fixtures in explicit demo preview mode and verifies all 9 demo fixtures', () => {
    component.isFixtureMode.set(true);
    component.fetchListings();
    fixture.detectChanges();

    expect(component.isFixtureMode()).toBe(true);
    expect(component.listings().length).toBe(9);
    expect(component.listings()[0].title).toBe('Kandy Heritage Crafts');
    expect(component.displayedCount()).toBe(9);
  });

  it('respects pagination boundaries in goToPage', () => {
    component.goToPage(999);
    expect(component.currentPage()).toBe(1);

    component.goToPage(-1);
    expect(component.currentPage()).toBe(1);
  });

  it('preserves all 25 official Sri Lankan districts in filter controls', () => {
    component.loadFilterOptions();
    expect(component.districts().length).toBe(25);
    expect(component.districts()).toContain('Jaffna');
    expect(component.districts()).toContain('Kandy');
    expect(component.districts()).toContain('Colombo');
    expect(component.districts()).toContain('Matara');
    expect(component.districts()).toContain('Trincomalee');
  });

  it('removes the large search bar and Where to input from discovery header', () => {
    const searchForm = fixture.nativeElement.querySelector('.search-bar-pill');
    expect(searchForm).toBeNull();
    const locationInput = fixture.nativeElement.querySelector('#locationInput');
    expect(locationInput).toBeNull();
  });

  it('toggles view mode between grid and list', () => {
    expect(component.viewMode()).toBe('grid');
    component.setViewMode('list');
    fixture.detectChanges();
    expect(component.viewMode()).toBe('list');

    const listContainer = fixture.nativeElement.querySelector('.artisan-list');
    expect(listContainer).toBeTruthy();

    component.setViewMode('grid');
    fixture.detectChanges();
    const gridContainer = fixture.nativeElement.querySelector('.artisan-grid');
    expect(gridContainer).toBeTruthy();
  });

  it('calculates activeFilterCount and clears active filters', () => {
    expect(component.hasActiveFilters()).toBe(false);
    expect(component.activeFilterCount()).toBe(0);

    component.selectedDistrict.set('Kandy');
    component.selectedCategory.set('Handicrafts');
    expect(component.hasActiveFilters()).toBe(true);
    expect(component.activeFilterCount()).toBe(2);

    component.clearAllFilters();
    expect(component.selectedDistrict()).toBeNull();
    expect(component.selectedCategory()).toBeNull();
    expect(component.hasActiveFilters()).toBe(false);
  });
});
