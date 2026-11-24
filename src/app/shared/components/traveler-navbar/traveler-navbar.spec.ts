import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TravelerNavbar } from './traveler-navbar';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.models';

describe('TravelerNavbar Component', () => {
  let component: TravelerNavbar;
  let fixture: ComponentFixture<TravelerNavbar>;
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
    logout: vi.fn(() => {
      currentUserSignal.set(null);
    }),
  };

  beforeEach(async () => {
    currentUserSignal.set(mockUser);

    await TestBed.configureTestingModule({
      imports: [TravelerNavbar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TravelerNavbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the TravelerNavbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the official CeylonGo logo linking to /traveler/home', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoImg = compiled.querySelector('.brand-logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/images/ceylongo-blue-logo.png');
  });

  it('should render exactly 5 center navigation links in order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.desktop-nav .nav-link');
    expect(links.length).toBe(5);

    const labels = Array.from(links).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Home', 'Community', 'AI Trip Planner', 'Contact Us', 'About']);
  });

  it('should highlight Home as the active navigation item initially', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const activeLink = compiled.querySelector('.desktop-nav .nav-link.active');
    expect(activeLink?.textContent?.trim()).toBe('Home');
  });

  it('should render the Become A Host button and navigate to /provider/register on click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hostBtn = compiled.querySelector('.btn-become-host') as HTMLButtonElement;
    expect(hostBtn).toBeTruthy();
    expect(hostBtn.textContent).toContain('Become A Host');

    hostBtn.click();
    expect(router.navigate).toHaveBeenCalledWith(['/provider/register']);
  });

  it('should toggle notification dropdown on bell icon click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const bellBtn = compiled.querySelector('.btn-notification') as HTMLButtonElement;
    expect(bellBtn).toBeTruthy();

    expect(component.isNotificationsOpen()).toBe(false);
    bellBtn.click();
    fixture.detectChanges();

    expect(component.isNotificationsOpen()).toBe(true);
    const dropdown = compiled.querySelector('.notification-dropdown');
    expect(dropdown).toBeTruthy();
    expect(dropdown?.textContent).toContain("You're all caught up!");
  });

  it('should display traveler actual name in profile button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameLabel = compiled.querySelector('.traveler-name-label');
    expect(nameLabel?.textContent?.trim()).toBe('Hapinayan Perera');
  });

  it('should toggle profile dropdown on profile button click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const profileBtn = compiled.querySelector('.btn-profile') as HTMLButtonElement;
    expect(profileBtn).toBeTruthy();

    profileBtn.click();
    fixture.detectChanges();

    expect(component.isProfileMenuOpen()).toBe(true);
    const profileDropdown = compiled.querySelector('.profile-dropdown');
    expect(profileDropdown).toBeTruthy();
    expect(profileDropdown?.textContent).toContain('Hapinayan Perera');
    expect(profileDropdown?.textContent).toContain('hapinayan017@gmail.com');
    expect(profileDropdown?.textContent).toContain('My Profile');
    expect(profileDropdown?.textContent).toContain('My Bookings');
    expect(profileDropdown?.textContent).toContain('Wishlist');
    expect(profileDropdown?.textContent).toContain('Settings');
    expect(profileDropdown?.textContent).toContain('Help & Support');
    expect(profileDropdown?.textContent).toContain('Log out');
  });

  it('should call authService.logout and navigate to / when Log out is clicked', () => {
    component.toggleProfileMenu();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector('.logout-item') as HTMLButtonElement;
    expect(logoutBtn).toBeTruthy();

    logoutBtn.click();
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.isProfileMenuOpen()).toBe(false);
  });

  it('should close all dropdowns when Escape key is pressed', () => {
    component.isProfileMenuOpen.set(true);
    component.isNotificationsOpen.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isProfileMenuOpen()).toBe(false);
    expect(component.isNotificationsOpen()).toBe(false);
  });

  it('should toggle and close mobile drawer', () => {
    expect(component.isMobileMenuOpen()).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(true);

    component.closeMobileMenu();
    expect(component.isMobileMenuOpen()).toBe(false);
  });
});
