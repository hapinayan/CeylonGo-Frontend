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
  const listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;
  const backendOrigin = new URL(environment.apiBaseUrl).origin;

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

  it('retrieves artisan listings from dedicated GET /artisan-listings and maps real media URLs', () => {
    const raw: ArtisanListingPagination = {
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
          cover_image_url: '/api/v1/listings/121/photos/120',
          is_active: true,
          is_verified: true,
          is_featured: false,
          approval_status: 'approved',
          average_rating: null,
          total_reviews: 0,
        },
      ],
      total: 1,
      page: 1,
      page_size: 12,
      total_pages: 1,
    };

    service
      .getListings({
        search: 'Clay',
        category: 'Pottery & Ceramics',
        district: 'Vavuniya',
        sort_by: 'newest',
        page: 1,
        page_size: 12,
      })
      .subscribe((res) => {
        expect(res.total).toBe(1);
        expect(res.items.length).toBe(1);
        expect(res.items[0].title).toBe('Vavuniya Hand-finished Clay Planter');
        expect(res.items[0].craft_category).toBe('Pottery & Ceramics');
        expect(res.items[0].is_verified).toBe(true);
        expect(res.items[0].cover_image_url).toBe(`${backendOrigin}/api/v1/listings/121/photos/120`);
        expect(res.items[0].average_rating).toBeNull();
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === listingsUrl &&
        r.params.get('search') === 'Clay' &&
        r.params.get('category') === 'Pottery & Ceramics' &&
        r.params.get('district') === 'Vavuniya' &&
        r.params.get('sort_by') === 'newest' &&
        r.params.get('page') === '1' &&
        r.params.get('page_size') === '12',
    );
    expect(req.request.method).toBe('GET');
    req.flush(raw);
  });

  it('fetches backend craft categories and districts', () => {
    service.getCategories().subscribe((cats) => {
      expect(cats).toEqual(['Pottery & Ceramics', 'Batik & Textiles']);
    });
    const catReq = httpMock.expectOne(`${listingsUrl}/categories`);
    expect(catReq.request.method).toBe('GET');
    catReq.flush(['Pottery & Ceramics', 'Batik & Textiles']);

    service.getDistricts().subscribe((dists) => {
      expect(dists).toEqual(['Kandy', 'Vavuniya']);
    });
    const distReq = httpMock.expectOne(`${listingsUrl}/districts`);
    expect(distReq.request.method).toBe('GET');
    distReq.flush(['Kandy', 'Vavuniya']);
  });

  it('fetches single artisan listing detail and business hours by ID', () => {
    const raw: ArtisanListingResponse = {
      id: 121,
      provider_profile_id: 9,
      title: 'Lanka Batik Creations',
      craft_category: 'Batik & Textiles',
      business_type: 'Batik & Handloom Studio',
      business_background: 'Family workshop established in 1998.',
      artisan_information: 'Led by master batik artisan Nimali.',
      description: 'Handcrafted batik fabrics in Galle Fort.',
      district: 'Galle',
      city: 'Galle Fort',
      address: 'No. 10, Pedlar Street',
      latitude: 6.0328,
      longitude: 80.2168,
      phone: '+94 91 223 4455',
      whatsapp_number: '+94771234567',
      email: 'info@lankabatik.lk',
      website_url: 'https://lankabatik.lk',
      social_links: { instagram: 'https://instagram.com/lankabatik' },
      opening_hours: 'Mon-Sat 09:00-17:30',
      cover_image_url: '/api/v1/listings/121/photos/12',
      price: 3500,
      currency: 'LKR',
      is_active: true,
      is_verified: true,
      is_featured: false,
      approval_status: 'approved',
      average_rating: null,
      total_reviews: 0,
      images: [
        {
          id: 12,
          artisan_listing_id: 121,
          image_url: '/api/v1/listings/121/photos/12',
          caption: null,
          display_order: 0,
          is_cover: true,
          created_at: '',
        },
      ],
      business_images: [],
      business_hours: [{ day_of_week: 0, is_closed: false, open_time: '09:00', close_time: '17:30' }],
      created_at: '',
      updated_at: '',
    };

    service.getListingById(121).subscribe((res) => {
      expect(res.id).toBe(121);
      expect(res.title).toBe('Lanka Batik Creations');
      expect(res.craft_category).toBe('Batik & Textiles');
      expect(res.business_type).toBe('Batik & Handloom Studio');
      expect(res.city).toBe('Galle Fort');
      expect(res.is_verified).toBe(true);
      expect(res.cover_image_url).toBe(`${backendOrigin}/api/v1/listings/121/photos/12`);
      expect(res.business_images.length).toBe(1);
    });

    const req = httpMock.expectOne(`${listingsUrl}/121`);
    expect(req.request.method).toBe('GET');
    req.flush(raw);

    service.getBusinessHours(121).subscribe((hours) => {
      expect(hours.length).toBe(2);
      expect(hours[0].day_of_week).toBe(0);
    });
    const hoursReq = httpMock.expectOne(`${listingsUrl}/121/business-hours`);
    expect(hoursReq.request.method).toBe('GET');
    hoursReq.flush([
      { day_of_week: 2, is_closed: false, open_time: '09:00', close_time: '17:00' },
      { day_of_week: 0, is_closed: false, open_time: '09:00', close_time: '17:30' },
    ]);
  });
});
