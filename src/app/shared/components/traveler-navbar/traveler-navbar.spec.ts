import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TravelerNavbar } from './traveler-navbar';
import { AuthService } from '../../../core/services/auth.service';
import { TravelerNotificationsService } from '../../../core/services/traveler-notifications.service';
import { User } from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

describe('TravelerNavbar Component — Phase 10B Refinement', () => {
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
  const avatarUrlSignal = signal<string | null>(null);
  const authServiceMock = {
    currentUser: currentUserSignal,
    avatarUrl: avatarUrlSignal,
    isAuthenticated: vi.fn(() => true),
    getToken: vi.fn(() => 'traveler-jwt'),
    getCurrentUser: vi.fn(),
    logout: vi.fn(() => {
      currentUserSignal.set(null);
      avatarUrlSignal.set(null);
    }),
  };

  let httpMock: HttpTestingController;
  let notifService: TravelerNotificationsService;

  beforeEach(async () => {
    currentUserSignal.set(mockUser);
    avatarUrlSignal.set(null);
    authServiceMock.isAuthenticated.mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [TravelerNavbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    notifService = TestBed.inject(TravelerNotificationsService);
    notifService.stopPolling();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TravelerNavbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.match(() => true).forEach((r) => r.flush({ unread_count: 0 }));
  });

  it('should create the TravelerNavbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the official CeylonGo logo linking to /', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const brandLink = compiled.querySelector('.navbar-brand') as HTMLAnchorElement;
    expect(brandLink).toBeTruthy();
    const logoImg = compiled.querySelector('.brand-logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/images/ceylongo-blue-logo.png');
  });

  it('should render exactly 6 center navigation links in order', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.desktop-nav .nav-link');
    expect(links.length).toBe(6);

    const labels = Array.from(links).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Home', 'Experiences', 'Community', 'AI Trip Planner', 'Contact Us', 'About']);
  });

  it('should navigate to /experiences when Experiences link is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.desktop-nav .nav-link');
    const experiencesLink = Array.from(links).find((l) => l.textContent?.trim() === 'Experiences') as HTMLAnchorElement;
    expect(experiencesLink).toBeTruthy();

    experiencesLink.click();
    expect(router.navigate).toHaveBeenCalledWith(['/experiences']);
  });

  it('should highlight Home as the active navigation item initially', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const activeLink = compiled.querySelector('.desktop-nav .nav-link.active');
    expect(activeLink?.textContent?.trim()).toBe('Home');
  });

  it('should render the Become A Host button and navigate to /provider on click for authenticated traveler', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hostBtn = compiled.querySelector('.btn-become-host') as HTMLButtonElement;
    expect(hostBtn).toBeTruthy();
    expect(hostBtn.textContent).toContain('Become A Host');

    hostBtn.click();
    expect(router.navigate).toHaveBeenCalledWith(['/provider']);
  });

  it('should toggle notification dropdown on bell icon click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const bellBtn = compiled.querySelector('.btn-notification') as HTMLButtonElement;
    expect(bellBtn).toBeTruthy();

    expect(component.isNotificationsOpen()).toBe(false);
    bellBtn.click();
    httpMock
      .expectOne((r) => r.url === `${environment.apiBaseUrl}/notifications`)
      .flush({ unread_count: 0, total: 0, page: 1, page_size: 8, items: [] });
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
    expect(profileDropdown?.textContent).toContain('Notifications');
    expect(profileDropdown?.textContent).toContain('Account Settings');
    expect(profileDropdown?.textContent).toContain('Help & Support');
    expect(profileDropdown?.textContent).toContain('Log out');
  });

  it('should navigate to /profile, /my-bookings, /wishlist, /notifications, and /settings from profile dropdown', () => {
    component.onProfileMenuItemClick('profile');
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);

    component.onProfileMenuItemClick('bookings');
    expect(router.navigate).toHaveBeenCalledWith(['/my-bookings']);

    component.onProfileMenuItemClick('wishlist');
    expect(router.navigate).toHaveBeenCalledWith(['/wishlist']);

    component.onProfileMenuItemClick('notifications');
    expect(router.navigate).toHaveBeenCalledWith(['/notifications']);

    component.onProfileMenuItemClick('settings');
    expect(router.navigate).toHaveBeenCalledWith(['/settings']);
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

  // =========================================================================
  // PHASE 10B: GUEST VS AUTHENTICATED STATE (EXACTLY TWO GUEST BUTTONS)
  // =========================================================================
  it('should render exactly two buttons in guest mode: Become a Host (outlined) and Login / Register (solid blue)', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    currentUserSignal.set(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const guestHostBtn = compiled.querySelector('.btn-guest-host') as HTMLButtonElement;
    const loginRegisterBtn = compiled.querySelector('.btn-login-register') as HTMLButtonElement;

    expect(guestHostBtn).toBeTruthy();
    expect(guestHostBtn.textContent?.trim()).toContain('Become a Host');

    expect(loginRegisterBtn).toBeTruthy();
    expect(loginRegisterBtn.textContent?.trim()).toBe('Login / Register');

    // Ensure authenticated elements are hidden
    expect(compiled.querySelector('.btn-notification')).toBeNull();
    expect(compiled.querySelector('.btn-profile')).toBeNull();

    // Clicking Become a Host navigates to /provider
    guestHostBtn.click();
    expect(router.navigate).toHaveBeenCalledWith(['/provider']);

    // Clicking Login / Register opens auth modal in login mode
    loginRegisterBtn.click();
    expect(component.authModalService.isOpen()).toBe(true);
    expect(component.authModalService.intentMode()).toBe('login');
  });

  it('should render identical 6 items without adding Artisans/Stays/Rentals across all module routes and update active highlights correctly', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const realRoutes = [
      { path: 'artisans/discover', component: TravelerNavbar },
      { path: 'homestays', component: TravelerNavbar },
      { path: 'experiences', component: TravelerNavbar },
      { path: 'tour-guides', component: TravelerNavbar },
      { path: 'bicycles', component: TravelerNavbar },
      { path: 'community', component: TravelerNavbar },
      { path: 'ai-planner', component: TravelerNavbar },
      { path: 'my-bookings', component: TravelerNavbar },
      { path: 'wishlist', component: TravelerNavbar },
    ];
    router.resetConfig(realRoutes);
    vi.spyOn(router, 'navigate').mockRestore();

    const expectedOrder = ['Home', 'Experiences', 'Community', 'AI Trip Planner', 'Contact Us', 'About'];

    for (const expPath of ['/artisans/discover', '/homestays', '/experiences', '/tour-guides', '/bicycles']) {
      await router.navigateByUrl(expPath);
      fixture.detectChanges();
      await fixture.whenStable();
      const labels = Array.from(compiled.querySelectorAll('.desktop-nav .nav-link')).map((l) => l.textContent?.trim());
      expect(labels).toEqual(expectedOrder);
      expect(compiled.querySelector('.desktop-nav .nav-link.active')?.textContent?.trim()).toBe('Experiences');
    }

    await router.navigateByUrl('/community');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(compiled.querySelectorAll('.desktop-nav .nav-link')).map((l) => l.textContent?.trim())).toEqual(expectedOrder);
    expect(compiled.querySelector('.desktop-nav .nav-link.active')?.textContent?.trim()).toBe('Community');

    await router.navigateByUrl('/ai-planner');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Array.from(compiled.querySelectorAll('.desktop-nav .nav-link')).map((l) => l.textContent?.trim())).toEqual(expectedOrder);
    expect(compiled.querySelector('.desktop-nav .nav-link.active')?.textContent?.trim()).toBe('AI Trip Planner');

    // Utility/account pages must keep the same 6 links and must NOT incorrectly highlight Home
    for (const utilPath of ['/my-bookings', '/wishlist']) {
      await router.navigateByUrl(utilPath);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(Array.from(compiled.querySelectorAll('.desktop-nav .nav-link')).map((l) => l.textContent?.trim())).toEqual(expectedOrder);
      expect(compiled.querySelector('.desktop-nav .nav-link.active')).toBeNull();
    }
  });

  it('should expose Artisans and other categories inside the Experiences dropdown without changing top-level nav items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const caretBtn = compiled.querySelector('.experiences-caret-btn') as HTMLButtonElement;
    expect(caretBtn).toBeTruthy();

    caretBtn.click();
    fixture.detectChanges();

    const dropdownItems = Array.from(compiled.querySelectorAll('.experiences-dropdown .exp-dropdown-link')).map((a) =>
      a.textContent?.trim(),
    );
    expect(dropdownItems).toEqual([
      'All Experiences',
      'Homestays',
      'Tour Guides',
      'Bike & Bicycle Rentals',
      'Artisans & Handicrafts',
    ]);
  });

  it('synchronizes unread notifications badge, marks notification read, navigates to booking, and clears on logout', () => {
    notifService.unreadCount.set(2);
    notifService.notifications.set([
      {
        id: 77,
        notification_type: 'booking_confirmed',
        category: 'booking',
        title: 'Booking Confirmed',
        message: 'Hilltop Villa confirmed reservation #41',
        related_entity_type: 'booking',
        related_entity_id: 41,
        is_read: false,
        created_at: '2026-11-27T01:00:00Z',
        read_at: null,
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notification-badge')?.textContent?.trim()).toBe('2');

    component.toggleNotifications();
    const listReq = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/notifications`);
    listReq.flush({
      unread_count: 2,
      total: 1,
      page: 1,
      page_size: 8,
      items: notifService.notifications(),
    });
    fixture.detectChanges();

    const notifItemBtn = compiled.querySelector('.notification-list .notification-item') as HTMLButtonElement;
    notifItemBtn.click();

    const readReq = httpMock.expectOne({
      method: 'PATCH',
      url: `${environment.apiBaseUrl}/notifications/77/read`,
    });
    readReq.flush({ ...notifService.notifications()[0], is_read: true, read_at: '2026-11-27T02:00:00Z' });
    expect(router.navigate).toHaveBeenCalledWith(['/my-bookings', '41']);
    expect(notifService.unreadCount()).toBe(1);

    component.logout();
    expect(notifService.notifications()).toEqual([]);
    expect(notifService.unreadCount()).toBe(0);
  });
});
