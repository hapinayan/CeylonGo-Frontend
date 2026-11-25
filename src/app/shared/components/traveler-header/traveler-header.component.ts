import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TourGuideService } from '../../../core/services/tour-guide.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-traveler-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './traveler-header.component.html',
  styleUrl: './traveler-header.component.scss'
})
export class TravelerHeaderComponent {
  readonly guideService = inject(TourGuideService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly isNotificationsOpen = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  readonly favoritesCount = this.guideService.favoritesCount;
  readonly unreadNotifications = this.guideService.unreadNotificationsCount;
  readonly notifications = this.guideService.notifications;
  readonly currentUser = this.authService.currentUser;

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update(v => !v);
    this.isNotificationsOpen.set(false);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen.update(v => !v);
    this.isProfileMenuOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMenus(): void {
    this.isProfileMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenus();
  }

  markAllNotificationsRead(event: Event): void {
    event.stopPropagation();
    this.guideService.markAllNotificationsRead();
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/auth']);
  }
}
