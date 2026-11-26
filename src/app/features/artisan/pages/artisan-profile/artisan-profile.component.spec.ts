import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanProfileComponent } from './artisan-profile.component';
import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { FavoriteService } from '../../services/favorite.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { ArtisanListingResponse } from '../../models/artisan.models';

describe('ArtisanProfileComponent', () => {
  let component: ArtisanProfileComponent;
  let fixture: ComponentFixture<ArtisanProfileComponent>;

  const liveListing: ArtisanListingResponse = {
    id: 121,
    provider_profile_id: 9,
    title: 'Vavuniya Hand-finished Clay Planter',
    craft_category: 'Pottery & Ceramics',
    description: 'Sample craft showcase in terracotta.',
    district: 'Vavuniya',
    city: 'Vavuniya',
    address: 'Vavuniya, Sri Lanka',
    latitude: 8.7514,
    longitude: 80.4971,
    phone: null,
    email: null,
    website_url: null,
    opening_hours: null,
    cover_image_url: '/images/artisan/ruhunu_pottery.jpg',
    price: 2200,
    currency: 'LKR',
    is_active: true,
    is_verified: true,
    is_featured: false,
    approval_status: 'approved',
    average_rating: null,
    total_reviews: 0,
    images: [],
    business_images: [
      { id: 1, artisan_listing_id: 121, image_url: '/images/artisan/ruhunu_pottery.jpg', caption: null, display_order: 0, is_cover: true, created_at: '' },
    ],
    business_hours: [],
    created_at: '',
    updated_at: '',
  };

  const artisanServiceMock = {
    getListingById: vi.fn().mockReturnValue(of(liveListing)),
    getListings: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, page_size: 20 })),
  };

  const productServiceMock = {
    getProductsByListing: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 })),
  };

  const reviewServiceMock = {
    getListingReviews: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, page_size: 10, total_pages: 0, average_rating: 0, total_reviews: 0 })),
    getListingReviewSummary: vi.fn().mockReturnValue(of({ listing_id: 121, listing_title: '', average_rating: 0, total_reviews: 0, rating_breakdown: {}, verified_reviews_count: 0 })),
  };

  const favoriteServiceMock = {
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: true })),
  };

  const authServiceMock = {
    isAuthenticated: vi.fn().mockReturnValue(false),
    currentUser: vi.fn().mockReturnValue(null),
  };

  let authModalService: AuthModalService;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    artisanServiceMock.getListingById.mockReturnValue(of(liveListing));
    authServiceMock.isAuthenticated.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [ArtisanProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: ReviewService, useValue: reviewServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', '121']])),
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    authModalService = TestBed.inject(AuthModalService);
    vi.spyOn(authModalService, 'open');
    fixture = TestBed.createComponent(ArtisanProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders compact gallery, vertical sections, and sticky sidebar without tabs or duplicate chrome', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-traveler-navbar')).toBeNull();
    expect(el.querySelector('.compact-gallery')).toBeTruthy();
    expect(el.querySelector('.sticky-contact-card')).toBeTruthy();
    expect(el.querySelector('app-footer')).toBeNull();
    expect(el.querySelectorAll('.tab-btn').length).toBe(0);
    expect(el.querySelector('.business-title')?.textContent).toContain('Vavuniya Hand-finished Clay Planter');
  });

  it('hides unavailable phone/email/website contact buttons and shows honest empty reviews', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Call Business');
    expect(el.querySelector('.empty-reviews-card')?.textContent).toContain('No reviews yet');
  });

  it('opens TravelerAuthModal when a guest clicks Save to Wishlist', () => {
    component.toggleWishlist();
    expect(authModalService.open).toHaveBeenCalledWith('login', undefined, { type: 'wishlist' });
  });

  it('shows honest error state on backend failure without demo fallback', () => {
    artisanServiceMock.getListingById.mockReturnValue(throwError(() => new Error('404')));
    component.loadProfileData(999);
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(fixture.nativeElement.querySelector('.error-state-card')).toBeTruthy();
  });
});
