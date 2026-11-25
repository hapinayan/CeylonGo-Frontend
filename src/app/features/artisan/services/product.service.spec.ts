import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ShowcaseItemPagination, ShowcaseItemResponse } from '../models/artisan.models';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/showcase-items`;
  const listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

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

  it('should fetch showcase products for a specific artisan listing', () => {
    const mockPagination: ShowcaseItemPagination = {
      items: [
        {
          id: 101,
          artisan_listing_id: 1,
          title: 'Traditional Sri Lankan Wooden Mask',
          item_type: 'product',
          price: 7500,
          currency: 'LKR',
          image_url: '/images/s2.jpeg',
          is_available: true,
          is_featured: true,
          is_active: true,
          stock_quantity: 8,
          sku: 'MASK-001',
          is_custom_order_available: true,
          approval_status: 'approved',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };

    service.getProductsByListing(1, 1, 20).subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.items[0].title).toBe('Traditional Sri Lankan Wooden Mask');
      expect(res.items[0].price).toBe(7500);
      expect(res.items[0].stock_quantity).toBe(8);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${listingsUrl}/1/showcase-items` && r.params.get('page') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagination);
  });

  it('should fetch product details by ID', () => {
    const mockProduct: ShowcaseItemResponse = {
      id: 101,
      artisan_listing_id: 1,
      title: 'Traditional Sri Lankan Wooden Mask',
      item_type: 'product',
      description: 'Handcrafted Kaduru wood mask.',
      price: 7500,
      currency: 'LKR',
      image_url: '/images/s2.jpeg',
      materials: 'Wood (Kaduru)',
      duration_minutes: null,
      is_available: true,
      stock_quantity: 8,
      sku: 'MASK-001',
      is_custom_order_available: false,
      is_featured: true,
      is_active: true,
      approval_status: 'approved',
      listing_title: 'Kandy Heritage Crafts',
      images: [],
      product_images: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    service.getProductById(101).subscribe((item) => {
      expect(item.id).toBe(101);
      expect(item.title).toBe('Traditional Sri Lankan Wooden Mask');
      expect(item.materials).toBe('Wood (Kaduru)');
      expect(item.listing_title).toBe('Kandy Heritage Crafts');
    });

    const req = httpMock.expectOne(`${baseUrl}/101`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });
});
