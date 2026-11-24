import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';

describe('Footer Component', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the footer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand logo and tagline', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoImg = compiled.querySelector('.brand-logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/images/ceylongo-blue-logo.png');

    const tagline = compiled.querySelector('.brand-tagline');
    expect(tagline?.textContent).toContain('Discover Local. Feel at Home.');
  });

  it('should render the 4 main column headers: Explore, Support, Company, Follow Us', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titles = Array.from(compiled.querySelectorAll('.footer-col-title')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles).toContain('Explore');
    expect(titles).toContain('Support');
    expect(titles).toContain('Company');
    expect(titles).toContain('Follow Us');
  });

  it('should render the social media links with accessible labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const socialLinks = compiled.querySelectorAll('.footer-socials .social-link');
    expect(socialLinks.length).toBe(4);
    socialLinks.forEach((link) => {
      expect(link.getAttribute('aria-label')).toBeTruthy();
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });

  it('should display the copyright text with the current year', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const copyright = compiled.querySelector('.copyright-text');
    expect(copyright?.textContent).toContain(component.currentYear.toString());
    expect(copyright?.textContent).toContain('CeylonGo. All rights reserved.');
  });

  it('should render working router links to legal pages', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const privacyLinks = compiled.querySelectorAll('a[routerLink="/privacy"]');
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);

    const termsLinks = compiled.querySelectorAll('a[routerLink="/terms"]');
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('should display informational feedback toast when an unavailable link is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('.footer-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();

    component.onUnavailableLink(new MouseEvent('click'), 'Help Center');
    fixture.detectChanges();

    expect(component.infoToast()).toContain('Help Center is coming soon');
    const toast = compiled.querySelector('.footer-toast');
    expect(toast?.textContent).toContain('Help Center is coming soon');
  });

  it('should display informational feedback toast when a social link is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fbLink = compiled.querySelector('.social-facebook') as HTMLAnchorElement;
    expect(fbLink).toBeTruthy();

    component.onSocialClick(new MouseEvent('click'), 'Facebook');
    fixture.detectChanges();

    expect(component.infoToast()).toContain('Official CeylonGo Facebook page is coming soon');
    const toast = compiled.querySelector('.footer-toast');
    expect(toast?.textContent).toContain('Official CeylonGo Facebook page is coming soon');
  });
});
