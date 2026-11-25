import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ArtisanFavoriteResponse,
  ArtisanListingSummary,
  ArtisanWishlistItemResponse,
} from '../../models/artisan.models';
import { FavoriteService } from '../../services/favorite.service';
import {
  VERIFIED_ARTISAN_PROFILE,
  VERIFIED_ARTISAN_SUMMARIES,
  VERIFIED_SHOWCASE_PRODUCTS,
} from '../../fixtures/artisan-test-fixtures';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import { VerifiedBadgeComponent } from '../../../../shared/components/verified-badge/verified-badge.component';

@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink, LkrCurrencyPipe, VerifiedBadgeComponent],
  templateUrl: './my-favorites.component.html',
  styleUrl: './my-favorites.component.scss',
})
export class MyFavoritesComponent implements OnInit {
  private readonly favoriteService = inject(FavoriteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<'products' | 'businesses'>('products');
  readonly savedProducts = signal<ArtisanFavoriteResponse[]>([]);
  readonly savedBusinesses = signal<ArtisanWishlistItemResponse[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly isFixtureMode = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);
  readonly statusMessage = signal<string | null>(null);

  readonly totalFavoritesCount = computed(() => {
    return this.savedProducts().length + this.savedBusinesses().length;
  });

  ngOnInit(): void {
    this.loadAllFavorites();
  }

  loadAllFavorites(): void {
    const isDemoRequested =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';

    if (isDemoRequested) {
      this.loadVerifiedFixtures();
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    this.favoriteService.getProductFavorites(1, 100).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.savedProducts.set(res.items);
          this.isFixtureMode.set(false);
        } else {
          this.savedProducts.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Strict Fixture Isolation: Never silently show sample favorites on real API failures
        this.hasError.set(true);
        this.savedProducts.set([]);
        this.isLoading.set(false);
      },
    });

    this.favoriteService.getBusinessWishlist(1, 100).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.savedBusinesses.set(res.items);
        }
      },
      error: () => {},
    });
  }

  private loadVerifiedFixtures(): void {
    const favProductIds = this.favoriteService.productFavoriteIds();
    const effectiveProductIds = favProductIds.size > 0 ? Array.from(favProductIds) : [1, 2, 3];

    const fixtures: ArtisanFavoriteResponse[] = effectiveProductIds.map((pid, idx) => {
      const match =
        VERIFIED_SHOWCASE_PRODUCTS.find((p) => p.id === pid) ||
        VERIFIED_SHOWCASE_PRODUCTS[idx % VERIFIED_SHOWCASE_PRODUCTS.length];
      return {
        product_id: match.id,
        created_at: '2026-02-14T10:00:00Z',
        product: {
          id: match.id,
          artisan_listing_id: match.artisan_listing_id,
          title: match.title,
          item_type: match.item_type,
          price: match.price,
          currency: match.currency,
          image_url: match.image_url,
          is_available: match.is_available,
          is_featured: match.is_featured,
          is_active: match.is_active,
          stock_quantity: match.stock_quantity,
          sku: match.sku,
          is_custom_order_available: match.is_custom_order_available,
          approval_status: match.approval_status,
        },
      };
    });

    this.savedProducts.set(fixtures);

    const wishlistIds = this.favoriteService.businessWishlistIds();
    const effectiveWishlistIds = wishlistIds.size > 0 ? Array.from(wishlistIds) : [1];
    const demoBusinesses: ArtisanWishlistItemResponse[] = VERIFIED_ARTISAN_SUMMARIES
      .filter((s: ArtisanListingSummary) => effectiveWishlistIds.includes(s.id))
      .map((s: ArtisanListingSummary) => ({
        id: s.id,
        user_id: 1,
        listing_reference_id: s.id,
        artisan_listing_id: s.id,
        notes: null,
        created_at: '2026-02-14T10:00:00Z',
        is_available: true,
        listing: {
          id: s.id,
          provider_profile_id: s.provider_profile_id,
          title: s.title,
          craft_category: s.craft_category,
          district: s.district,
          city: s.city,
          cover_image_url: s.cover_image_url,
          is_active: s.is_active,
          approval_status: s.approval_status,
          average_rating: s.average_rating,
          total_reviews: s.total_reviews,
        },
      }));
    this.savedBusinesses.set(demoBusinesses);
    this.isFixtureMode.set(true);
  }

  switchTab(tab: 'products' | 'businesses'): void {
    this.activeTab.set(tab);
  }

  removeProductFavorite(event: MouseEvent, productId: number): void {
    event.preventDefault();
    event.stopPropagation();

    const remove$ = this.isFixtureMode()
      ? this.favoriteService.toggleProductFavorite(productId, true)
      : this.favoriteService.toggleProductFavorite(productId);

    remove$.subscribe({
      next: () => {
        this.savedProducts.set(
          this.savedProducts().filter((p) => p.product_id !== productId)
        );
        this.showToast('Product removed from favorites');
      },
      error: () => {
        this.showToast('Failed to remove product.');
      },
    });
  }

  removeBusinessWishlist(event: MouseEvent, listingId: number): void {
    event.preventDefault();
    event.stopPropagation();

    const remove$ = this.isFixtureMode()
      ? this.favoriteService.toggleBusinessWishlist(listingId, true)
      : this.favoriteService.toggleBusinessWishlist(listingId);

    remove$.subscribe({
      next: () => {
        this.savedBusinesses.set(
          this.savedBusinesses().filter((b) => b.artisan_listing_id !== listingId)
        );
        this.showToast('Artisan business removed from favorites');
      },
      error: () => {
        this.showToast('Failed to remove artisan business.');
      },
    });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode();
      const queryParams = isDemo ? { demo: 'true' } : {};
      this.router.navigate(['/artisans/discover'], { queryParams });
    }
  }

  private showToast(msg: string): void {
    this.statusMessage.set(msg);
    setTimeout(() => this.statusMessage.set(null), 3000);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/images/artisan/product_mask_main.jpg';
  }
}
