import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TravelerHome } from './traveler-home';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/auth.models';

describe('TravelerHome Component — Phase 09 Refinement', () => {
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
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TravelerHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the TravelerHome component', () => {
    expect(component).toBeTruthy();
  });

  // =========================================================================
  // HOMEPAGE STRUCTURE & EXACT SECTION ORDER (7 SECTIONS)
  // =========================================================================
  it('should render all 7 sections in the exact specified order', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Section 01: Authenticated Navbar
    const navbar = compiled.querySelector('app-traveler-navbar');
    expect(navbar).toBeTruthy();

    // Section 02: AI Trip Planner Hero
    const hero = compiled.querySelector('#ai-planner');
    expect(hero).toBeTruthy();

    // Section 03: Explore Sri Lanka Experiences
    const experienceCategories = compiled.querySelector('#experience-categories');
    expect(experienceCategories).toBeTruthy();

    // Section 04: Explore More with CeylonGo
    const exploreMore = compiled.querySelector('#explore-more');
    expect(exploreMore).toBeTruthy();

    // Section 05: CeylonGo Travel Community
    const community = compiled.querySelector('#travel-community');
    expect(community).toBeTruthy();

    // Section 06: Special Offers & Promotions
    const specialOffers = compiled.querySelector('#special-offers');
    expect(specialOffers).toBeTruthy();

    // Section 07: Footer
    const footer = compiled.querySelector('app-footer');
    expect(footer).toBeTruthy();

    // Verify DOM sequence order
    const mainChildren = Array.from(compiled.querySelector('main')?.children || []);
    expect(mainChildren[0]?.id).toBe('ai-planner');
    expect(mainChildren[1]?.id).toBe('experience-categories');
    expect(mainChildren[2]?.id).toBe('explore-more');
    expect(mainChildren[3]?.id).toBe('travel-community');
    expect(mainChildren[4]?.id).toBe('special-offers');
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
    expect(component.toastMessage()).toContain('Launching CeylonGo AI Trip Planner...');
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

    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({
        destination: 'Ella',
        duration: '3 Days',
        planner: 'quick',
      }),
    }));
  });

  // =========================================================================
  // SECTION 03: EXPLORE SRI LANKA EXPERIENCES (8 CATEGORIES)
  // =========================================================================
  it('should render exactly 8 authentic experience categories in specified order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#experience-categories');
    expect(section).toBeTruthy();

    const cards = section?.querySelectorAll('.experience-category-card');
    expect(cards?.length).toBe(8);

    const titles = Array.from(cards || []).map((c) =>
      c.querySelector('.category-card-title')?.textContent?.trim()
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

  it('should support horizontal scrolling and arrow controls for experience categories', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nextBtn = compiled.querySelector('.carousel-arrow-btn.next-btn') as HTMLButtonElement;
    const prevBtn = compiled.querySelector('.carousel-arrow-btn.prev-btn') as HTMLButtonElement;

    expect(nextBtn).toBeTruthy();
    expect(prevBtn).toBeTruthy();
    expect(prevBtn.disabled).toBe(true);

    const scrollSpy = vi.spyOn(component, 'scrollCategories');
    nextBtn.click();
    expect(scrollSpy).toHaveBeenCalledWith(1);

    component.categoryScrollPosition.set(200);
    fixture.detectChanges();
    expect(prevBtn.disabled).toBe(false);
    prevBtn.click();
    expect(scrollSpy).toHaveBeenCalledWith(-1);
  });

  // =========================================================================
  // SECTION 04: EXPLORE MORE WITH CEYLONGO (3 LARGE PHOTO CARDS)
  // =========================================================================
  it('should render Section 04 with heading and exactly 3 real-photo service cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#explore-more');
    expect(section).toBeTruthy();

    const heading = section?.querySelector('#explore-more-heading');
    expect(heading?.textContent?.trim()).toBe('Explore More with CeylonGo');

    const cards = section?.querySelectorAll('.explore-card');
    expect(cards?.length).toBe(3);

    // Card 01: Find Homestays
    const homestayCard = cards?.[0];
    expect(homestayCard?.querySelector('.explore-card-title')?.textContent?.trim()).toBe('Find Homestays');
    expect(homestayCard?.querySelector('.explore-card-description')?.textContent?.trim()).toBe('Stay with local hosts and feel at home.');
    expect(homestayCard?.querySelector('.explore-card-cta')?.textContent?.trim()).toBe('Explore Homestays →');
    const homestayImg = homestayCard?.querySelector('.explore-card-img') as HTMLImageElement;
    expect(homestayImg?.getAttribute('src')).toBe('/images/traveler-home/find-homestays.webp');

    // Card 02: Find Your Tour Guide
    const guideCard = cards?.[1];
    expect(guideCard?.querySelector('.explore-card-title')?.textContent?.trim()).toBe('Find Your Tour Guide');
    expect(guideCard?.querySelector('.explore-card-description')?.textContent?.trim()).toBe('Discover Sri Lanka with trusted local experts.');
    expect(guideCard?.querySelector('.explore-card-cta')?.textContent?.trim()).toBe('Find a Guide →');
    const guideImg = guideCard?.querySelector('.explore-card-img') as HTMLImageElement;
    expect(guideImg?.getAttribute('src')).toBe('/images/traveler-home/find-tour-guide.webp');

    // Card 03: Rent a Bicycle
    const bikeCard = cards?.[2];
    expect(bikeCard?.querySelector('.explore-card-title')?.textContent?.trim()).toBe('Rent a Bicycle');
    expect(bikeCard?.querySelector('.explore-card-description')?.textContent?.trim()).toBe('Explore Sri Lanka freely on two wheels.');
    expect(bikeCard?.querySelector('.explore-card-cta')?.textContent?.trim()).toBe('Explore Rentals →');
    const bikeImg = bikeCard?.querySelector('.explore-card-img') as HTMLImageElement;
    expect(bikeImg?.getAttribute('src')).toBe('/images/traveler-home/rent-bicycle.webp');
  });

  it('should handle service card click with router query params and toast feedback', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.explore-card') as HTMLElement;
    expect(firstCard).toBeTruthy();

    firstCard.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ service: 'homestays' }),
    }));
    expect(component.toastMessage()).toContain('Find Homestays discovery is coming soon');
  });

  // =========================================================================
  // SECTION 05: CEYLONGO TRAVEL COMMUNITY (2-COLUMN PROMOTIONAL)
  // =========================================================================
  it('should render Travel Community 2-column section with authentic photo, label, heading, benefits, and CTA', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#travel-community');
    expect(section).toBeTruthy();

    // Left Column: Photo
    const photo = section?.querySelector('.community-img') as HTMLImageElement;
    expect(photo).toBeTruthy();
    expect(photo.getAttribute('src')).toBe('/images/traveler-home/travel-community.webp');

    // Right Column: Label & Heading
    const label = section?.querySelector('.community-badge-label');
    expect(label?.textContent?.trim()).toBe('Travel Community');

    const heading = section?.querySelector('#community-main-heading');
    expect(heading?.textContent?.trim()).toBe('Travel Together. Share Your Journey.');

    const desc = section?.querySelector('.community-description');
    expect(desc?.textContent).toContain('Connect with fellow travelers, discover inspiring travel stories');

    // 3 Benefits
    const benefits = section?.querySelectorAll('.community-benefits-list .benefit-row');
    expect(benefits?.length).toBe(3);
    const benefitTexts = Array.from(benefits || []).map((b) => b.querySelector('.benefit-label')?.textContent?.trim());
    expect(benefitTexts).toEqual([
      'Share Your Experiences',
      'Discover Travel Stories',
      'Connect with Fellow Travelers',
    ]);

    // Primary CTA Button
    const ctaBtn = section?.querySelector('.btn-explore-community') as HTMLButtonElement;
    expect(ctaBtn).toBeTruthy();
    expect(ctaBtn.textContent?.trim()).toBe('Explore Community →');

    ctaBtn.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ section: 'community' }),
    }));
    expect(component.toastMessage()).toContain('Travel Community features are coming soon');
  });

  // =========================================================================
  // SECTION 06: SPECIAL OFFERS & PROMOTIONS (EMPTY STATE & CATEGORIES)
  // =========================================================================
  it('should render Special Offers & Promotions with heading, subtitle, category tabs, and honest empty state', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#special-offers');
    expect(section).toBeTruthy();

    const heading = section?.querySelector('#special-offers-heading');
    expect(heading?.textContent?.trim()).toBe('Special Offers & Promotions');

    const subtitle = section?.querySelector('.section-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Discover exclusive offers from local hosts and service providers across Sri Lanka.');

    // 4 Category Tabs (All + 3 prompt categories)
    const tabs = section?.querySelectorAll('.promo-tab-btn');
    expect(tabs?.length).toBe(4);
    const tabTexts = Array.from(tabs || []).map((t) => t.textContent?.trim());
    expect(tabTexts).toContain('Homestay Offers');
    expect(tabTexts).toContain('Rental Offers');
    expect(tabTexts).toContain('Experience Offers');

    // Honest empty state verification (since promotions API is unavailable)
    const emptyState = section?.querySelector('.promo-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.querySelector('.empty-title')?.textContent?.trim()).toBe('New offers are coming soon.');
    expect(emptyState?.querySelector('.empty-description')?.textContent?.trim()).toBe('Check back later for special deals from our local service providers.');
  });

  it('should switch promotion category tabs', () => {
    expect(component.selectedPromotionCategory()).toBe('all');

    component.selectPromotionCategory('homestays');
    fixture.detectChanges();
    expect(component.selectedPromotionCategory()).toBe('homestays');

    component.selectPromotionCategory('rentals');
    fixture.detectChanges();
    expect(component.selectedPromotionCategory()).toBe('rentals');
  });

  // =========================================================================
  // VERIFY REMOVAL OF OLD / DUPLICATE SECTIONS
  // =========================================================================
  it('should completely remove old 5 icon services, old Top Experiences, and excluded sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Old 5 light-blue icon cards section
    expect(compiled.querySelector('.services-section')).toBeNull();
    expect(compiled.querySelector('#services-heading')).toBeNull();

    // Old Top Experiences in Sri Lanka section
    expect(compiled.querySelector('.experiences-section')).toBeNull();
    expect(compiled.querySelector('#experiences-heading')).toBeNull();

    // Other excluded sections
    expect(compiled.querySelector('#destinations')).toBeNull();
    expect(compiled.querySelector('.why-choose-section')).toBeNull();
    expect(compiled.querySelector('.search-bar')).toBeNull();
  });
});
