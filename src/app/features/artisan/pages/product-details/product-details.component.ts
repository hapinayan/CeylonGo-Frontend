import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ArtisanListingResponse,
  ArtisanProductImage,
  ShowcaseItemResponse,
} from '../../models/artisan.models';
import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { FavoriteService } from '../../services/favorite.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import {
  VERIFIED_ARTISAN_PROFILES,
  VERIFIED_ARTISAN_PROFILE,
  VERIFIED_SHOWCASE_PRODUCTS,
} from '../../fixtures/artisan-test-fixtures';
import { RatingStarsComponent } from '../../../../shared/components/rating-stars/rating-stars.component';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RatingStarsComponent, LkrCurrencyPipe],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly artisanService = inject(ArtisanService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly navService = inject(ArtisanNavigationService);

  readonly listingId = signal<number>(1);
  readonly productId = signal<number>(1);
  readonly product = signal<ShowcaseItemResponse | null>(null);
  readonly listing = signal<ArtisanListingResponse | null>(null);
  readonly galleryImages = signal<string[]>([]);
  readonly activeImageIndex = signal<number>(0);

  readonly inquiryQuantity = signal<number>(1);
  readonly isLoading = signal<boolean>(true);
  readonly isFixtureMode = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);
  readonly shareToastMessage = signal<string | null>(null);

  readonly isFavorite = computed(() => {
    return this.favoriteService.isProductFavorite(this.productId());
  });

  readonly activeImage = computed(() => {
    const list = this.galleryImages();
    const idx = this.activeImageIndex();
    if (list.length > 0 && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return this.product()?.image_url || '/images/artisan/product_mask_main.jpg';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const pidParam = params.get('productId') || params.get('id');
      const lidParam = params.get('id');

      const pid = Number(pidParam) || 1;
      const lid = Number(lidParam) || 1;

      this.productId.set(pid);
      this.listingId.set(lid);
      this.loadProduct(pid, lid);
    });
  }

  loadProduct(productId: number, listingId: number): void {
    const isDemoRequested =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';

    if (isDemoRequested) {
      this.loadVerifiedFixtures();
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService.getProductById(productId).subscribe({
      next: (item) => {
        if (item && item.title) {
          this.product.set(item);
          this.isFixtureMode.set(false);

          const imgs: string[] = [];
          if (item.image_url) imgs.push(item.image_url);

          const additional = item.images || item.product_images || [];
          additional.forEach((img: ArtisanProductImage) => {
            if (img.image_url && !imgs.includes(img.image_url)) {
              imgs.push(img.image_url);
            }
          });

          if (imgs.length === 0) {
            imgs.push('/images/artisan/product_mask_main.jpg');
          }

          this.galleryImages.set(imgs);
          this.activeImageIndex.set(0);
          this.isLoading.set(false);
        } else {
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      },
      error: () => {
        // Strict Fixture Isolation: Never silently display sample product data on API failure
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });

    // Load artisan listing for contact information
    this.artisanService.getListingById(listingId).subscribe({
      next: (artisan) => this.listing.set(artisan),
      error: () => {},
    });
  }

  private loadVerifiedFixtures(): void {
    const pid = this.productId();
    const fixture =
      VERIFIED_SHOWCASE_PRODUCTS.find((p) => p.id === pid) ||
      VERIFIED_SHOWCASE_PRODUCTS[0];
    this.product.set(fixture);

    const lid = fixture.artisan_listing_id || this.listingId();
    const profile = VERIFIED_ARTISAN_PROFILES[lid] || VERIFIED_ARTISAN_PROFILE;
    this.listing.set(profile);
    this.isFixtureMode.set(true);

    const imgs: string[] = [];
    if (fixture.image_url) {
      imgs.push(fixture.image_url);
    }
    if (fixture.images && fixture.images.length > 0) {
      fixture.images.forEach((img) => {
        if (img.image_url && !imgs.includes(img.image_url)) {
          imgs.push(img.image_url);
        }
      });
    }
    if (imgs.length === 0) {
      imgs.push('/images/artisan/product_mask_main.jpg');
    }

    this.galleryImages.set(imgs);
    this.activeImageIndex.set(0);
    this.isLoading.set(false);
  }

  selectImage(idx: number): void {
    if (idx >= 0 && idx < this.galleryImages().length) {
      this.activeImageIndex.set(idx);
    }
  }

  nextImage(): void {
    const next = (this.activeImageIndex() + 1) % this.galleryImages().length;
    this.activeImageIndex.set(next);
  }

  prevImage(): void {
    const len = this.galleryImages().length;
    const prev = (this.activeImageIndex() - 1 + len) % len;
    this.activeImageIndex.set(prev);
  }

  incrementQty(): void {
    if (this.inquiryQuantity() < 99) {
      this.inquiryQuantity.update((q) => q + 1);
    }
  }

  incrementQuantity(): void {
    this.incrementQty();
  }

  decrementQty(): void {
    if (this.inquiryQuantity() > 1) {
      this.inquiryQuantity.update((q) => q - 1);
    }
  }

  decrementQuantity(): void {
    this.decrementQty();
  }

  toggleFavorite(): void {
    const id = this.productId();
    if (!id) return;
    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode();
    this.favoriteService.toggleProductFavorite(id, isDemo).subscribe({
      next: () => {},
      error: (err) => {
        if (err?.message === 'AUTHENTICATION_REQUIRED') {
          this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url },
          });
        }
      },
    });
  }

  onShareClick(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.shareToastMessage.set('Product link copied to clipboard!');
        setTimeout(() => this.shareToastMessage.set(null), 3000);
      });
    } else {
      this.shareToastMessage.set('Product link copied!');
      setTimeout(() => this.shareToastMessage.set(null), 3000);
    }
  }

  contactArtisan(): void {
    const lid = this.listingId();
    const pid = this.productId();
    const qty = this.inquiryQuantity();
    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode();

    const queryParams: Record<string, string | number> = {
      productId: pid,
      qty: qty,
    };
    if (isDemo) queryParams['demo'] = 'true';

    this.router.navigate(['/artisans', lid, 'contact'], {
      queryParams,
    });
  }

  goBack(): void {
    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode();
    this.navService.navigateBackFromProduct(this.listingId(), isDemo);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/images/artisan/product_mask_main.jpg';
  }
}
