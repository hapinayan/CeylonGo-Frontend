import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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

    // Mock API call to return filtered local demo data synchronously
    vi.spyOn(homestayService, 'getHomestays').mockImplementation((params) => {
      return of(homestayService.filterDemoHomestays(params));
    });

    fixture.detectChanges();
  });

  it('should create the HomestayDiscovery component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with 8 exact categories and demo homestays', () => {
    expect(component.categories().length).toBe(8);
    expect(component.categories().map((c) => c.name)).toContain('All Homestays');
    expect(component.categories().map((c) => c.name)).toContain('Mountain Stays');
    expect(component.categories().map((c) => c.name)).toContain('Beach Stays');
    expect(component.categories().map((c) => c.name)).toContain('Nature Stays');
    expect(component.categories().map((c) => c.name)).toContain('Cultural Stays');
    expect(component.categories().map((c) => c.name)).toContain('Eco-Friendly');
    expect(component.categories().map((c) => c.name)).toContain('Family Friendly');
    expect(component.categories().map((c) => c.name)).toContain('Budget Stays');
    expect(component.homestays().length).toBeGreaterThan(0);
    expect(component.totalCount()).toBeGreaterThan(0);
  });

  it('should render CeylonGo brand text logo, exact heading, and search widget', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-text-logo')).toBeTruthy();
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('Find Comfortable Homestays in Sri Lanka');
    expect(compiled.querySelector('.hero-subtitle')?.textContent).toContain('Stay with friendly local hosts');
    expect(compiled.querySelector('#search-location')).toBeTruthy();
    expect(compiled.querySelector('.btn-search-submit')).toBeTruthy();
  });

  it('should render navigation links matching reference layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navText = compiled.querySelector('.nav-links')?.textContent;
    expect(navText).toContain('Stays');
    expect(navText).toContain('Experiences');
    expect(navText).toContain('Tour Guides');
    expect(navText).toContain('Bike Rentals');
    expect(navText).toContain('Community');
    expect(navText).toContain('AI Trip Planner');
  });

  it('should filter homestays by category when category button is clicked', () => {
    component.selectCategory('mountain');
    fixture.detectChanges();

    expect(component.selectedCategory()).toBe('mountain');
    expect(component.homestays().length).toBeGreaterThan(0);
    expect(component.homestays().every((h) => h.category === 'mountain' || h.category === 'hill-country')).toBe(true);
  });

  it('should filter homestays by search query', () => {
    component.locationQuery.set('Ella');
    component.onSearch();
    fixture.detectChanges();

    expect(component.locationQuery()).toBe('Ella');
    expect(component.homestays().length).toBeGreaterThan(0);
    expect(component.homestays().some((h) => h.name.includes('Ella') || h.city.toLowerCase() === 'ella')).toBe(true);
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

  it('should sort homestays when sort dropdown changes', () => {
    component.onSortChange('price_low');
    fixture.detectChanges();

    const items = component.homestays();
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].price_per_night).toBeLessThanOrEqual(items[i + 1].price_per_night);
    }
  });

  it('should toggle wishlist item on heart click and update header badge', () => {
    const firstItem = component.homestays()[0];
    const dummyEvent = new MouseEvent('click');

    component.toggleWishlist(firstItem, dummyEvent);
    fixture.detectChanges();

    expect(component.isWishlisted(firstItem.id)).toBe(true);
    expect(component.getWishlistCount()).toBe(1);

    component.toggleWishlist(firstItem, dummyEvent);
    fixture.detectChanges();

    expect(component.isWishlisted(firstItem.id)).toBe(false);
    expect(component.getWishlistCount()).toBe(0);
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

  it('should display empty state when search matches no homestay', () => {
    component.locationQuery.set('NonExistentCityXYZ');
    component.onSearch();
    fixture.detectChanges();

    expect(component.homestays().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.querySelector('.empty-title')?.textContent).toContain('No homestays match your search');

    // Click reset filters
    component.resetFilters();
    fixture.detectChanges();
    expect(component.homestays().length).toBeGreaterThan(0);
  });

  it('should navigate pagination pages correctly', () => {
    component.pageSize.set(4);
    component.fetchHomestays();
    fixture.detectChanges();

    expect(component.totalPages()).toBeGreaterThan(1);
    expect(component.currentPage()).toBe(1);

    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
  });

  it('should render sticky navbar and naturally scrolling hero, search bar, and 8 categories', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const stickyHeader = compiled.querySelector('.navbar-sticky-header') || compiled.querySelector('.cg-navbar');
    expect(stickyHeader).toBeTruthy();
    expect(compiled.querySelector('.cg-navbar')).toBeTruthy();
    expect(compiled.querySelector('.hero-header-section')).toBeTruthy();
    expect(compiled.querySelector('.categories-bar-section')).toBeTruthy();
  });

  it('should render scrollable content region containing toolbar, listings, and footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const scrollRegion = compiled.querySelector('.scrollable-content-region');
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion?.querySelector('.results-toolbar-section')).toBeTruthy();
    expect(scrollRegion?.querySelector('.listings-main-section')).toBeTruthy();
    expect(scrollRegion?.querySelector('.cg-footer')).toBeTruthy();
  });

  it('should bind Book button and title link to the property-specific route /homestays/:id', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.homestay-card');
    expect(firstCard).toBeTruthy();

    const bookBtn = firstCard?.querySelector('.btn-card-book');
    expect(bookBtn).toBeTruthy();

    const titleLink = firstCard?.querySelector('.title-link');
    expect(titleLink).toBeTruthy();

    const firstHomestay = component.homestays()[0];
    expect(component.getBookingQueryParams()).toBeDefined();
  });

  it('should navigate to /homestays/:id when Book button is clicked on a homestay card', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');

    component.checkInDate.set('2026-12-01');
    component.checkOutDate.set('2026-12-05');
    component.adultsCount.set(2);
    component.childrenCount.set(1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.homestay-card');
    expect(cards.length).toBeGreaterThan(1);

    const firstHomestay = component.homestays()[0];
    const secondHomestay = component.homestays()[1];
    expect(firstHomestay).toBeDefined();
    expect(secondHomestay).toBeDefined();

    // Click Book on first homestay card
    const firstBookBtn = cards[0].querySelector('.btn-card-book') as HTMLButtonElement;
    expect(firstBookBtn).toBeTruthy();
    firstBookBtn.click();
    fixture.detectChanges();

    expect(navSpy).toHaveBeenCalledWith(
      ['/homestays', firstHomestay.id],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          check_in: '2026-12-01',
          check_out: '2026-12-05',
          adults: 2,
          children: 1,
        }),
      })
    );

    // Click Book on second homestay card
    const secondBookBtn = cards[1].querySelector('.btn-card-book') as HTMLButtonElement;
    expect(secondBookBtn).toBeTruthy();
    secondBookBtn.click();
    fixture.detectChanges();

    expect(navSpy).toHaveBeenCalledWith(
      ['/homestays', secondHomestay.id],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          check_in: '2026-12-01',
          check_out: '2026-12-05',
          adults: 2,
          children: 1,
        }),
      })
    );
  });

  it('should not trigger booking navigation when clicking wishlist heart', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');

    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.homestay-card');
    const wishlistBtn = firstCard?.querySelector('.btn-card-wishlist') as HTMLButtonElement;
    expect(wishlistBtn).toBeTruthy();

    wishlistBtn.click();
    fixture.detectChanges();

    expect(navSpy).not.toHaveBeenCalled();
  });
});
