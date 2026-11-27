import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { User } from '../../../core/models/auth.models';
import { ExperienceIcon } from '../../../experiences/components/icon';
import { AccountProfileAvatarComponent } from '../../account/account-profile-avatar.component';

export type TravelerAccountSection = 'profile' | 'bookings' | 'wishlist' | 'notifications' | 'settings';

@Component({
  selector: 'app-traveler-account-sidebar',
  standalone: true,
  imports: [RouterLink, ExperienceIcon, AccountProfileAvatarComponent],
  templateUrl: './traveler-account-sidebar.html',
  styleUrl: './traveler-account-sidebar.scss',
})
export class TravelerAccountSidebar {
  readonly account = input<User | null>(null);
  readonly photoUrl = input<string | null>(null);
  readonly preview = input(false);
  readonly active = input.required<TravelerAccountSection>();
  readonly unreadNotifications = input(0);
  /** Deprecated compatibility input; sidebar now always renders the modern CeylonGo card layout. */
  readonly premium = input(false);
  readonly signedOut = output<void>();

  readonly mobileMenuOpen = signal(false);

  readonly displayName = computed(() => {
    if (this.preview()) return 'Traveler Account';
    return this.account()?.full_name?.trim() || 'Traveler';
  });

  readonly activeLabel = computed(() => {
    switch (this.active()) {
      case 'profile':
        return 'My Profile';
      case 'bookings':
        return 'My Bookings';
      case 'wishlist':
        return 'Wishlist';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Account Settings';
    }
  });

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.signedOut.emit();
  }
}
