import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { HomestayService } from './homestay.service';

describe('HomestayService', () => {
  let service: HomestayService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomestayService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HomestayService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 8 approved categories with exact reference names', () => {
    const categories = service.getCategories();
    expect(categories.length).toBe(8);
    expect(categories[0].id).toBe('all');
    expect(categories.map((c) => c.name)).toContain('All Homestays');
    expect(categories.map((c) => c.name)).toContain('Mountain Stays');
    expect(categories.map((c) => c.name)).toContain('Beach Stays');
    expect(categories.map((c) => c.name)).toContain('Nature Stays');
    expect(categories.map((c) => c.name)).toContain('Cultural Stays');
    expect(categories.map((c) => c.name)).toContain('Eco-Friendly');
    expect(categories.map((c) => c.name)).toContain('Family Friendly');
    expect(categories.map((c) => c.name)).toContain('Budget Stays');
  });

  it('should filter demo homestays by category', () => {
    const res = service.filterDemoHomestays({ category: 'beach' });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((h) => h.category === 'beach' || h.category === 'beachfront')).toBe(true);
  });

  it('should filter demo homestays by location/search query', () => {
    const res = service.filterDemoHomestays({ query: 'Kandy' });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.some((h) => h.city.toLowerCase() === 'kandy')).toBe(true);
  });

  it('should filter demo homestays by guest capacity', () => {
    const res = service.filterDemoHomestays({ guests: 4 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((h) => h.max_guests >= 4)).toBe(true);
  });

  it('should sort demo homestays by price ascending', () => {
    const res = service.filterDemoHomestays({ sort_by: 'price_low' });
    for (let i = 0; i < res.items.length - 1; i++) {
      expect(res.items[i].price_per_night).toBeLessThanOrEqual(res.items[i + 1].price_per_night);
    }
  });

  it('should toggle and persist wishlist items', () => {
    expect(service.isWishlisted(1)).toBe(false);

    const added = service.toggleWishlist(1);
    expect(added).toBe(true);
    expect(service.isWishlisted(1)).toBe(true);
    expect(service.wishlistIds()).toContain(1);

    const removed = service.toggleWishlist(1);
    expect(removed).toBe(false);
    expect(service.isWishlisted(1)).toBe(false);
  });

  it('should calculate total pages correctly based on page_size', () => {
    const res = service.filterDemoHomestays({ page_size: 8 });
    expect(res.page_size).toBe(8);
    expect(res.total_pages).toBeGreaterThanOrEqual(1);
    expect(res.items.length).toBeLessThanOrEqual(8);
  });

  it('should find demo homestay by ID from local dataset', () => {
    const item = service.findDemoHomestayById(1);
    expect(item).toBeTruthy();
    expect(item?.id).toBe(1);
    expect(item?.name).toBe('Ella Green View Homestay');
    expect(item?.house_rules).toBeDefined();

    const notFound = service.findDemoHomestayById(9999);
    expect(notFound).toBeNull();
  });

  it('should retrieve homestay by ID with fallback to demo data when HTTP fails', () => {
    let result: any;
    service.getHomestayById(2).subscribe((h) => {
      result = h;
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/homestays/2'));
    req.error(new ProgressEvent('Network error'));

    expect(result).toBeTruthy();
    expect(result.id).toBe(2);
    expect(result.name).toBe('Mirissa Beach Homestay');
  });

  it('should return null for invalid homestay IDs', () => {
    let result: any;
    service.getHomestayById(-1).subscribe((h) => {
      result = h;
    });
    expect(result).toBeNull();
  });

  it('should calculate night count accurately', () => {
    expect(service.calculateNights('2026-12-01', '2026-12-05')).toBe(4);
    expect(service.calculateNights('2026-12-05', '2026-12-01')).toBe(0); // Invalid reversed dates
    expect(service.calculateNights('2026-12-01', '2026-12-01')).toBe(0); // Same day
    expect(service.calculateNights('', '2026-12-05')).toBe(0); // Empty
  });

  it('should calculate estimated price based on rate and nights', () => {
    expect(service.calculateEstimatedPrice(5000, 3)).toBe(15000);
    expect(service.calculateEstimatedPrice(5000, 0)).toBe(0);
    expect(service.calculateEstimatedPrice(0, 3)).toBe(0);
  });

  it('should store and retrieve booking draft safely in sessionStorage', () => {
    service.clearBookingDraft();
    expect(service.getBookingDraft()).toBeNull();

    const mockDraft = {
      homestayId: 1,
      homestayName: 'Ella Green View Homestay',
      homestayLocation: 'Ella',
      homestayImage: 'https://example.com/img.jpg',
      nightlyRate: 6500,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      adults: 2,
      children: 0,
      totalGuests: 2,
      nights: 2,
      basePrice: 13000,
      estimatedTotal: 13000,
    };

    service.setBookingDraft(mockDraft);
    const retrieved = service.getBookingDraft();
    expect(retrieved).toEqual(mockDraft);

    service.clearBookingDraft();
    expect(service.getBookingDraft()).toBeNull();
  });

  it('should simulate booking confirmation with proper reference format', () => {
    const mockDraft = {
      homestayId: 1,
      homestayName: 'Ella Green View Homestay',
      homestayLocation: 'Ella',
      homestayImage: 'https://example.com/img.jpg',
      nightlyRate: 6500,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      adults: 2,
      children: 0,
      totalGuests: 2,
      nights: 2,
      basePrice: 13000,
      estimatedTotal: 13000,
    };

    const conf = service.simulateBookingConfirmation(mockDraft);
    expect(conf.bookingReference).toMatch(/^CG-HS-1-\d{4}$/);
    expect(conf.homestayId).toBe(1);
    expect(conf.nights).toBe(2);
    expect(conf.estimatedTotal).toBe(13000);
  });
});
