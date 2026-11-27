import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ArtisanListingSummary } from '../../../features/artisan/models/artisan.models';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

export const NEUTRAL_ARTISAN_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22520%22%20viewBox%3D%220%200%20800%20520%22%3E%3Crect%20fill%3D%22%23EDF5FF%22%20width%3D%22800%22%20height%3D%22520%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%230066FF%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.45%22%3E%3Crect%20x%3D%22310%22%20y%3D%22170%22%20width%3D%22180%22%20height%3D%22140%22%20rx%3D%2214%22%2F%3E%3Ccircle%20cx%3D%22360%22%20cy%3D%22220%22%20r%3D%2214%22%2F%3E%3Cpath%20d%3D%22M470%20285l-50-50-75%2075%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22355%22%20fill%3D%22%23082B5C%22%20opacity%3D%220.65%22%20font-family%3D%22Inter%2Csans-serif%22%20font-size%3D%2218%22%20font-weight%3D%22600%22%20text-anchor%3D%22middle%22%3ECeylonGo%20Artisan%20Showcase%3C%2Ftext%3E%3C%2Fsvg%3E";

@Component({
  selector: 'app-artisan-card',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingStarsComponent, VerifiedBadgeComponent],
  templateUrl: './artisan-card.component.html',
  styleUrl: './artisan-card.component.scss',
})
export class ArtisanCardComponent {
  private readonly favoriteService = inject(FavoriteService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);

  @Input({ required: true }) listing!: ArtisanListingSummary;
  @Input() layout: 'grid' | 'list' = 'grid';
  @Output() wishlistToggled = new EventEmitter<{ listingId: number; isSaved: boolean }>();

  readonly queryParams = computed(() => {
    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true';
    return isDemo ? { demo: 'true' } : {};
  });

  readonly isSaved = computed(() => {
    return this.favoriteService.isBusinessSaved(this.listing.id);
  });

  readonly displayImage = computed(() => {
    return this.listing.cover_image_url || NEUTRAL_ARTISAN_PLACEHOLDER;
  });

  readonly shortDescription = computed(() => {
    const raw = (this.listing.description ?? '').trim();
    if (!raw) return '';
    return raw.split('\n')[0].trim();
  });

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== NEUTRAL_ARTISAN_PLACEHOLDER) {
      target.src = NEUTRAL_ARTISAN_PLACEHOLDER;
    }
  }

  toggleWishlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true';
    if (!isDemo && !this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'wishlist',
      });
      return;
    }

    const toggle$ = isDemo
      ? this.favoriteService.toggleBusinessWishlist(this.listing.id, true)
      : this.favoriteService.toggleBusinessWishlist(this.listing.id);

    toggle$.subscribe({
      next: (res) => {
        this.wishlistToggled.emit({ listingId: this.listing.id, isSaved: res.isSaved });
      },
      error: (err) => {
        if (err?.message === 'AUTHENTICATION_REQUIRED') {
          this.authModalService.open('login', undefined, {
            type: 'wishlist',
          });
        }
      },
    });
  }
}
