import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomestayService } from '../../core/services/homestay.service';
import { HomestayDiscovery } from './homestay-discovery';

describe('HomestayDiscovery', () => {
  let component: HomestayDiscovery;
  let fixture: ComponentFixture<HomestayDiscovery>;
  let homestayService: HomestayService;

  beforeEach(async () => {
    localStorage.clear();
    window.scrollTo = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HomestayDiscovery],
      providers: [HomestayService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomestayDiscovery);
    component = fixture.componentInstance;
    homestayService = TestBed.inject(HomestayService);

    const mockItems = [
      {
        id: 1,
        name: 'Ella Green View Homestay',
        description: 'Cozy retreat overlooking Ella Rock.',
        location: 'Ella, Badulla',
        city: 'Ella',
        district: 'Badulla',
        category: 'mountain' as const,
        category_name: 'Mountain Stays',
        price_per_night: 6500,
        max_guests: 3,
        bedrooms: 1,
        beds: 2,
        bathrooms: 1,
        rating: 4.95,
        review_count: 128,
        is_verified: true,
        image_url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739',
        images: ['https://images.unsplash.com/photo-1510798831971-661eb04b3739'],
        amenities: ['Wi-Fi', 'Breakfast'],
        cancellation_policy: 'Free cancellation',
      },
    ];

    vi.spyOn(homestayService, 'getHomestays').mockReturnValue(
      of({
        items: mockItems,
        next_before_id: null,
      })
    );

    fixture.detectChanges();
  });

  it('should create the HomestayDiscovery component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with categories and homestays', () => {
    expect(component.categories().length).toBeGreaterThan(0);
    expect(component.homestays().length).toBeGreaterThan(0);
    expect(component.resultsCount()).toBeGreaterThan(0);
  });

  it('should render common Traveler Navbar, search bar, and filters button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-traveler-navbar')).toBeTruthy();
    expect(compiled.querySelector('.horizontal-search-bar')).toBeTruthy();
    expect(compiled.querySelector('#search-location')).toBeTruthy();
    expect(compiled.querySelector('#search-checkin')).toBeTruthy();
    expect(compiled.querySelector('#search-checkout')).toBeTruthy();
    expect(compiled.querySelector('.btn-search-submit')).toBeTruthy();
    expect(compiled.querySelector('.btn-filters-pill')).toBeTruthy();
  });

  it('should render split-screen layout with listings pane and sticky interactive map', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.discovery-main-layout')).toBeTruthy();
    expect(compiled.querySelector('.listings-pane')).toBeTruthy();
    expect(compiled.querySelector('.map-pane')).toBeTruthy();
    expect(compiled.querySelector('app-homestay-map')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });

  it('should render results header with count and fee inclusion badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.results-count-title')?.textContent).toContain('Homestay in Sri Lanka');
    expect(compiled.querySelector('.badge-price-includes')?.textContent).toContain('Prices include all fees');
  });

  it('should filter homestays by category', () => {
    component.selectCategory('mountain');
    fixture.detectChanges();

    expect(component.selectedCategory()).toBe('mountain');
    expect(component.homestays().length).toBeGreaterThan(0);
  });

  it('should filter homestays by search query', () => {
    component.locationQuery.set('Ella');
    component.onSearch();
    fixture.detectChanges();

    expect(component.locationQuery()).toBe('Ella');
    expect(component.homestays().length).toBeGreaterThan(0);
  });

  it('should update adult and child guest counters accurately', () => {
    expect(component.adultsCount()).toBe(2);
    component.updateAdults(1);
    expect(component.adultsCount()).toBe(3);
    expect(component.totalGuests()).toBe(3);

    component.updateChildren(2);
    expect(component.childrenCount()).toBe(2);
    expect(component.totalGuests()).toBe(5);

    // Should not allow adults less than 1
    component.updateAdults(-10);
    expect(component.adultsCount()).toBe(1);
  });

  it('should toggle wishlist item on heart click with backend', () => {
    const firstItem = component.homestays()[0];
    const dummyEvent = new MouseEvent('click');
    vi.spyOn(dummyEvent, 'stopPropagation');
    vi.spyOn(dummyEvent, 'preventDefault');

    // Simulate authenticated state
    const authService = TestBed.inject(HomestayService);
    vi.spyOn(homestayService, 'toggleWishlist').mockReturnValue(of(true));

    component.toggleWishlist(firstItem, dummyEvent);
    fixture.detectChanges();

    expect(dummyEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should open and close filter modal and apply modal filters', () => {
    expect(component.filterModalOpen()).toBe(false);

    component.openFilterModal();
    expect(component.filterModalOpen()).toBe(true);

    component.toggleAmenity('Wi-Fi');
    expect(component.isAmenitySelected('Wi-Fi')).toBe(true);

    component.applyModalFilters();
    expect(component.filterModalOpen()).toBe(false);
  });
});
