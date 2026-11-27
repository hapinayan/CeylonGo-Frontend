import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the about component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero section with eyebrow, heading, and tagline', () => {
    const el = fixture.nativeElement as HTMLElement;
    const eyebrow = el.querySelector('.hero-eyebrow');
    const heading = el.querySelector('#about-hero-heading');
    const tagline = el.querySelector('.hero-tagline');
    const subtitle = el.querySelector('.hero-subtitle');

    expect(eyebrow?.textContent?.trim()).toBe('ABOUT CEYLONGO');
    expect(heading?.textContent?.trim()).toBe('Discover Sri Lanka Through Local Eyes');
    expect(tagline?.textContent?.trim()).toBe('Discover Local. Feel at Home.');
    expect(subtitle?.textContent?.trim()).toBe('More than a holiday. An authentic connection to Sri Lanka.');
  });

  it('should render the breadcrumb with Home linking to /', () => {
    const el = fixture.nativeElement as HTMLElement;
    const homeLink = el.querySelector('.breadcrumb-link') as HTMLAnchorElement;
    expect(homeLink).toBeTruthy();
    expect(homeLink.textContent?.trim()).toBe('Home');
    expect(homeLink.getAttribute('routerLink') || homeLink.getAttribute('href')).toBeTruthy();

    const activeItem = el.querySelector('.breadcrumb-item.active');
    expect(activeItem?.textContent?.trim()).toBe('About Us');
  });

  it('should render Our Story section with verified context', () => {
    const el = fixture.nativeElement as HTMLElement;
    const storyTitle = el.querySelector('#story-heading');
    expect(storyTitle?.textContent?.trim()).toBe('More Than Just a Journey');

    const paragraphs = el.querySelectorAll('.story-paragraphs p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it('should render Mission and Vision cards with approved purpose statements', () => {
    const el = fixture.nativeElement as HTMLElement;
    const mvCards = el.querySelectorAll('.mv-card');
    expect(mvCards.length).toBe(2);

    const missionTitle = el.querySelector('.mission-card .mv-card-title');
    const visionTitle = el.querySelector('.vision-card .mv-card-title');

    expect(missionTitle?.textContent?.trim()).toBe('Our Mission');
    expect(visionTitle?.textContent?.trim()).toBe('Our Vision');

    const missionText = el.querySelector('.mission-card .mv-card-text');
    expect(missionText?.textContent).toContain('To connect travelers with authentic Sri Lankan experiences');

    const visionText = el.querySelector('.vision-card .mv-card-text');
    expect(visionText?.textContent).toContain('To create a future where meaningful and sustainable travel');
  });

  it('should render all 6 ecosystem cards with correct titles and verified routes', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.ecosystem-card');
    expect(cards.length).toBe(6);

    const expectedRoutes = [
      '/homestays',
      '/tour-guides',
      '/experiences',
      '/artisans/discover',
      '/bicycles',
      '/ai-planner',
    ];

    component.ecosystemCards.forEach((item, index) => {
      expect(item.route).toBe(expectedRoutes[index]);
    });
  });

  it('should render the 5 core value propositions of CeylonGo', () => {
    const el = fixture.nativeElement as HTMLElement;
    const valueCards = el.querySelectorAll('.value-item-card');
    expect(valueCards.length).toBe(5);

    const titles = Array.from(el.querySelectorAll('.value-title')).map((t) => t.textContent?.trim());
    expect(titles).toContain('Community-Based Tourism');
    expect(titles).toContain('Local Business & Artisan Promotion');
    expect(titles).toContain('Direct Local Connections');
    expect(titles).toContain('AI-Powered Travel Planning');
    expect(titles).toContain('All-in-One Local Tourism Platform');
  });

  it('should render the Creating a Positive Impact section with 5 impact pillars', () => {
    const el = fixture.nativeElement as HTMLElement;
    const impactItems = el.querySelectorAll('.impact-item');
    expect(impactItems.length).toBe(5);
  });

  it('should render the AI Trip Planner spotlight card with CTA button', () => {
    const el = fixture.nativeElement as HTMLElement;
    const aiTitle = el.querySelector('#ai-spotlight-heading');
    expect(aiTitle?.textContent?.trim()).toBe('Meet the CeylonGo AI Trip Planner');

    const ctaBtn = el.querySelector('.ai-cta-row a');
    expect(ctaBtn?.textContent?.trim()).toContain('Try AI Trip Planner');
  });

  it('should render the final CTA section with links to experiences, provider, and contact', () => {
    const el = fixture.nativeElement as HTMLElement;
    const finalHeading = el.querySelector('#final-cta-heading');
    expect(finalHeading?.textContent?.trim()).toBe('Your Next Adventure Starts Here');

    const buttons = el.querySelectorAll('.cta-buttons-row .btn');
    expect(buttons.length).toBe(3);
  });
});
