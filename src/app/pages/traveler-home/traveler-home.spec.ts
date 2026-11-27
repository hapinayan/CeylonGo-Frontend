import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TravelerHome } from './traveler-home';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.models';

describe('TravelerHome Component — Phase 10B Unified Homepage', () => {
  let component: TravelerHome;
  let fixture: ComponentFixture<TravelerHome>;
  let router: Router;

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
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
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

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(TravelerHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the TravelerHome component', () => {
    expect(component).toBeTruthy();
  });

  // =========================================================================
  // HOMEPAGE STRUCTURE & EXACT SECTION ORDER (7 CONTENT SECTIONS INSIDE LAYOUT)
  // =========================================================================
  it('should render all 7 homepage content sections in the exact specified order', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Section 02: AI Trip Planner Hero
    const hero = compiled.querySelector('#ai-planner');
    expect(hero).toBeTruthy();

    // Section 03: Explore Sri Lanka Experiences
    const experienceCategories = compiled.querySelector('#experience-categories');
    expect(experienceCategories).toBeTruthy();

    // Section 04: Popular Destinations
    const destinations = compiled.querySelector('#popular-destinations');
    expect(destinations).toBeTruthy();

    // Section 05: Explore More with CeylonGo
    const exploreMore = compiled.querySelector('#explore-more');
    expect(exploreMore).toBeTruthy();

    // Section 06: CeylonGo Travel Community
    const community = compiled.querySelector('#travel-community');
    expect(community).toBeTruthy();

    // Section 07: Special Offers & Promotions
    const specialOffers = compiled.querySelector('#special-offers');
    expect(specialOffers).toBeTruthy();

    // Section 08: Why CeylonGo?
    const whyCeylonGo = compiled.querySelector('#why-ceylongo');
    expect(whyCeylonGo).toBeTruthy();

    // Verify DOM sequence order inside <main>
    const mainChildren = Array.from(compiled.querySelector('main')?.children || []);
    expect(mainChildren.length).toBe(7);
    expect(mainChildren[0]?.id).toBe('ai-planner');
    expect(mainChildren[1]?.id).toBe('experience-categories');
    expect(mainChildren[2]?.id).toBe('popular-destinations');
    expect(mainChildren[3]?.id).toBe('explore-more');
    expect(mainChildren[4]?.id).toBe('travel-community');
    expect(mainChildren[5]?.id).toBe('special-offers');
    expect(mainChildren[6]?.id).toBe('why-ceylongo');
  });

  // =========================================================================
  // SECTION 02: AI TRIP PLANNER HERO
  // =========================================================================
  it('should preserve hero headline, AI badge, description, benefits, and CTA button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('#hero-title');
    expect(heading?.textContent).toContain('Plan Your Sri Lanka Trip');
    expect(heading?.textContent).toContain('with AI');

    const badge = compiled.querySelector('.ai-badge-pill');
    expect(badge?.textContent).toContain('AI Trip Planner');

    const desc = compiled.querySelector('.hero-description');
    expect(desc?.textContent).toContain('Get a personalized itinerary');

    const benefits = compiled.querySelectorAll('.hero-benefits-row .benefit-item');
    expect(benefits.length).toBe(3);

    const ctaBtn = compiled.querySelector('.btn-plan-ai') as HTMLButtonElement;
    expect(ctaBtn?.textContent).toContain('Plan Your Trip with AI');

    ctaBtn.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner']);
    expect(component.toastMessage()).toContain('CeylonGo AI Trip Planner');
  });

  it('should render interactive AI Quick Planner card with dropdowns and trip generation', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.ai-quick-planner-card');
    expect(card).toBeTruthy();

    const title = card?.querySelector('.planner-title');
    expect(title?.textContent?.trim()).toBe("Let's plan your adventure");

    const subtitle = card?.querySelector('.planner-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Tell us where you want to go and for how long.');

    // Select destination
    component.selectDestination('Ella');
    // Select duration
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
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.experience-category-card');
    expect(cards.length).toBe(8);

    const titles = Array.from(cards).map(
      (c) => c.querySelector('.category-card-title')?.textContent?.trim()
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
    const cultureCategory = component.experienceCategories[0]; // Local Culture
    component.onCategoryClick(cultureCategory);
    expect(router.navigate).toHaveBeenCalledWith(['/experiences'], {
      queryParams: { category: 'culture' },
    });
  });

  it('should navigate to /artisans/discover when the Artisan & Handicrafts category card is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.experience-category-card');
    const artisanCard = cards[4] as HTMLElement; // Artisan & Handicrafts
    artisanCard.click();
    expect(router.navigate).toHaveBeenCalledWith(['/artisans/discover']);
  });

  it('should navigate to /experiences without misleading query param when an unsupported category is clicked', () => {
    const heritageCategory = component.experienceCategories[5]; // Heritage & Landmarks
    component.onCategoryClick(heritageCategory);
    expect(router.navigate).toHaveBeenCalledWith(['/experiences']);
  });

  // =========================================================================
  // SECTION 04: POPULAR DESTINATIONS (9 DESTINATIONS PRIORITIZING NORTH & EAST)
  // =========================================================================
  it('should render Popular Destinations heading, subtitle, and carousel navigation', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#popular-destinations');
    expect(section).toBeTruthy();

    const heading = section?.querySelector('#destinations-heading');
    expect(heading?.textContent?.trim()).toBe('Popular Destinations');

    const subtitle = section?.querySelector('.section-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Discover hidden gems and unforgettable destinations across Sri Lanka.');

    const arrowBtns = section?.querySelectorAll('.carousel-nav-controls .carousel-arrow-btn');
    expect(arrowBtns?.length).toBe(2);
  });

  it('should render exactly 9 destinations in order with Northern and Eastern provinces first', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.destination-card');
    expect(cards.length).toBe(9);

    const destNames = Array.from(cards).map(
      (c) => c.querySelector('.dest-name')?.textContent?.trim()
    );
    expect(destNames).toEqual([
      'Jaffna',
      'Trincomalee',
      'Batticaloa',
      'Mannar',
      'Arugam Bay',
      'Delft Island',
      'Ella',
      'Sigiriya',
      'Galle',
    ]);

    // Check provinces
    const provinces = Array.from(cards).map(
      (c) => c.querySelector('.dest-province')?.textContent?.trim()
    );
    expect(provinces[0]).toBe('Northern Province');
    expect(provinces[1]).toBe('Eastern Province');
    expect(provinces[2]).toBe('Eastern Province');
    expect(provinces[3]).toBe('Northern Province');
    expect(provinces[4]).toBe('Eastern Province');
    expect(provinces[5]).toBe('Northern Province');
  });

  it('should navigate to /homestays with location queryParam when destination card is clicked', () => {
    const jaffna = component.popularDestinations[0];
    component.onDestinationClick(jaffna);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/homestays'], {
      queryParams: { location: 'Jaffna' },
    });
  });

  it('should navigate to correct destination route when Stay, Discover & Ride card is clicked', () => {
    const homestayCard = component.exploreCards[0];
    component.onExploreCardClick(homestayCard);
    expect(router.navigate).toHaveBeenCalledWith(['/homestays']);

    const guideCard = component.exploreCards[1];
    component.onExploreCardClick(guideCard);
    expect(router.navigate).toHaveBeenCalledWith(['/tour-guides']);

    const bikeCard = component.exploreCards[2];
    component.onExploreCardClick(bikeCard);
    expect(router.navigate).toHaveBeenCalledWith(['/bicycles']);
  });

  it('should scroll destinations track left and right', () => {
    expect(() => {
      component.scrollDestinations(1);
      component.scrollDestinations(-1);
    }).not.toThrow();
  });

  // =========================================================================
  // SECTION 05: STAY, DISCOVER & RIDE
  // =========================================================================
  it('should render 3 Stay, Discover & Ride service cards with badges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#explore-more');
    expect(section).toBeTruthy();

    const heading = section?.querySelector('.section-heading');
    expect(heading?.textContent?.trim()).toBe('Stay, Discover & Ride');

    const subtitle = section?.querySelector('.section-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Everything you need to explore Sri Lanka, your way.');

    const cards = compiled.querySelectorAll('.explore-card');
    expect(cards.length).toBe(3);

    const titles = Array.from(cards).map((c) =>
      c.querySelector('.explore-card-title')?.textContent?.trim()
    );
    expect(titles).toEqual([
      'Find Homestays',
      'Find Your Tour Guide',
      'Rent a Bike or Bicycle',
    ]);

    const ctas = Array.from(cards).map((c) =>
      c.querySelector('.explore-card-cta')?.textContent?.trim()
    );
    expect(ctas).toEqual([
      'Explore Stays →',
      'Find a Guide →',
      'Explore Rentals →',
    ]);
  });

  // =========================================================================
  // SECTION 06: CEYLONGO TRAVEL COMMUNITY
  // =========================================================================
  it('should render Travel Community with 3D illustration and action button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#travel-community');
    expect(section).toBeTruthy();

    const img = section?.querySelector('.community-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/images/traveler-home/travel-community.webp');

    const ctaBtn = section?.querySelector('.btn-explore-community') as HTMLButtonElement;
    expect(ctaBtn).toBeTruthy();
    expect(ctaBtn.textContent?.trim()).toBe('Explore Community →');
  });

  // =========================================================================
  // SECTION 07: SPECIAL OFFERS & PROMOTIONS (WITH DEMO OFFERS)
  // =========================================================================
  it('should render 4 promotion category tabs and sample demo offers when no live promotions exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#special-offers');
    expect(section).toBeTruthy();

    // 4 Category Tabs
    const tabs = section?.querySelectorAll('.promo-tab-btn');
    expect(tabs?.length).toBe(4);
    const tabTexts = Array.from(tabs || []).map((t) => t.textContent?.trim());
    expect(tabTexts).toEqual(['All Offers', 'Homestay Offers', 'Rental Offers', 'Experience Offers']);

    // Check that displayedOffers shows 3 demo offers
    expect(component.displayedOffers.length).toBe(3);
    const offerCards = section?.querySelectorAll('.promo-card');
    expect(offerCards?.length).toBe(3);

    // Check Demo Offer badges
    const demoBadges = section?.querySelectorAll('.demo-badge');
    expect(demoBadges?.length).toBe(3);
    expect(demoBadges?.[0]?.textContent?.trim()).toBe('Demo Offer');
  });

  it('should filter demo offers by category tabs cleanly', () => {
    // Homestay Offers
    component.selectPromotionCategory('homestays');
    fixture.detectChanges();
    expect(component.displayedOffers.length).toBe(1);
    expect(component.displayedOffers[0].title).toBe('Jaffna Homestay Escape');

    // Rental Offers
    component.selectPromotionCategory('rentals');
    fixture.detectChanges();
    expect(component.displayedOffers.length).toBe(1);
    expect(component.displayedOffers[0].title).toBe('Trincomalee Bike Adventure');

    // Experience Offers
    component.selectPromotionCategory('experiences');
    fixture.detectChanges();
    expect(component.displayedOffers.length).toBe(1);
    expect(component.displayedOffers[0].title).toBe('Batticaloa Lagoon Experience');

    // All Offers
    component.selectPromotionCategory('all');
    fixture.detectChanges();
    expect(component.displayedOffers.length).toBe(3);
  });

  it('should show informational non-redeemable toast when viewing a demo offer', () => {
    const demoOffer = component.demoOffers[0];
    component.onViewOffer(demoOffer);
    fixture.detectChanges();

    expect(component.toastMessage()).toContain('Demo Offer: Special discount preview for Jaffna Homestay Escape');
  });

  // =========================================================================
  // SECTION 08: WHY CEYLONGO? (5 UNIQUE SELLING POINTS)
  // =========================================================================
  it('should render Why CeylonGo section with 5 unique selling points and outline SVG icons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#why-ceylongo');
    expect(section).toBeTruthy();

    const eyebrow = section?.querySelector('.why-eyebrow');
    expect(eyebrow?.textContent?.trim()).toBe('THE CEYLONGO DIFFERENCE');

    const heading = section?.querySelector('#why-heading');
    expect(heading?.textContent?.trim()).toBe('Why CeylonGo?');

    const tagline = section?.querySelector('.why-tagline');
    expect(tagline?.textContent?.trim()).toBe('Discover Local. Feel at Home.');

    const subtitle = section?.querySelector('.why-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('More than a holiday. An authentic connection to Sri Lanka.');

    const items = section?.querySelectorAll('.why-feature-item');
    expect(items?.length).toBe(5);

    const titles = Array.from(items || []).map((c) =>
      c.querySelector('.why-feature-title')?.textContent?.trim()
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
  // CONTEXTUAL AUTHENTICATION & RESUME ACTIONS
  // =========================================================================
  it('should delegate TravelerAuthModal rendering to TravelerLayoutComponent without duplicating it in TravelerHome', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const modal = compiled.querySelector('app-traveler-auth-modal');
    expect(modal).toBeNull();
  });

  it('should prompt contextual auth modal when guest clicks Generate My Trip with destination & duration', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    component.selectDestination('Kandy');
    component.selectDuration('3 Days');
    component.onGenerateMyTrip();
    fixture.detectChanges();

    expect(component.authModalService.isOpen()).toBe(true);
    expect(component.authModalService.intentMode()).toBe('login');

    const pending = component.authModalService.pendingAction();
    expect(pending).toBeTruthy();
    expect(pending?.type).toBe('generate-trip');
    expect(pending?.data).toEqual({ destination: 'Kandy', duration: '3 Days' });
    expect(typeof pending?.resumeCallback).toBe('function');
    expect(component.toastMessage()).toContain('Please log in or create an account');
  });

  it('should navigate to /ai-planner with preserved quick draft when authenticated traveler clicks Generate My Trip', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    component.selectDestination('Ella');
    component.selectDuration('2 Days');
    component.onGenerateMyTrip();
    fixture.detectChanges();

    expect(component.authModalService.isOpen()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner'], {
      queryParams: { destination: 'Ella', duration: '2 Days' },
    });
    expect(component.toastMessage()).toContain('Ella (2 Days)');
  });

  it('should navigate to /ai-planner when hero Plan Your Trip with AI CTA is clicked', () => {
    component.onPlanTripWithAI();
    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner']);
  });

  it('should render Live Weather and Explore Map compact shortcuts inside hero action row', () => {
    const el = fixture.nativeElement as HTMLElement;
    const weatherLink = el.querySelector('a[href="/weather"]');
    const mapLink = el.querySelector('a[href="/map"]');

    expect(weatherLink).toBeTruthy();
    expect(weatherLink?.textContent).toContain('Live Weather');
    expect(mapLink).toBeTruthy();
    expect(mapLink?.textContent).toContain('Explore Map');
  });
});
