import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ArtisanListingSummary } from '../../../features/artisan/models/artisan.models';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

@Component({
  selector: 'app-artisan-card',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingStarsComponent, VerifiedBadgeComponent],
  templateUrl: './artisan-card.component.html',
  styleUrl: './artisan-card.component.scss',
})
export class ArtisanCardComponent {
  private readonly favoriteService = inject(FavoriteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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
    if (this.listing.cover_image_url) {
      return this.listing.cover_image_url;
    }
    const cat = this.listing.craft_category?.toLowerCase() || '';
    if (cat.includes('pottery') || cat.includes('ceramic')) return '/images/artisan/ruhunu_pottery.jpg';
    if (cat.includes('batik') || cat.includes('textile')) return '/images/artisan/lanka_batik.jpg';
    if (cat.includes('spice') || cat.includes('herbal')) return '/images/artisan/ceylon_spices.jpg';
    if (cat.includes('weaving') || cat.includes('handmade') || cat.includes('handloom')) return '/images/artisan/dumbara_weaving.jpg';
    if (cat.includes('jewel') || cat.includes('gem')) return '/images/artisan/gem_filigree.jpg';
    if (cat.includes('brass') || cat.includes('metal')) return '/images/artisan/pilimathalawa_brass.jpg';
    if (cat.includes('wood') || cat.includes('mask')) return '/images/artisan/woodcarving_masks.jpg';
    return '/images/artisan/kandy_masks.jpg';
  });

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      const cat = this.listing.craft_category?.toLowerCase() || '';
      if (cat.includes('pottery') || cat.includes('ceramic')) target.src = '/images/artisan/ruhunu_pottery.jpg';
      else if (cat.includes('batik') || cat.includes('textile')) target.src = '/images/artisan/lanka_batik.jpg';
      else if (cat.includes('spice') || cat.includes('herbal')) target.src = '/images/artisan/ceylon_spices.jpg';
      else if (cat.includes('weaving') || cat.includes('handmade') || cat.includes('handloom')) target.src = '/images/artisan/dumbara_weaving.jpg';
      else if (cat.includes('jewel') || cat.includes('gem')) target.src = '/images/artisan/gem_filigree.jpg';
      else if (cat.includes('brass') || cat.includes('metal')) target.src = '/images/artisan/pilimathalawa_brass.jpg';
      else if (cat.includes('wood') || cat.includes('mask')) target.src = '/images/artisan/woodcarving_masks.jpg';
      else target.src = '/images/artisan/kandy_masks.jpg';
    }
  }

  toggleWishlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true';
    const toggle$ = isDemo
      ? this.favoriteService.toggleBusinessWishlist(this.listing.id, true)
      : this.favoriteService.toggleBusinessWishlist(this.listing.id);

    toggle$.subscribe({
      next: (res) => {
        this.wishlistToggled.emit({ listingId: this.listing.id, isSaved: res.isSaved });
      },
      error: (err) => {
        if (err?.message === 'AUTHENTICATION_REQUIRED') {
          this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url },
          });
        }
      },
    });
  }
}
