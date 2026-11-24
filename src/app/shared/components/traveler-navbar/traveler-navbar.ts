import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  HostListener,
  ElementRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.models';

export interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

@Component({
  selector: 'app-traveler-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './traveler-navbar.html',
  styleUrls: ['./traveler-navbar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerNavbar implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly isMobileMenuOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly activeSection = signal('home');

  // Dropdown states
  readonly isProfileMenuOpen = signal(false);
  readonly isNotificationsOpen = signal(false);

  // Notification state
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly isNotificationsLoading = signal(false);
  readonly notificationError = signal<string | null>(null);

  readonly infoToast = signal<string | null>(null);

  constructor() {
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
    // Attempt to sync authenticated profile if token exists but user signal is not yet filled
    if (this.authService.isAuthenticated() && !this.authService.currentUser()) {
      this.authService.getCurrentUser().subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }

  get currentUser(): User | null {
    return this.authService.currentUser();
  }

  get travelerName(): string {
    return this.currentUser?.full_name?.trim() || 'Hapinayan Perera';
  }

  get travelerEmail(): string {
    return this.currentUser?.email?.trim() || 'traveler@ceylongo.com';
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

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
    if (this.isMobileMenuOpen()) {
      this.isProfileMenuOpen.set(false);
      this.isNotificationsOpen.set(false);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isNotificationsOpen.set(false);
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
    this.isNotificationsOpen.update((open) => !open);
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
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Esc') {
      this.isProfileMenuOpen.set(false);
      this.isNotificationsOpen.set(false);
      this.isMobileMenuOpen.set(false);
    }
  }

  navigateToBecomeAHost(): void {
    this.closeMobileMenu();
    this.router.navigate(['/provider/register']);
  }

  onNavClick(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.activeSection.set(sectionId);
    this.closeMobileMenu();

    if (sectionId === 'home') {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (sectionId === 'contact') {
      this.showToast('Contact Us: support@ceylongo.com | +94 11 234 5678');
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
        this.showToast('My Profile: ' + this.travelerName + ' (' + this.travelerEmail + ')');
        break;
      case 'bookings':
        this.showToast('My Bookings: You currently have no active bookings.');
        break;
      case 'wishlist':
        this.showToast('Wishlist: Your saved stays and experiences.');
        break;
      case 'settings':
        this.showToast('Settings: Account preferences and notifications.');
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
    this.authService.logout();
    this.router.navigate(['/']);
  }

  private showToast(msg: string): void {
    this.infoToast.set(msg);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.infoToast.set(null);
      }, 3500);
    }
  }
}
