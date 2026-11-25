import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';

@Component({
  selector: 'app-traveler-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './traveler-navbar.component.html',
  styleUrl: './traveler-navbar.component.scss',
})
export class TravelerNavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly favoriteCount = computed(() => {
    return this.favoriteService.productFavoriteIds().size + this.favoriteService.businessWishlistIds().size;
  });

  readonly queryParams = computed(() => {
    const isDemo =
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.router.url.includes('demo=true');
    return isDemo ? { demo: 'true' } : {};
  });

  readonly isMenuOpen = signal(false);
  readonly isProfileMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((v) => !v);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((v) => !v);
  }

  closeMenus(): void {
    this.isMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/artisans']);
  }
}
