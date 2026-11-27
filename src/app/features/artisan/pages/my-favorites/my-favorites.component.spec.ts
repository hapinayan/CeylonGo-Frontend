import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FavoriteService } from '../../services/favorite.service';
import { MyFavoritesComponent } from './my-favorites.component';

describe('MyFavoritesComponent', () => {
  let component: MyFavoritesComponent;
  let fixture: ComponentFixture<MyFavoritesComponent>;

  const mockSavedProducts = {
    items: [
      {
        product_id: 101,
        created_at: '2026-01-01',
        product: {
          id: 101,
          artisan_listing_id: 1,
          title: 'Traditional Wooden Mask',
          price: 7500,
          currency: 'LKR',
          sku: 'Kandy Heritage Crafts',
          image_url: '/images/s2.jpeg',
        },
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
  };

  const mockSavedBusinesses = {
    items: [
      {
        id: 1,
        user_id: 10,
        listing_reference_id: 1,
        artisan_listing_id: 1,
        notes: null,
        created_at: '2026-01-01',
        is_available: true,
        listing: {
          id: 1,
          provider_profile_id: 10,
          title: 'Kandy Heritage Crafts',
          craft_category: 'Handicrafts',
          district: 'Kandy',
          city: 'Kandy',
          cover_image_url: '/images/s2.jpeg',
          approval_status: 'approved',
          is_active: true,
          average_rating: 4.9,
          total_reviews: 186,
        },
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  const favoriteServiceMock = {
    getProductFavorites: vi.fn().mockReturnValue(of(mockSavedProducts)),
    getBusinessWishlist: vi.fn().mockReturnValue(of(mockSavedBusinesses)),
    toggleProductFavorite: vi.fn().mockReturnValue(of({ isFavorite: false })),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: false })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [MyFavoritesComponent],
      providers: [
        provideRouter([]),
        { provide: FavoriteService, useValue: favoriteServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {
              queryParamMap: {
                get: (key: string) => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders saved product with title, artisan name, and LKR price', () => {
    const title = fixture.nativeElement.querySelector('.item-title');
    expect(title.textContent).toContain('Traditional Wooden Mask');

    const price = fixture.nativeElement.querySelector('.item-price');
    expect(price.textContent).toContain('LKR 7,500');
  });

  it('removes product optimistically when remove button is clicked', () => {
    const event = new MouseEvent('click');
    component.removeProductFavorite(event, 101);

    expect(component.savedProducts().length).toBe(0);
    expect(favoriteServiceMock.toggleProductFavorite).toHaveBeenCalledWith(101);
  });
});
