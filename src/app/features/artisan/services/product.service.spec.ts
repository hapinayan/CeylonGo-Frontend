import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ShowcaseItemResponse } from '../models/artisan.models';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const artisanListingsUrl = `${environment.apiBaseUrl}/artisan-listings`;
  const showcaseUrl = `${environment.apiBaseUrl}/showcase-items`;
  const backendOrigin = new URL(environment.apiBaseUrl).origin;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches active showcase items for a listing from GET /artisan-listings/{id}/showcase-items', () => {
    service.getProductsByListing(1, 1, 20).subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.items[0].title).toBe('Handwoven Brass Tray');
      expect(res.items[0].price).toBe(2500);
      expect(res.items[0].image_url).toBe(`${backendOrigin}/api/v1/showcase-items/101/images/1`);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${artisanListingsUrl}/1/showcase-items` &&
        r.params.get('page') === '1' &&
        r.params.get('page_size') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        {
          id: 101,
          artisan_listing_id: 1,
          listing_title: 'Brass Workshop',
          title: 'Handwoven Brass Tray',
          category: 'Handicrafts',
          price: 2500,
          currency: 'LKR',
          image_url: '/api/v1/showcase-items/101/images/1',
          is_available: true,
          is_active: true,
          approval_status: 'approved',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
  });

  it('fetches product details and gallery images from /showcase-items/{id}', () => {
    const mockProduct: ShowcaseItemResponse = {
      id: 101,
      artisan_listing_id: 1,
      listing_title: 'Ambalangoda Masks',
      title: 'Traditional Sri Lankan Wooden Mask',
      category: 'Woodcarving & Masks',
      item_type: 'product',
      description: 'Carved from Ruk Attana wood.',
      price: 7500,
      currency: 'LKR',
      image_url: '/api/v1/showcase-items/101/images/5',
      materials: 'Ruk Attana Wood',
      is_available: true,
      is_active: true,
      approval_status: 'approved',
      images: [
        {
          id: 5,
          showcase_item_id: 101,
          image_url: '/api/v1/showcase-items/101/images/5',
          caption: 'Front view',
          display_order: 0,
          is_primary: true,
          created_at: '',
        },
      ],
      product_images: [],
      created_at: '',
      updated_at: '',
    };

    service.getProductById(101).subscribe((res) => {
      expect(res.title).toBe('Traditional Sri Lankan Wooden Mask');
      expect(res.image_url).toBe(`${backendOrigin}/api/v1/showcase-items/101/images/5`);
      expect(res.images.length).toBe(1);
    });

    const req = httpMock.expectOne(`${showcaseUrl}/101`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('searches global showcase items from GET /showcase-items', () => {
    service.getProducts({ search: 'Mask', category: 'Woodcarving & Masks', page: 1, page_size: 12 }).subscribe((res) => {
      expect(res.total).toBe(0);
      expect(res.items).toEqual([]);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === showcaseUrl &&
        r.params.get('search') === 'Mask' &&
        r.params.get('category') === 'Woodcarving & Masks',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 1, page_size: 12, total_pages: 1 });
  });
});
