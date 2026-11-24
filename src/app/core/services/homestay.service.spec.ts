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
});
