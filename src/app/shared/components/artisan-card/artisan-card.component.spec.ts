import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanListingSummary } from '../../../features/artisan/models/artisan.models';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { ArtisanCardComponent, NEUTRAL_ARTISAN_PLACEHOLDER } from './artisan-card.component';

describe('ArtisanCardComponent', () => {
  let component: ArtisanCardComponent;
  let fixture: ComponentFixture<ArtisanCardComponent>;

  const favoriteServiceMock = {
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: true })),
  };
  const authServiceMock = {
    isAuthenticated: vi.fn().mockReturnValue(true),
  };
  const authModalMock = {
    open: vi.fn(),
  };

  const mockListing: ArtisanListingSummary = {
    id: 1,
    provider_profile_id: 10,
    title: 'Kandy Heritage Crafts',
    description: 'Hand-carved ceremonial masks and brassware.',
    craft_category: 'Woodcarving & Masks',
    district: 'Kandy',
    city: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    price: 2500,
    currency: 'LKR',
    cover_image_url: '/images/s2.jpeg',
    is_active: true,
    is_verified: true,
    is_featured: true,
    approval_status: 'approved',
    average_rating: 4.9,
    total_reviews: 186,
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    favoriteServiceMock.toggleBusinessWishlist.mockClear();
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authModalMock.open.mockClear();

    await TestBed.configureTestingModule({
      imports: [ArtisanCardComponent],
      providers: [
        provideRouter([]),
        { provide: FavoriteService, useValue: favoriteServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthModalService, useValue: authModalMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtisanCardComponent);
    component = fixture.componentInstance;
    component.listing = mockListing;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders business title, verified badge, location, description, and View Details link', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card-title')?.textContent).toContain('Kandy Heritage Crafts');
    expect(el.querySelector('app-verified-badge')).toBeTruthy();
    expect(el.querySelector('.location-text')?.textContent).toContain('Kandy');
    expect(el.querySelector('.card-desc')?.textContent).toContain('Hand-carved');
    expect(el.querySelector('.view-details-btn')?.textContent?.trim()).toBe('View Details');
  });

  it('triggers wishlist toggle when authenticated and opens login modal for guests', () => {
    const event = new MouseEvent('click');
    component.toggleWishlist(event);
    expect(favoriteServiceMock.toggleBusinessWishlist).toHaveBeenCalledWith(1);

    authServiceMock.isAuthenticated.mockReturnValue(false);
    component.toggleWishlist(new MouseEvent('click'));
    expect(authModalMock.open).toHaveBeenCalledWith('login', undefined, { type: 'wishlist' });
  });

  it('uses neutral placeholder when no cover image is provided', () => {
    const noImgFixture = TestBed.createComponent(ArtisanCardComponent);
    noImgFixture.componentInstance.listing = { ...mockListing, cover_image_url: null };
    noImgFixture.detectChanges();
    const img = noImgFixture.nativeElement.querySelector('.card-img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(NEUTRAL_ARTISAN_PLACEHOLDER);
  });
});
