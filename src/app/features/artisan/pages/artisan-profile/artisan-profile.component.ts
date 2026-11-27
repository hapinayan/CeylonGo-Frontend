import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import {
  ArtisanBusinessHours,
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
import { AuthService } from '../../../../core/services/auth.service';
import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { VerifiedBadgeComponent } from '../../../../shared/components/verified-badge/verified-badge.component';
import { ArtisanCardComponent, NEUTRAL_ARTISAN_PLACEHOLDER } from '../../../../shared/components/artisan-card/artisan-card.component';
import { ServiceWeatherCardComponent } from '../../../../shared/components/service-weather-card/service-weather-card';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';

@Component({
  selector: 'app-artisan-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    VerifiedBadgeComponent,
    ArtisanCardComponent,
    ServiceWeatherCardComponent,
    LkrCurrencyPipe,
  ],
  templateUrl: './artisan-profile.component.html',
  styleUrl: './artisan-profile.component.scss',
})
export class ArtisanProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly artisanService = inject(ArtisanService);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly navService = inject(ArtisanNavigationService);

  private mapContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('artisanMapContainer')
  set artisanMapContainer(ref: ElementRef<HTMLDivElement> | undefined) {
    this.mapContainerRef = ref;
    if (ref && !this.isLoading() && !this.hasError()) {
      setTimeout(() => this.initMap(), 50);
    }
  }

  private map?: L.Map;

  readonly listingId = signal<number>(0);
  readonly listing = signal<ArtisanListingResponse | null>(null);
  readonly businessHours = signal<ArtisanBusinessHours[]>([]);
  readonly products = signal<ShowcaseItemSummary[]>([]);
  readonly reviews = signal<ArtisanReviewPaginationResponse | null>(null);
  readonly reviewSummary = signal<ArtisanReviewSummaryResponse | null>(null);
  readonly relatedArtisans = signal<ArtisanListingSummary[]>([]);

  readonly socialEntries = computed(() => {
    const links = this.listing()?.social_links;
    if (!links) return [] as { label: string; url: string }[];
    return Object.entries(links)
      .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
      .map(([key, url]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        url,
      }));
  });

  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly isPhotoModalOpen = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  readonly isSaved = computed(() => this.favoriteService.isBusinessSaved(this.listingId()));

  readonly totalReviewCount = computed(() => {
    const summary = this.reviewSummary();
    if (summary?.total_reviews != null) return summary.total_reviews;
    const rev = this.reviews();
    if (rev?.total != null) return rev.total;
    return this.listing()?.total_reviews ?? 0;
  });

  readonly averageRating = computed(() => {
    if (this.totalReviewCount() === 0) return null;
    const summary = this.reviewSummary();
    if (summary?.average_rating != null) return summary.average_rating;
    return this.listing()?.average_rating ?? null;
  });

  readonly galleryPhotos = computed<string[]>(() => {
    const l = this.listing();
    if (!l) return [];
    const urls: string[] = [];
    if (l.cover_image_url) urls.push(l.cover_image_url);
    for (const img of [...(l.business_images ?? []), ...(l.images ?? [])]) {
      if (img.image_url && !urls.includes(img.image_url)) {
        urls.push(img.image_url);
      }
    }
    return urls;
  });

  readonly mainPhoto = computed(() => this.galleryPhotos()[0] || NEUTRAL_ARTISAN_PLACEHOLDER);
  readonly secondaryPhotos = computed(() => this.galleryPhotos().slice(1, 3));

  readonly hasValidCoordinates = computed(() => {
    const l = this.listing();
    return l?.latitude != null && l?.longitude != null && Number.isFinite(l.latitude) && Number.isFinite(l.longitude);
  });

  readonly googleMapsUrl = computed(() => {
    const l = this.listing();
    if (!l) return '';
    if (this.hasValidCoordinates()) {
      return `https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`;
    }
    const q = encodeURIComponent([l.title, l.city, l.district, 'Sri Lanka'].filter(Boolean).join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  });

  readonly hasContactMethods = computed(() => {
    const l = this.listing();
    return !!(
      l?.phone ||
      l?.whatsapp_number ||
      l?.whatsapp_link ||
      l?.email ||
      l?.website_url ||
      this.socialEntries().length > 0
    );
  });

  readonly dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id > 0) {
        this.navService.setLastArtisanId(id);
        this.loadProfileData(id);
      } else {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.hasValidCoordinates() && this.mapContainerRef) {
      this.initMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  loadProfileData(id: number): void {
    this.listingId.set(id);
    this.listing.set(null);
    this.businessHours.set([]);
    this.products.set([]);
    this.reviews.set(null);
    this.reviewSummary.set(null);
    this.isLoading.set(true);
    this.hasError.set(false);

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    if (this.authService.isAuthenticated()) {
      this.favoriteService.checkBusinessWishlist?.(id)?.subscribe();
    }

    this.artisanService.getListingById(id).subscribe({
      next: (data) => {
        if (data && data.title) {
          this.listing.set(data);
          this.businessHours.set(Array.isArray(data.business_hours) ? data.business_hours : []);
          this.isLoading.set(false);
          this.loadRelatedArtisans(id, data.craft_category, data.district);
          this.artisanService.getBusinessHours?.(id)?.subscribe((hours) => {
            if (Array.isArray(hours) && hours.length > 0) {
              this.businessHours.set(hours);
            }
          });
          this.productService
            .getProductsByListing(id, 1, 20)
            .subscribe((res) => {
              this.products.set(res?.items ?? []);
            });
          if (this.hasValidCoordinates()) {
            setTimeout(() => this.initMap(), 50);
          }
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

    this.reviewService.getListingReviews(id).subscribe({
      next: (res) => this.reviews.set(res),
      error: () => {},
    });

    this.reviewService.getListingReviewSummary(id).subscribe({
      next: (sum) => this.reviewSummary.set(sum),
      error: () => {},
    });
  }

  private loadRelatedArtisans(currentId: number, category: string, district: string): void {
    this.artisanService.getListings({ page: 1, page_size: 20 }).subscribe({
      next: (res) => {
        const candidates = (res?.items ?? []).filter((item) => item.id !== currentId);
        const sorted = [...candidates].sort((a, b) => {
          const aScore = (a.craft_category === category ? 2 : 0) + (a.district === district ? 1 : 0);
          const bScore = (b.craft_category === category ? 2 : 0) + (b.district === district ? 1 : 0);
          return bScore - aScore;
        });
        this.relatedArtisans.set(sorted.slice(0, 4));
      },
      error: () => this.relatedArtisans.set([]),
    });
  }

  private initMap(): void {
    const l = this.listing();
    if (!l || !this.hasValidCoordinates() || !this.mapContainerRef) return;
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    const lat = Number(l.latitude);
    const lng = Number(l.longitude);

    try {
      this.map = L.map(this.mapContainerRef.nativeElement, {
        center: [lat, lng],
        zoom: 13,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      L.circleMarker([lat, lng], {
        radius: 8,
        color: '#082B5C',
        fillColor: '#0066FF',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(`<strong>${l.title}</strong><br>${this.formatLocation(l.city, l.district)}`)
        .addTo(this.map);

      setTimeout(() => this.map?.invalidateSize(), 150);
    } catch {
      // Safe no-op in headless/unit test environments without layout boxes
    }
  }

  toggleWishlist(): void {
    const id = this.listingId();
    if (!id) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'wishlist',
      });
      return;
    }

    this.favoriteService.toggleBusinessWishlist(id).subscribe({
      next: (res) => {
        this.showToast(res.isSaved ? 'Saved artisan to wishlist.' : 'Removed from wishlist.');
      },
      error: () => {
        this.showToast('Could not update wishlist. Please try again.');
      },
    });
  }

  onShareClick(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (url && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Profile link copied to clipboard.');
      });
    } else {
      this.showToast('Profile link ready to share.');
    }
  }

  openPhotoModal(): void {
    this.isPhotoModalOpen.set(true);
  }

  closePhotoModal(): void {
    this.isPhotoModalOpen.set(false);
  }

  goBack(): void {
    this.navService.navigateBackFromProfile(false);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== NEUTRAL_ARTISAN_PLACEHOLDER) {
      target.src = NEUTRAL_ARTISAN_PLACEHOLDER;
    }
  }

  formatLocation(city: string | null | undefined, district: string | null | undefined): string {
    const cleanCity = (city || '').trim();
    const cleanDistrict = (district || '').trim();
    if (cleanCity && cleanDistrict && cleanCity.toLowerCase() !== cleanDistrict.toLowerCase()) {
      return `${cleanCity}, ${cleanDistrict}`;
    }
    return cleanCity || cleanDistrict || 'Sri Lanka';
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}
