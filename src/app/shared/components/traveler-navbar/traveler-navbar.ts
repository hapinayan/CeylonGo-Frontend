import {
  Component,
  DestroyRef,
  signal,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  HostListener,
  ElementRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import {
  TravelerNotificationItem,
  TravelerNotificationsService,
  resolveNotificationRoute,
} from '../../../core/services/traveler-notifications.service';
import { User } from '../../../core/models/auth.models';

export type NotificationItem = TravelerNotificationItem;

@Component({
  selector: 'app-traveler-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './traveler-navbar.html',
  styleUrls: ['./traveler-navbar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerNavbar implements OnInit {
  /** Retained as a backward-compatible optional input; Homepage UI is always rendered. */
  readonly variant = input<'default' | 'bookings'>('default');
  readonly bookingSearchRequested = output<void>();

  readonly experienceDropdownLinks = [
    { label: 'All Experiences', path: '/experiences' },
    { label: 'Homestays', path: '/homestays' },
    { label: 'Tour Guides', path: '/tour-guides' },
    { label: 'Bike & Bicycle Rentals', path: '/bicycles' },
    { label: 'Artisans & Handicrafts', path: '/artisans/discover' },
  ];

  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  readonly notificationsService = inject(TravelerNotificationsService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isMobileMenuOpen = signal(false);
  readonly isExperiencesDropdownOpen = signal(false);
  readonly isMobileExperiencesOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly activeSection = signal<string | null>('home');

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  openAuthModal(mode: 'login' | 'register', event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();
    this.authModalService.open(mode);
  }

  readonly isProfileMenuOpen = signal(false);
  readonly isNotificationsOpen = signal(false);

  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly isNotificationsLoading = this.notificationsService.isLoading;
  readonly notificationError = this.notificationsService.errorMessage;

  readonly infoToast = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
        this.toastTimer = null;
      }
    });
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'scroll',
        () => {
          this.isScrolled.set(window.scrollY > 15);
        },
        { passive: true }
      );
    }
  }

  ngOnInit(): void {
    this.updateActiveSectionFromUrl();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.isExperiencesDropdownOpen.set(false);
        this.updateActiveSectionFromUrl();
      });

    if (this.authService.isAuthenticated()) {
      if (!this.authService.currentUser()) {
        this.authService.getCurrentUser().subscribe({
          next: () => {},
          error: () => {},
        });
      }
      if (this.isTravelerSession) {
        this.notificationsService.refreshUnreadCount().subscribe();
      }
    }
  }

  get isTravelerSession(): boolean {
    const user = this.authService.currentUser();
    return this.authService.isAuthenticated() && (!user || user.role === 'traveler');
  }

  get avatarSrc(): string | null {
    return this.authService.avatarUrl?.() || this.currentUser?.avatar_url || null;
  }

  private updateActiveSectionFromUrl(): void {
    const rawUrl = this.router.url || '/';
    const path = rawUrl.split('?')[0].split('#')[0] || '/';

    if (/^\/(?:experiences|explore|homestays?|stays|tour-guides?|bicycles|bike-rentals|rentals|artisans?)(?:\/|$)/.test(path)) {
      this.activeSection.set('experiences');
      return;
    }

    if (/^\/community(?:\/|$)/.test(path)) {
      this.activeSection.set('community');
      return;
    }

    if (/^\/(?:ai-planner|ai-trip-planner|travel-preferences|saved-trips|itinerary)(?:\/|$)/.test(path)) {
      this.activeSection.set('ai-planner');
      return;
    }

    if (/^\/contact(?:\/|$)/.test(path)) {
      this.activeSection.set('contact');
      return;
    }

    if (/^\/about(?:\/|$)/.test(path)) {
      this.activeSection.set('about');
      return;
    }

    const isHomepagePath = path === '/' || path === '' || path === '/home' || path === '/traveler' || path === '/traveler/home';
    if (!isHomepagePath) {
      // Account, booking, wishlist, and legal pages must not highlight Home.
      this.activeSection.set(null);
      return;
    }

    const fragment = rawUrl.includes('#') ? rawUrl.split('#')[1] : '';
    const windowHash = typeof window !== 'undefined' ? window.location.hash?.replace('#', '') : '';
    const hash = fragment || windowHash;
    if (hash && ['community', 'ai-planner', 'contact', 'about'].includes(hash)) {
      this.activeSection.set(hash);
    } else {
      this.activeSection.set('home');
    }
  }

  get currentUser(): User | null {
    return this.authService.currentUser();
  }

  get travelerName(): string {
    return this.currentUser?.full_name?.trim() || 'Traveler';
  }

  get travelerEmail(): string {
    return this.currentUser?.email?.trim() || '';
  }

  get travelerInitials(): string {
    const name = this.travelerName;
    if (!name) return 'TR';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  toggleExperiencesDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isProfileMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.isExperiencesDropdownOpen.update((open) => !open);
  }

  closeExperiencesDropdown(): void {
    this.isExperiencesDropdownOpen.set(false);
  }

  toggleMobileExperiences(): void {
    this.isMobileExperiencesOpen.update((open) => !open);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
    if (this.isMobileMenuOpen()) {
      this.isProfileMenuOpen.set(false);
      this.isNotificationsOpen.set(false);
      this.isExperiencesDropdownOpen.set(false);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.isMobileExperiencesOpen.set(false);
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isNotificationsOpen.set(false);
    this.isExperiencesDropdownOpen.set(false);
    this.isProfileMenuOpen.update((open) => !open);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen.set(false);
    this.isExperiencesDropdownOpen.set(false);
    const next = !this.isNotificationsOpen();
    this.isNotificationsOpen.set(next);
    if (next && this.isTravelerSession) {
      this.notificationsService.refresh({ page: 1, pageSize: 8, unreadOnly: false, category: null });
    }
  }

  onNotificationClick(notif: TravelerNotificationItem): void {
    this.isNotificationsOpen.set(false);
    if (!notif.is_read) {
      this.notificationsService.markAsRead(notif.id).subscribe({ error: () => {} });
    }
    const target = resolveNotificationRoute(notif);
    if (target) {
      this.router.navigate(target);
    } else {
      this.router.navigate(['/notifications']);
    }
  }

  markAllNotificationsRead(event: Event): void {
    event.stopPropagation();
    if (!this.isTravelerSession || this.unreadCount() === 0) return;
    this.notificationsService.markAllAsRead().subscribe({ error: () => {} });
  }

  closeNotifications(): void {
    this.isNotificationsOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isProfileMenuOpen.set(false);
      this.isNotificationsOpen.set(false);
      this.isExperiencesDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Esc') {
      this.isProfileMenuOpen.set(false);
      this.isNotificationsOpen.set(false);
      this.isExperiencesDropdownOpen.set(false);
      this.isMobileMenuOpen.set(false);
    }
  }

  navigateToBecomeAHost(): void {
    this.closeMobileMenu();
    this.router.navigate(['/provider']);
  }

  onNavClick(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();
    this.closeExperiencesDropdown();

    if (sectionId === 'experiences') {
      this.activeSection.set('experiences');
      this.router.navigate(['/experiences']);
      return;
    }

    if (sectionId === 'community') {
      this.activeSection.set('community');
      this.router.navigate(['/community']);
      return;
    }

    if (sectionId === 'ai-planner') {
      this.activeSection.set('ai-planner');
      this.router.navigate(['/ai-planner']);
      return;
    }

    if (sectionId === 'home') {
      this.activeSection.set('home');
      const currentPath = this.router.url.split('?')[0].split('#')[0];
      if (currentPath !== '/' && currentPath !== '' && currentPath !== '/traveler/home') {
        this.router.navigate(['/']).then(() => {
          if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (sectionId === 'contact') {
      this.activeSection.set('contact');
      this.router.navigate(['/contact']);
      return;
    }

    if (sectionId === 'about') {
      this.activeSection.set('about');
      this.router.navigate(['/about']);
      return;
    }

    this.activeSection.set(sectionId);
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    if (currentPath !== '/' && currentPath !== '' && currentPath !== '/traveler/home') {
      this.router.navigate(['/'], { fragment: sectionId });
    } else {
      const element = document.getElementById(sectionId);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  onProfileMenuItemClick(action: string): void {
    this.closeProfileMenu();
    this.closeMobileMenu();

    switch (action) {
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      case 'bookings':
        this.router.navigate(['/my-bookings']);
        break;
      case 'wishlist':
        this.router.navigate(['/wishlist']);
        break;
      case 'notifications':
        this.isNotificationsOpen.set(false);
        this.router.navigate(['/notifications']);
        break;
      case 'settings':
        this.router.navigate(['/settings']);
        break;
      case 'help':
        this.showToast('Help & Support: 24/7 traveler assistance.');
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  logout(): void {
    this.closeProfileMenu();
    this.closeMobileMenu();
    this.notificationsService.clearOnLogout();
    this.authService.logout();
    this.router.navigate(['/']);
  }

  private showToast(message: string): void {
    this.infoToast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.infoToast.set(null);
      this.toastTimer = null;
    }, 3500);
  }
}
