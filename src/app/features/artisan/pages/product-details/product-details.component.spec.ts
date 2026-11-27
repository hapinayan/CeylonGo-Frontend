import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { FavoriteService } from '../../services/favorite.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import { ProductDetailsComponent } from './product-details.component';

describe('ProductDetailsComponent', () => {
  let component: ProductDetailsComponent;
  let fixture: ComponentFixture<ProductDetailsComponent>;
  let router: Router;

  const mockProduct = {
    id: 101,
    artisan_listing_id: 1,
    title: 'Traditional Sri Lankan Wooden Mask',
    description: 'A hand-carved traditional Sri Lankan mask.',
    price: 7500,
    currency: 'LKR',
    materials: 'Wood (Kaduru)',
    is_available: true,
    stock_quantity: 10,
    sku: 'MASK-001',
    is_custom_order_available: false,
    images: [{ id: 1, showcase_item_id: 101, image_url: '/images/s2.jpeg', caption: null, display_order: 1, is_primary: true, created_at: '' }],
    product_images: [],
  };

  const productServiceMock = {
    getProductById: vi.fn().mockReturnValue(of(mockProduct)),
    getProductsByListing: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 })),
  };

  const artisanServiceMock = {
    getListingById: vi.fn().mockReturnValue(of({ id: 1, title: 'Kandy Heritage Crafts', average_rating: 4.9, total_reviews: 88 })),
  };

  const favoriteServiceMock = {
    isProductFavorite: vi.fn().mockReturnValue(false),
    toggleProductFavorite: vi.fn().mockReturnValue(of({ isFavorite: true })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    productServiceMock.getProductById.mockReturnValue(of(mockProduct));

    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProductService, useValue: productServiceMock },
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', '1'], ['productId', '101']])),
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

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders product title, price in LKR, and materials attribute', () => {
    const title = fixture.nativeElement.querySelector('.product-title');
    expect(title.textContent).toContain('Traditional Sri Lankan Wooden Mask');

    const price = fixture.nativeElement.querySelector('.product-price');
    expect(price.textContent).toContain('LKR 7,500');

    const attrs = fixture.nativeElement.querySelector('.attributes-list');
    expect(attrs.textContent).toContain('Wood (Kaduru)');
  });

  it('controls inquiry quantity with increment and decrement within bounds', () => {
    expect(component.inquiryQuantity()).toBe(1);
    component.incrementQuantity();
    expect(component.inquiryQuantity()).toBe(2);
    component.decrementQuantity();
    expect(component.inquiryQuantity()).toBe(1);
    // Should not decrement below 1
    component.decrementQuantity();
    expect(component.inquiryQuantity()).toBe(1);
  });

  it('switches gallery active image on selectImage', () => {
    component.galleryImages.set(['img1.jpg', 'img2.jpg']);
    component.selectImage(1);
    expect(component.activeImageIndex()).toBe(1);
    expect(component.activeImage()).toBe('img2.jpg');
  });

  it('navigates to contact artisan with productId and inquiry quantity', () => {
    component.inquiryQuantity.set(3);
    component.contactArtisan();
    expect(router.navigate).toHaveBeenCalledWith(['/artisans', 1, 'contact'], {
      queryParams: { productId: 101, qty: 3 },
    });
  });

  it('sets error state and isolates mock fixtures when product API fails in production mode', () => {
    productServiceMock.getProductById.mockReturnValue(throwError(() => new Error('Offline')));
    component.loadProduct(999, 1);
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.isFixtureMode()).toBe(false);
  });

  it('activates verified product fixtures in explicit demo preview mode', () => {
    component.isFixtureMode.set(true);
    component.productId.set(1);
    component.loadProduct(1, 1);
    fixture.detectChanges();

    expect(component.isFixtureMode()).toBe(true);
    expect(component.product()?.title).toBe('Traditional Sri Lankan Wooden Mask');
    expect(component.product()?.price).toBe(7500);
  });

  it('loads specific product and associated artisan in demo mode (e.g. Clay Pot Set)', () => {
    component.isFixtureMode.set(true);
    component.productId.set(4);
    component.loadProduct(4, 4);
    fixture.detectChanges();

    expect(component.product()?.title).toBe('Clay Pot Set');
    expect(component.product()?.image_url).toContain('product_clay_pot');
    expect(component.listing()?.title).toBe('Ruhunu Pottery House');
  });

  it('delegates goBack to ArtisanNavigationService to return to profile products tab', () => {
    const navService = TestBed.inject(ArtisanNavigationService);
    const spy = vi.spyOn(navService, 'navigateBackFromProduct');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(1, false);
  });
});
