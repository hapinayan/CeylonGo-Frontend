import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TravelerHome } from './traveler-home';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.models';
import { environment } from '../../../environments/environment';

describe('TravelerHome Component — Redesigned Full-Screen Homepage', () => {
  let component: TravelerHome;
  let fixture: ComponentFixture<TravelerHome>;
  let router: Router;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 101,
    full_name: 'Hapinayan Perera',
    email: 'hapinayan017@gmail.com',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
  };

  const currentUserSignal = signal<User | null>(mockUser);
  const authServiceMock = {
    currentUser: currentUserSignal,
    getToken: vi.fn(() => null),
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  };

  const flushInitialRequests = (artisans: unknown[] = []) => {
    httpMock
      .match((req) => req.url.startsWith(`${environment.apiBaseUrl}/artisan-listings`))
      .forEach((req) =>
        req.flush({
          items: artisans,
          total: artisans.length,
          page: 1,
          page_size: 4,
          total_pages: 1,
        }),
      );
    httpMock
      .match((req) => req.url.startsWith(`${environment.apiBaseUrl}/recommendations`))
      .forEach((req) => req.flush({ sections: [] }));
  };

  beforeEach(async () => {
    currentUserSignal.set(mockUser);

    await TestBed.configureTestingModule({
      imports: [TravelerHome],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(TravelerHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({}));
  });

  it('should create the TravelerHome component', () => {
    flushInitialRequests();
    expect(component).toBeTruthy();
  });

  // =========================================================================
  // HOMEPAGE STRUCTURE & EXACT SECTION ORDER
  // =========================================================================
  it('should render homepage content sections in the exact specified order and hide Meet Our Local Artisans when empty', () => {
    flushInitialRequests([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const mainChildren = Array.from(compiled.querySelector('main')?.children || []);
    expect(mainChildren.map((el) => el.id || el.tagName.toLowerCase())).toEqual([
      'ai-planner',
      'experience-categories',
      'popular-destinations',
      'app-recommendations',
      'explore-more',
      'travel-community',
      'why-ceylongo',
    ]);
    expect(compiled.querySelector('#special-offers')).toBeNull();
    expect(compiled.querySelector('#local-artisans')).toBeNull();
  });

  it('should render Meet Our Local Artisans between Stay, Discover & Ride and Travel Community when API returns approved artisans', () => {
    flushInitialRequests([
      {
        id: 501,
        provider_profile_id: 21,
        title: 'Kandy Heritage Brassworks',
        description: 'Handcrafted traditional Kandyan brass lamps and decor.',
        craft_category: 'Handicrafts',
        district: 'Kandy',
        city: 'Kandy',
        latitude: null,
        longitude: null,
        cover_image_url: null,
        is_active: true,
        is_verified: true,
        is_featured: true,
        approval_status: 'approved',
        average_rating: 4.8,
        total_reviews: 12,
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const mainChildren = Array.from(compiled.querySelector('main')?.children || []);
    expect(mainChildren.map((el) => el.id || el.tagName.toLowerCase())).toEqual([
      'ai-planner',
      'experience-categories',
      'popular-destinations',
      'app-recommendations',
      'explore-more',
      'local-artisans',
      'travel-community',
      'why-ceylongo',
    ]);

    const section = compiled.querySelector('#local-artisans');
    expect(section?.querySelector('#local-artisans-heading')?.textContent?.trim()).toBe('Meet Our Local Artisans');
    expect(section?.querySelector('.btn-explore-artisans')?.getAttribute('href')).toBe('/artisans/discover');

    const card = section?.querySelector('.home-artisan-card');
    expect(card?.querySelector('.artisan-business-name')?.textContent?.trim()).toBe('Kandy Heritage Brassworks');
    expect(card?.querySelector('.artisan-category-pill')?.textContent?.trim()).toBe('Handicrafts');
    expect(card?.querySelector('.artisan-location-row')?.textContent?.trim()).toBe('Kandy');
    expect(card?.querySelector('.artisan-short-desc')?.textContent?.trim()).toContain('Handcrafted traditional');
    expect(card?.querySelector('.artisan-view-btn')?.getAttribute('href')).toBe('/artisans/501');
  });

  // =========================================================================
  // SECTION 02: HERO & AI QUICK PLANNER
  // =========================================================================
  it('should render Discover Sri Lanka, Your Way. headline, updated description, shortcuts, and CTA button', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('#hero-title');
    expect(heading?.textContent).toContain('Discover Sri Lanka,');
    expect(heading?.textContent).toContain('Your Way.');

    const desc = compiled.querySelector('.hero-description');
    expect(desc?.textContent).toContain(
      'Discover authentic local experiences, beautiful homestays, hidden destinations and personalized journeys powered by AI.',
    );

    const ctaBtn = compiled.querySelector('.btn-plan-ai') as HTMLButtonElement;
    expect(ctaBtn?.textContent).toContain('Plan Your Trip with AI');

    ctaBtn.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner']);
    expect(component.toastMessage()).toContain('CeylonGo AI Trip Planner');
  });

  it('should render interactive AI Quick Planner card with dropdowns and trip generation', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.ai-quick-planner-card');
    expect(card).toBeTruthy();

    component.selectDestination('Ella');
    component.selectDuration('3 Days');
    fixture.detectChanges();

    const generateBtn = compiled.querySelector('.btn-generate-trip') as HTMLButtonElement;
    generateBtn.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner'], expect.objectContaining({
      queryParams: expect.objectContaining({
        destination: 'Ella',
        duration: '3 Days',
      }),
    }));
  });

  // =========================================================================
  // SECTION 03: EXPLORE SRI LANKA EXPERIENCES
  // =========================================================================
  it('should render exactly 8 experience categories in order with photos', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.experience-category-card');
    expect(cards.length).toBe(8);

    const titles = Array.from(cards).map(
      (c) => c.querySelector('.category-card-title')?.textContent?.trim(),
    );
    expect(titles).toEqual([
      'Local Culture',
      'Wildlife',
      'Cooking',
      'Adventures',
      'Artisan & Handicrafts',
      'Heritage & Landmarks',
      'Village Experiences',
      'Water Activities',
    ]);
  });

  it('should navigate to /experiences with category query param when a supported experience category is clicked', () => {
    flushInitialRequests();
    const cultureCategory = component.experienceCategories[0];
    component.onCategoryClick(cultureCategory);
    expect(router.navigate).toHaveBeenCalledWith(['/experiences'], {
      queryParams: { category: 'culture' },
    });
  });

  it('should navigate to /artisans/discover when the Artisan & Handicrafts category card is clicked', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.experience-category-card');
    const artisanCard = cards[4] as HTMLElement;
    artisanCard.click();
    expect(router.navigate).toHaveBeenCalledWith(['/artisans/discover']);
  });

  // =========================================================================
  // SECTION 04: POPULAR DESTINATIONS
  // =========================================================================
  it('should render Popular Destinations heading, subtitle, and carousel navigation', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#popular-destinations');
    expect(section).toBeTruthy();
    expect(section?.querySelector('#destinations-heading')?.textContent?.trim()).toBe('Popular Destinations');
    expect(section?.querySelectorAll('.carousel-nav-controls .carousel-arrow-btn')?.length).toBe(2);
    expect(compiled.querySelectorAll('.destination-card').length).toBe(9);
  });

  it('should navigate to /homestays with location queryParam when destination card is clicked', () => {
    flushInitialRequests();
    const jaffna = component.popularDestinations[0];
    component.onDestinationClick(jaffna);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/homestays'], {
      queryParams: { location: 'Jaffna' },
    });
  });

  // =========================================================================
  // SECTION 06: STAY, DISCOVER & RIDE
  // =========================================================================
  it('should render 3 Stay, Discover & Ride service cards with navigation', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.explore-card');
    expect(cards.length).toBe(3);

    component.onExploreCardClick(component.exploreCards[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/homestays']);

    component.onExploreCardClick(component.exploreCards[1]);
    expect(router.navigate).toHaveBeenCalledWith(['/tour-guides']);

    component.onExploreCardClick(component.exploreCards[2]);
    expect(router.navigate).toHaveBeenCalledWith(['/bicycles']);
  });

  // =========================================================================
  // SECTION 08 & 09: TRAVEL COMMUNITY & WHY CEYLONGO?
  // =========================================================================
  it('should render Travel Community with illustration and action button', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#travel-community');
    const img = section?.querySelector('.community-img') as HTMLImageElement;
    expect(img?.getAttribute('src')).toBe('/images/traveler-home/travel-community.webp');
    const ctaBtn = section?.querySelector('.btn-explore-community') as HTMLButtonElement;
    expect(ctaBtn?.textContent?.trim()).toBe('Explore Community →');
  });

  it('should render Why CeylonGo section with tagline and 5 unique selling points', () => {
    flushInitialRequests();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#why-ceylongo');
    expect(section?.querySelector('#why-heading')?.textContent?.trim()).toBe('Why CeylonGo?');
    expect(section?.querySelector('.why-tagline')?.textContent?.trim()).toBe('Discover Local. Feel at Home.');
    const titles = Array.from(section?.querySelectorAll('.why-feature-title') || []).map((c) =>
      c.textContent?.trim(),
    );
    expect(titles).toEqual([
      'Community-Based Tourism',
      'Local Business & Artisan Promotion',
      'Direct Local Connections',
      'AI-Powered Travel Planning',
      'All-in-One Local Tourism Platform',
    ]);
  });

  // =========================================================================
  // CONTEXTUAL AUTH & UTILITIES
  // =========================================================================
  it('should prompt contextual auth modal when guest clicks Generate My Trip with destination & duration', () => {
    flushInitialRequests();
    authServiceMock.isAuthenticated.mockReturnValue(false);

    component.selectDestination('Kandy');
    component.selectDuration('3 Days');
    component.onGenerateMyTrip();
    fixture.detectChanges();

    expect(component.authModalService.isOpen()).toBe(true);
    expect(component.authModalService.pendingAction()?.type).toBe('generate-trip');
  });

  it('should render Live Weather and Explore Map compact shortcuts inside hero action row', () => {
    flushInitialRequests();
    const el = fixture.nativeElement as HTMLElement;
    const weatherLink = el.querySelector('a[href="/weather"]');
    const mapLink = el.querySelector('a[href="/map"]');

    expect(weatherLink?.textContent).toContain('Live Weather');
    expect(mapLink?.textContent).toContain('Explore Map');
  });
});
