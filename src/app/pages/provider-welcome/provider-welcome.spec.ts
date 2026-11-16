import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';

import { ProviderWelcome } from './provider-welcome';

describe('ProviderWelcome Component', () => {
  let component: ProviderWelcome;
  let fixture: ComponentFixture<ProviderWelcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderWelcome],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderWelcome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand title and provider portal badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const portalTitle = compiled.querySelector('.portal-title');
    expect(portalTitle?.textContent).toContain('Provider Portal');

    const brandLogo = compiled.querySelector('.brand-logo');
    expect(brandLogo).not.toBeNull();
  });

  it('should render the hero heading with CeylonGo brand styling', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heroTitle = compiled.querySelector('.hero-title');
    expect(heroTitle?.textContent).toContain('Become a');
    expect(heroTitle?.textContent).toContain('CeylonGo');
    expect(heroTitle?.textContent).toContain('Service Provider');
  });

  it('should contain primary and secondary CTAs routing to register and login', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const primaryCta = compiled.querySelector('.btn-hero-primary') as HTMLAnchorElement;
    expect(primaryCta?.getAttribute('href')).toBe('/provider/register');

    const secondaryCta = compiled.querySelector('.btn-hero-secondary') as HTMLAnchorElement;
    expect(secondaryCta?.getAttribute('href')).toBe('/provider/login');
  });

  it('should render the floating benefits bar with 4 items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const benefitItems = compiled.querySelectorAll('.benefit-item');
    expect(benefitItems.length).toBe(4);

    const barText = compiled.querySelector('.benefits-card')?.textContent ?? '';
    expect(barText).toContain('Get More');
    expect(barText).toContain('Bookings');
    expect(barText).toContain('Reach');
    expect(barText).toContain('Travelers');
    expect(barText).toContain('Grow Your');
    expect(barText).toContain('Business');
    expect(barText).toContain("Sri Lanka's");
    expect(barText).toContain('Tourism Growth');
  });

  it('should toggle FAQ items open and closed', () => {
    expect(component.openFaqIndex()).toBe(0);

    // Toggle same index to close
    component.toggleFaq(0);
    expect(component.openFaqIndex()).toBeNull();

    // Toggle index 1 to open
    component.toggleFaq(1);
    expect(component.openFaqIndex()).toBe(1);
  });

  it('should toggle mobile menu', () => {
    expect(component.mobileMenuOpen()).toBe(false);

    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBe(true);

    component.closeMobileMenu();
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('should update active navigation section on scrollTo', () => {
    component.scrollTo('how-it-works');
    expect(component.activeNavSection()).toBe('how-it-works');

    component.scrollTo('home');
    expect(component.activeNavSection()).toBe('home');
  });
});
