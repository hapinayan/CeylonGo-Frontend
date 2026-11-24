import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';

describe('Navbar Component (Airbnb-Inspired Blue & White)', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the navbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the CeylonGo brand logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoImg = compiled.querySelector('.brand-logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/images/ceylongo-blue-logo.png');
  });

  it('should render the 5 center navigation links in exact order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.desktop-nav .nav-link')).map(
      (el) => el.textContent?.trim()
    );
    expect(links).toEqual([
      'Home',
      'Community',
      'AI Trip Planner',
      'Contact Us',
      'About'
    ]);
  });

  it('should render the exact same 5 navigation options in the mobile menu', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const mobileLinks = Array.from(compiled.querySelectorAll('.mobile-nav .mobile-nav-link')).map(
      (el) => el.textContent?.trim()
    );
    expect(mobileLinks).toEqual([
      'Home',
      'Community',
      'AI Trip Planner',
      'Contact Us',
      'About'
    ]);
  });

  it('should display informational feedback toast when Contact Us is clicked', () => {
    component.onContactUs(new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.infoToast()).toContain('Contact Us: support@ceylongo.com');
    const toast = fixture.nativeElement.querySelector('.navbar-toast');
    expect(toast?.textContent).toContain('support@ceylongo.com');
  });

  it('should not render any language selector in the navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const lang = compiled.querySelector('.language-selector');
    expect(lang).toBeNull();
  });

  it('should render Login and Register buttons and trigger authentication popup on click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const loginBtn = compiled.querySelector('.btn-login') as HTMLElement;
    const registerBtn = compiled.querySelector('.btn-register') as HTMLElement;

    expect(loginBtn).toBeTruthy();
    expect(loginBtn.textContent?.trim()).toBe('Login');

    expect(registerBtn).toBeTruthy();
    expect(registerBtn.textContent?.trim()).toBe('Register');

    loginBtn.click();
    expect(component.authModalService.isOpen()).toBe(true);
    expect(component.authModalService.intentMode()).toBe('login');

    component.authModalService.close();

    registerBtn.click();
    expect(component.authModalService.isOpen()).toBe(true);
    expect(component.authModalService.intentMode()).toBe('register');
  });

  it('should toggle mobile menu drawer', () => {
    expect(component.isMobileMenuOpen()).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(true);
    component.closeMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(false);
  });
});
