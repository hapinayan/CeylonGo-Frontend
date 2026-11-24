import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Home } from './home';

describe('Home Component (Airbnb-Inspired Blue & White)', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the home component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });

  it('should render centered hero title Stay, Explore and Experience Sri Lanka Like a Local', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heroTitle = compiled.querySelector('.hero-title');
    expect(heroTitle).toBeTruthy();
    expect(heroTitle?.textContent).toContain('Stay, Explore and Experience Sri Lanka');
    expect(heroTitle?.textContent).toContain('Like a Local');

    const royalBlueSpan = compiled.querySelector('.highlight-blue');
    expect(royalBlueSpan).toBeTruthy();
    expect(royalBlueSpan?.textContent?.trim()).toBe('Like a Local');
  });

  it('should render the hero subtitle with authentic homestays description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const subtitle = compiled.querySelector('.hero-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle?.textContent).toContain('Book authentic homestays, join local experiences');
    expect(subtitle?.textContent).toContain('connect with welcoming communities across Sri Lanka.');
  });

  it('should render the Explore Now primary CTA button and handle click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const exploreBtn = compiled.querySelector('.btn-explore-now') as HTMLAnchorElement;
    expect(exploreBtn).toBeTruthy();
    expect(exploreBtn.textContent).toContain('Explore Now');
    expect(exploreBtn.getAttribute('href')).toBe('#categories');

    let called = false;
    const original = component.onExploreNow;
    component.onExploreNow = (e) => {
      called = true;
      original.call(component, e);
    };

    exploreBtn.click();
    expect(called).toBe(true);
  });

  it('should render the Why Choose CeylonGo section component immediately below Popular Experiences', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const experiences = compiled.querySelector('#experiences');
    const whySection = compiled.querySelector('app-why-choose-ceylongo');
    const banners = compiled.querySelector('.promo-banners-section');

    expect(experiences).toBeTruthy();
    expect(whySection).toBeTruthy();
    expect(banners).toBeTruthy();
    expect(compiled.querySelector('#why-ceylongo')).toBeTruthy();

    const compareExpWhy = experiences!.compareDocumentPosition(whySection!);
    expect(compareExpWhy & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const compareWhyBanners = whySection!.compareDocumentPosition(banners!);
    expect(compareWhyBanners & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // PHASE 2 TESTS: CATEGORY SHORTCUTS
  it('should render exactly six category shortcuts in the specified order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const shortcuts = compiled.querySelectorAll('app-category-shortcut');
    expect(shortcuts.length).toBe(6);

    const labels = Array.from(compiled.querySelectorAll('.categories-track .shortcut-label'))
      .map(el => el.textContent?.trim());

    expect(labels).toEqual([
      'Homestays',
      'Experiences',
      'Tour Guides',
      'Bike Rentals',
      'Community',
      'AI Trip Planner'
    ]);
  });

  // PHASE 2 TESTS: FEATURED HOMESTAYS IN SRI LANKA
  it('should render Featured Homestays section with heading and View All Homestays link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#homestays');
    expect(section).toBeTruthy();

    const heading = compiled.querySelector('#homestays-heading');
    expect(heading?.textContent?.trim()).toBe('Featured Homestays in Sri Lanka');

    const viewAllLink = compiled.querySelector('.btn-view-all');
    expect(viewAllLink?.textContent).toContain('View All Homestays');
  });

  it('should render exactly four homestay cards in the specified order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-homestay-card');
    expect(cards.length).toBe(4);

    const names = Array.from(compiled.querySelectorAll('.homestay-name'))
      .map(el => el.textContent?.trim());

    expect(names).toEqual([
      'Sigiriya Village Homestay',
      'Mirissa Beach Homestay',
      'Ella Hill View Homestay',
      'Kandy Heritage Homestay'
    ]);

    const locations = Array.from(compiled.querySelectorAll('.homestay-location span'))
      .map(el => el.textContent?.trim());

    expect(locations).toEqual([
      'Sigiriya, Matale',
      'Mirissa, Matara',
      'Ella, Badulla',
      'Kandy, Central'
    ]);

    const prices = Array.from(compiled.querySelectorAll('.price-val'))
      .map(el => el.textContent?.trim());

    expect(prices).toEqual([
      'LKR 8,000',
      'LKR 9,500',
      'LKR 7,500',
      'LKR 10,000'
    ]);
  });

  // PHASE 3 TESTS: POPULAR LOCAL EXPERIENCES
  it('should render Popular Local Experiences section with heading and View All Experiences link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('#experiences');
    expect(section).toBeTruthy();

    const heading = compiled.querySelector('#experiences-heading');
    expect(heading?.textContent?.trim()).toBe('Popular Local Experiences');

    const viewAllLinks = compiled.querySelectorAll('.btn-view-all');
    const viewAllExperiences = Array.from(viewAllLinks).find(el => el.textContent?.includes('View All Experiences'));
    expect(viewAllExperiences).toBeTruthy();
  });

  it('should render exactly four experience cards in the specified order with demonstration data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-experience-card');
    expect(cards.length).toBe(4);

    const names = Array.from(compiled.querySelectorAll('.experience-name'))
      .map(el => el.textContent?.trim());

    expect(names).toEqual([
      'Wildlife Safari',
      'Tea Plantation Experience',
      'Cultural Village Tour',
      'Snorkeling in Trincomalee'
    ]);

    const locations = Array.from(compiled.querySelectorAll('.experience-location span'))
      .map(el => el.textContent?.trim());

    expect(locations).toEqual([
      'Yala National Park',
      'Nuwara Eliya',
      'Habarana',
      'Trincomalee'
    ]);

    const ratings = Array.from(compiled.querySelectorAll('.experiences-grid .rating-val'))
      .map(el => el.textContent?.trim());

    expect(ratings).toEqual([
      '4.9',
      '4.8',
      '4.9',
      '4.8'
    ]);

    const reviewCounts = Array.from(compiled.querySelectorAll('.experiences-grid .review-count'))
      .map(el => el.textContent?.trim());

    expect(reviewCounts).toEqual([
      '(156)',
      '(112)',
      '(98)',
      '(124)'
    ]);
  });

  it('should show informative feedback toast when View All Experiences is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const viewAllLinks = compiled.querySelectorAll('.btn-view-all');
    const viewAllExperiences = Array.from(viewAllLinks).find(el => el.textContent?.includes('View All Experiences')) as HTMLElement;

    expect(viewAllExperiences).toBeTruthy();
    viewAllExperiences.click();
    fixture.detectChanges();

    expect(component.searchFeedback()?.message).toContain('Experiences catalog is coming soon');
  });

  // PHASE 4 TESTS: PROMOTIONAL BANNERS (AI TRIP PLANNER & COMMUNITY)
  it('should render AI Trip Planner banner with title, description, and button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const aiBanner = compiled.querySelector('app-ai-planner-banner');
    expect(aiBanner).toBeTruthy();

    const title = aiBanner?.querySelector('#ai-banner-title');
    expect(title?.textContent?.trim()).toBe('Plan Your Trip with AI');

    const btn = aiBanner?.querySelector('.btn-try-ai');
    expect(btn?.textContent).toContain('Try AI Trip Planner');
  });

  it('should render Community banner with title, description, and button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const communityBanner = compiled.querySelector('app-community-banner');
    expect(communityBanner).toBeTruthy();

    const title = communityBanner?.querySelector('#community-banner-title');
    expect(title?.textContent?.trim()).toBe('Join the CeylonGo Community');

    const btn = communityBanner?.querySelector('.btn-join-community');
    expect(btn?.textContent).toContain('Join Community');
  });

  it('should trigger informational feedback on AI Planner and Community button clicks', () => {
    component.onTryAiPlanner();
    fixture.detectChanges();
    expect(component.searchFeedback()?.message).toContain('AI Trip Planner is launching soon');

    component.onJoinCommunity();
    fixture.detectChanges();
    expect(component.searchFeedback()?.message).toContain('CeylonGo Community is launching soon');
  });

  it('should render the footer component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });

  it('should render the traveler auth modal component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-traveler-auth-modal')).toBeTruthy();
  });
});
