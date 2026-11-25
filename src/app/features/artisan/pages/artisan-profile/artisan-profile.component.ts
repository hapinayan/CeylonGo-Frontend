import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ArtisanListingResponse,
  ArtisanListingSummary,
  ArtisanReviewPaginationResponse,
  ArtisanReviewSummaryResponse,
  ShowcaseItemSummary,
} from '../../models/artisan.models';
import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { FavoriteService } from '../../services/favorite.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import {
  VERIFIED_ARTISAN_PROFILES,
  VERIFIED_ARTISAN_PROFILE,
  VERIFIED_ARTISAN_SUMMARIES,
  VERIFIED_SHOWCASE_PRODUCTS,
  getVerifiedReviewsForListing,
  getVerifiedReviewSummaryForListing,
} from '../../fixtures/artisan-test-fixtures';
import { RatingStarsComponent } from '../../../../shared/components/rating-stars/rating-stars.component';
import { VerifiedBadgeComponent } from '../../../../shared/components/verified-badge/verified-badge.component';
import { ArtisanCardComponent } from '../../../../shared/components/artisan-card/artisan-card.component';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';

@Component({
  selector: 'app-artisan-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RatingStarsComponent,
    VerifiedBadgeComponent,
    ArtisanCardComponent,
    LkrCurrencyPipe,
  ],
  templateUrl: './artisan-profile.component.html',
  styleUrl: './artisan-profile.component.scss',
})
export class ArtisanProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly artisanService = inject(ArtisanService);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly navService = inject(ArtisanNavigationService);

  readonly listingId = signal<number>(1);
  readonly listing = signal<ArtisanListingResponse | null>(null);
  readonly products = signal<ShowcaseItemSummary[]>([]);
  readonly reviews = signal<ArtisanReviewPaginationResponse | null>(null);
  readonly reviewSummary = signal<ArtisanReviewSummaryResponse | null>(null);
  readonly relatedArtisans = signal<ArtisanListingSummary[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly isFixtureMode = signal<boolean>(false);
  readonly activeTab = signal<'overview' | 'products' | 'reviews' | 'location'>('overview');

  // FOLLOW STATE (PERSISTENT SET OF FOLLOWED BUSINESS IDs)
  readonly followedBusinesses = signal<Set<number>>(new Set<number>());
  readonly isFollowLoading = signal<boolean>(false);

  readonly isFollowing = computed(() => {
    return this.followedBusinesses().has(this.listingId());
  });

  readonly followToastMessage = signal<string | null>(null);
  readonly shareToastMessage = signal<string | null>(null);

  readonly isSaved = computed(() => {
    return this.favoriteService.isBusinessSaved(this.listingId());
  });

  readonly queryParams = computed(() => {
    const isDemo =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';
    return isDemo ? { demo: 'true' } : {};
  });

  // AUTHORITATIVE RATING & REVIEW STATS
  readonly totalReviewCount = computed(() => {
    const summary = this.reviewSummary();
    if (summary && summary.total_reviews !== undefined && summary.total_reviews !== null) {
      return summary.total_reviews;
    }
    const reviews = this.reviews();
    if (reviews && reviews.total !== undefined && reviews.total !== null) {
      return reviews.total;
    }
    return this.listing()?.total_reviews ?? 0;
  });

  readonly averageRating = computed(() => {
    if (this.totalReviewCount() === 0) {
      return 0;
    }
    const summary = this.reviewSummary();
    if (summary && summary.average_rating !== undefined && summary.average_rating !== null) {
      return summary.average_rating;
    }
    const reviews = this.reviews();
    if (reviews && reviews.average_rating !== undefined && reviews.average_rating !== null) {
      return reviews.average_rating;
    }
    return this.listing()?.average_rating ?? 0;
  });

  readonly ratingDistribution = computed(() => {
    const total = this.totalReviewCount();
    if (total === 0) {
      return [
        { stars: 5, count: 0, pct: 0 },
        { stars: 4, count: 0, pct: 0 },
        { stars: 3, count: 0, pct: 0 },
        { stars: 2, count: 0, pct: 0 },
        { stars: 1, count: 0, pct: 0 },
      ];
    }

    const summary = this.reviewSummary();
    const breakdown = summary?.rating_breakdown;

    let five = breakdown ? Number(breakdown['5'] ?? 0) : 0;
    let four = breakdown ? Number(breakdown['4'] ?? 0) : 0;
    let three = breakdown ? Number(breakdown['3'] ?? 0) : 0;
    let two = breakdown ? Number(breakdown['2'] ?? 0) : 0;
    let one = breakdown ? Number(breakdown['1'] ?? 0) : 0;

    // If breakdown was not populated from summary but reviews items exist, calculate from items
    if (
      five === 0 &&
      four === 0 &&
      three === 0 &&
      two === 0 &&
      one === 0 &&
      (this.reviews()?.items?.length ?? 0) > 0
    ) {
      const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      for (const r of this.reviews()?.items || []) {
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        counts[star] = (counts[star] || 0) + 1;
      }
      five = counts[5];
      four = counts[4];
      three = counts[3];
      two = counts[2];
      one = counts[1];
    }

    const calcPct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return [
      { stars: 5, count: five, pct: calcPct(five) },
      { stars: 4, count: four, pct: calcPct(four) },
      { stars: 3, count: three, pct: calcPct(three) },
      { stars: 2, count: two, pct: calcPct(two) },
      { stars: 1, count: one, pct: calcPct(one) },
    ];
  });

  // RESPONSIVE COVER IMAGE
  readonly displayCoverImage = computed(() => {
    const l = this.listing();
    if (l?.cover_image_url) return l.cover_image_url;
    const cat = l?.craft_category?.toLowerCase() || '';
    if (cat.includes('pottery') || cat.includes('ceramic')) return '/images/artisan/ruhunu_pottery_cover.jpg';
    if (cat.includes('batik') || cat.includes('textile')) return '/images/artisan/lanka_batik_cover.jpg';
    if (cat.includes('garden') || cat.includes('herbal')) return '/images/artisan/matale_garden_cover.jpg';
    if (cat.includes('spice') || cat.includes('local')) return '/images/artisan/ceylon_spices_cover.jpg';
    if (cat.includes('weaving') || cat.includes('handmade') || cat.includes('handloom')) return '/images/artisan/dumbara_cover.jpg';
    if (cat.includes('jewel') || cat.includes('gem')) return '/images/artisan/gem_filigree_cover.jpg';
    if (cat.includes('brass') || cat.includes('metal')) return '/images/artisan/pilimathalawa_cover.jpg';
    if (cat.includes('wood') || cat.includes('mask')) return '/images/artisan/ambalangoda_cover.jpg';
    return '/images/artisan/kandy_cover.jpg';
  });

  // BUSINESS SPECIFIC AVATAR
  readonly displayAvatar = computed(() => {
    const l = this.listing();
    if (l?.business_images && l.business_images.length > 0) return l.business_images[0].image_url;
    if (l?.images && l.images.length > 0) return l.images[0].image_url;
    const cat = l?.craft_category?.toLowerCase() || '';
    if (cat.includes('pottery') || cat.includes('ceramic')) return '/images/artisan/avatar_pottery.jpg';
    if (cat.includes('batik') || cat.includes('textile')) return '/images/artisan/avatar_batik.jpg';
    if (cat.includes('garden') || cat.includes('herbal')) return '/images/artisan/avatar_garden.jpg';
    if (cat.includes('spice') || cat.includes('local')) return '/images/artisan/avatar_spices.jpg';
    if (cat.includes('weaving') || cat.includes('handmade') || cat.includes('handloom')) return '/images/artisan/avatar_weaving.jpg';
    if (cat.includes('jewel') || cat.includes('gem')) return '/images/artisan/avatar_gem.jpg';
    if (cat.includes('brass') || cat.includes('metal')) return '/images/artisan/avatar_brass.jpg';
    if (cat.includes('wood') || cat.includes('mask')) return '/images/artisan/avatar_woodcarver.jpg';
    return '/images/artisan/avatar_kandy.jpg';
  });

  ngOnInit(): void {
    // Restore followed state from localStorage if available
    this.restoreFollowState();

    this.route.queryParamMap.subscribe((queryParams) => {
      const tab = queryParams.get('tab');
      if (tab === 'overview' || tab === 'products' || tab === 'reviews' || tab === 'location') {
        this.activeTab.set(tab);
      }
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.listingId.set(id);
        this.navService.setLastArtisanId(id);
        this.loadProfileData(id);
      } else {
        this.navService.setLastArtisanId(1);
        this.loadProfileData(1);
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  private restoreFollowState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('ceylongo_followed_artisans');
        if (stored) {
          const ids: number[] = JSON.parse(stored);
          this.followedBusinesses.set(new Set(ids));
        }
      } catch {
        // Safe fallback
      }
    }
  }

  loadProfileData(id: number): void {
    this.listingId.set(id);
    // Reset stale review, product, and listing data immediately when navigating between different artisan profiles
    this.listing.set(null);
    this.products.set([]);
    this.reviews.set(null);
    this.reviewSummary.set(null);

    const isDemoRequested =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';

    if (isDemoRequested) {
      this.loadVerifiedFixtures();
      this.loadRelatedArtisans();
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    this.artisanService.getListingById(id).subscribe({
      next: (data) => {
        if (data && data.title) {
          this.listing.set(data);
          this.isFixtureMode.set(false);
          this.isLoading.set(false);
          this.loadRelatedArtisans();
        } else {
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });

    // Load showcase items
    this.productService.getProductsByListing(id).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.products.set(res.items);
        }
      },
      error: () => {},
    });

    // Load reviews and summary
    this.reviewService.getListingReviews(id).subscribe({
      next: (res) => this.reviews.set(res),
      error: () => {},
    });

    this.reviewService.getListingReviewSummary(id).subscribe({
      next: (sum: ArtisanReviewSummaryResponse) => this.reviewSummary.set(sum),
      error: () => {},
    });
  }

  private loadRelatedArtisans(): void {
    const curId = this.listingId();
    const curCategory = this.listing()?.craft_category?.toLowerCase() || '';
    const curDistrict = this.listing()?.district?.toLowerCase() || '';

    // Filter out current artisan
    const all = VERIFIED_ARTISAN_SUMMARIES.filter((item: ArtisanListingSummary) => item.id !== curId);

    // Prioritize 1: same category, 2: same district, 3: general
    const sorted = [...all].sort((a, b) => {
      const aCat = a.craft_category.toLowerCase() === curCategory ? 2 : 0;
      const bCat = b.craft_category.toLowerCase() === curCategory ? 2 : 0;
      const aDist = a.district.toLowerCase() === curDistrict ? 1 : 0;
      const bDist = b.district.toLowerCase() === curDistrict ? 1 : 0;

      return (bCat + bDist) - (aCat + aDist);
    });

    this.relatedArtisans.set(sorted.slice(0, 4));
  }

  isProductSaved(productId: number): boolean {
    return this.favoriteService.isProductFavorite(productId);
  }

  toggleProductFavorite(event: MouseEvent, productId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteService.toggleProductFavorite(productId).subscribe({
      error: () => {},
    });
  }

  formatLocation(city: string | null | undefined, district: string | null | undefined): string {
    const raw = (city || district || '').trim();
    if (!raw) return 'Sri Lanka';
    const cleaned = raw.replace(/,?\s*Sri Lanka/gi, '').trim();
    return cleaned ? `${cleaned}, Sri Lanka` : 'Sri Lanka';
  }

  setTab(tab: 'overview' | 'products' | 'reviews' | 'location'): void {
    this.activeTab.set(tab);
    const query: Record<string, string> = { tab };
    if (this.queryParams().demo) {
      query['demo'] = 'true';
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleWishlist(): void {
    const id = this.listingId();
    if (!id) return;
    this.favoriteService.toggleBusinessWishlist(id).subscribe({
      error: () => {},
    });
  }

  onFollowToggle(): void {
    const id = this.listingId();
    if (!id || this.isFollowLoading()) return;

    this.isFollowLoading.set(true);
    const current = new Set(this.followedBusinesses());
    const isNowFollowing = !current.has(id);

    if (isNowFollowing) {
      current.add(id);
    } else {
      current.delete(id);
    }

    this.followedBusinesses.set(current);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('ceylongo_followed_artisans', JSON.stringify(Array.from(current)));
      } catch {
        // Safe fallback
      }
    }

    const currentTitle = this.listing()?.title || 'Artisan';
    const msg = isNowFollowing
      ? `You are now following ${currentTitle}`
      : `Unfollowed ${currentTitle}`;
    this.followToastMessage.set(msg);

    setTimeout(() => {
      this.isFollowLoading.set(false);
      this.followToastMessage.set(null);
    }, 2500);
  }

  onShareClick(): void {
    const url = window.location.href;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.shareToastMessage.set('Profile link copied to clipboard!');
        setTimeout(() => {
          this.shareToastMessage.set(null);
        }, 2500);
      });
    } else {
      this.shareToastMessage.set('Profile link ready to share');
      setTimeout(() => {
        this.shareToastMessage.set(null);
      }, 2500);
    }
  }

  getProductImage(prod: ShowcaseItemSummary): string {
    if (prod.image_url) return prod.image_url;
    const title = prod.title?.toLowerCase() || '';
    if (title.includes('mask')) return '/images/artisan/product_mask_main.jpg';
    if (title.includes('pot') || title.includes('clay')) return '/images/artisan/product_clay_pot.jpg';
    if (title.includes('batik')) return '/images/artisan/product_batik_art.jpg';
    if (title.includes('spice') || title.includes('cinnamon')) return '/images/artisan/product_cinnamon_pack.jpg';
    if (title.includes('runner') || title.includes('handloom')) return '/images/artisan/product_dumbara_runner.jpg';
    if (title.includes('ring') || title.includes('gem')) return '/images/artisan/product_sapphire_ring.jpg';
    if (title.includes('lamp') || title.includes('brass')) return '/images/artisan/product_brass_lamp.jpg';
    return '/images/artisan/product_mask_main.jpg';
  }

  onProductImageError(event: Event, prod: ShowcaseItemSummary): void {
    const img = event.target as HTMLImageElement;
    img.src = '/images/artisan/product_mask_main.jpg';
  }

  onCoverError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/images/artisan/kandy_cover.jpg';
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/images/artisan/avatar_kandy.jpg';
  }

  goBack(): void {
    const isDemo =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';

    this.navService.navigateBackFromProfile(isDemo);
  }

  private loadVerifiedFixtures(): void {
    const id = this.listingId();
    const profile = VERIFIED_ARTISAN_PROFILES[id] || VERIFIED_ARTISAN_PROFILE;
    this.listing.set(profile);
    this.isFixtureMode.set(true);
    this.isLoading.set(false);

    const matchingProducts = VERIFIED_SHOWCASE_PRODUCTS.filter((p) => p.artisan_listing_id === id);
    const displayProducts = matchingProducts.length > 0
      ? matchingProducts
      : VERIFIED_SHOWCASE_PRODUCTS.filter((p) => p.artisan_listing_id === 1);

    this.products.set(
      displayProducts.map((p) => ({
        id: p.id,
        artisan_listing_id: p.artisan_listing_id,
        title: p.title,
        item_type: p.item_type,
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        is_available: p.is_available,
        is_featured: p.is_featured,
        is_active: p.is_active,
        stock_quantity: p.stock_quantity,
        sku: p.sku,
        is_custom_order_available: p.is_custom_order_available,
        approval_status: p.approval_status,
      }))
    );

    // Authoritative artisan-specific reviews and summary
    const demoReviews = getVerifiedReviewsForListing(id);
    const summary = getVerifiedReviewSummaryForListing(id);

    this.reviews.set({
      items: demoReviews,
      total: demoReviews.length,
      page: 1,
      page_size: 10,
      total_pages: demoReviews.length > 0 ? 1 : 0,
      average_rating: summary.average_rating,
      total_reviews: summary.total_reviews,
    });

    this.reviewSummary.set(summary);
  }
}
