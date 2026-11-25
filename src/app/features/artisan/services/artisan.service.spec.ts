import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ArtisanListingPagination, ArtisanListingResponse } from '../models/artisan.models';
import { ArtisanService } from './artisan.service';

describe('ArtisanService', () => {
  let service: ArtisanService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/artisan-listings`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArtisanService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ArtisanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should retrieve active artisan listings with search and filter parameters', () => {
    const mockPagination: ArtisanListingPagination = {
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
      ],
      total: 1,
      page: 1,
      page_size: 12,
    };

    service
      .getListings({ search: 'Kandy', category: 'Woodcarving & Masks', page: 1, page_size: 12 })
      .subscribe((res) => {
        expect(res.total).toBe(1);
        expect(res.items.length).toBe(1);
        expect(res.items[0].title).toBe('Kandy Heritage Crafts');
        expect(res.items[0].is_verified).toBe(true);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === baseUrl &&
        r.params.get('search') === 'Kandy' &&
        r.params.get('category') === 'Woodcarving & Masks' &&
        r.params.get('page') === '1' &&
        r.params.get('page_size') === '12'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagination);
  });

  it('should fetch craft categories and return string list', () => {
    const mockCategories = ['Handicrafts', 'Pottery & Ceramics', 'Batik & Textiles'];

    service.getCategories().subscribe((cats) => {
      expect(cats).toEqual(mockCategories);
    });

    const req = httpMock.expectOne(`${baseUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  it('should fetch single artisan listing by ID', () => {
    const mockListing: ArtisanListingResponse = {
      id: 5,
      provider_profile_id: 12,
      title: 'Lanka Batik Creations',
      craft_category: 'Batik & Textiles',
      description: 'Handcrafted batik fabrics in Galle Fort.',
      district: 'Galle',
      city: 'Galle',
      address: '42 Church Street, Galle Fort',
      latitude: 6.0328,
      longitude: 80.2168,
      phone: '+94912234567',
      email: 'info@lankabatik.lk',
      website_url: 'https://lankabatik.lk',
      opening_hours: 'Daily: 9:00 AM - 6:00 PM',
      cover_image_url: '/images/s2.jpeg',
      is_active: true,
      is_verified: true,
      is_featured: false,
      approval_status: 'approved',
      average_rating: 4.8,
      total_reviews: 201,
      images: [],
      business_images: [],
      business_hours: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    service.getListingById(5).subscribe((data) => {
      expect(data.id).toBe(5);
      expect(data.title).toBe('Lanka Batik Creations');
      expect(data.district).toBe('Galle');
    });

    const req = httpMock.expectOne(`${baseUrl}/5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockListing);
  });
});
