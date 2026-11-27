import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ArtisanListingResponse,
  ShowcaseItemResponse,
} from '../../models/artisan.models';
import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import {
  VERIFIED_ARTISAN_PROFILES,
  VERIFIED_ARTISAN_PROFILE,
  VERIFIED_SHOWCASE_PRODUCTS,
} from '../../fixtures/artisan-test-fixtures';
import { VerifiedBadgeComponent } from '../../../../shared/components/verified-badge/verified-badge.component';

@Component({
  selector: 'app-contact-artisan',
  standalone: true,
  imports: [CommonModule, FormsModule, VerifiedBadgeComponent],
  templateUrl: './contact-artisan.component.html',
  styleUrl: './contact-artisan.component.scss',
})
export class ContactArtisanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly artisanService = inject(ArtisanService);
  private readonly productService = inject(ProductService);
  private readonly navService = inject(ArtisanNavigationService);

  readonly listingId = signal<number>(1);
  readonly listing = signal<ArtisanListingResponse | null>(null);
  readonly product = signal<ShowcaseItemResponse | null>(null);

  readonly messageText = signal<string>('');
  readonly inquiryQty = signal<number>(1);
  readonly productId = signal<number | null>(null);

  readonly isLoading = signal<boolean>(true);
  readonly isFixtureMode = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);
  readonly infoBanner = signal<string | null>(null);

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

  readonly sanitizedPhone = computed(() => {
    const raw = this.listing()?.phone;
    if (!raw) return '94812234567';
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (!cleaned) return '94812234567';
    if (cleaned.startsWith('0')) {
      return '94' + cleaned.substring(1);
    }
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }
    return cleaned;
  });

  readonly hasWhatsApp = computed(() => {
    return !!this.sanitizedPhone();
  });

  readonly hasPhone = computed(() => {
    return !!this.listing()?.phone;
  });

  readonly hasEmail = computed(() => {
    return !!this.listing()?.email;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const lid = Number(params.get('id')) || 1;
      this.listingId.set(lid);
      this.loadArtisanData(lid);
    });

    this.route.queryParams.subscribe((qp) => {
      const qVal = Number(qp['qty'] || qp['quantity']);
      if (qVal && qVal > 0) {
        this.inquiryQty.set(qVal);
      }
      if (qp['productId']) {
        const pid = Number(qp['productId']);
        this.productId.set(pid);
        this.loadProductData(pid);
      }
    });
  }

  loadArtisanData(id: number): void {
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

    this.artisanService.getListingById(id).subscribe({
      next: (artisan) => {
        if (artisan && artisan.title) {
          this.listing.set(artisan);
          this.isFixtureMode.set(false);
          this.isLoading.set(false);
        } else {
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      },
      error: () => {
        // Strict Fixture Isolation: Never silently display sample artisan data on API failure
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private loadVerifiedFixtures(): void {
    const id = this.listingId();
    const profile = VERIFIED_ARTISAN_PROFILES[id] || VERIFIED_ARTISAN_PROFILE;
    this.listing.set(profile);
    this.isFixtureMode.set(true);
    this.isLoading.set(false);
  }

  loadProductData(pid: number): void {
    const isDemoRequested =
      this.route.snapshot.queryParamMap.get('demo') === 'true' ||
      this.route.snapshot.queryParamMap.get('preview') === 'true';

    if (isDemoRequested) {
      const fixture =
        VERIFIED_SHOWCASE_PRODUCTS.find((p) => p.id === pid) ||
        VERIFIED_SHOWCASE_PRODUCTS[0];
      this.product.set(fixture);
      this.initializeInquiryMessage();
      return;
    }

    this.productService.getProductById(pid).subscribe({
      next: (prod) => {
        this.product.set(prod);
        this.initializeInquiryMessage();
      },
      error: () => {
        // Do not silently load mock fixture data on production API failure
      },
    });
  }

  private initializeInquiryMessage(): void {
    const prod = this.product();
    if (prod && !this.messageText()) {
      const qty = this.inquiryQty();
      this.messageText.set(
        `Hi, I am interested in inquiring about "${prod.title}" (Quantity: ${qty}). Is this currently available for viewing or in-store collection?`
      );
    }
  }

  onSendMessage(): void {
    const msg = this.messageText().trim();
    if (!msg) {
      this.validationError.set('Please write a message before sending.');
      return;
    }
    if (msg.length < 5) {
      this.validationError.set('Please write a message of at least 5 characters.');
      return;
    }

    this.validationError.set(null);

    // In accordance with backend architecture (no internal messaging queue),
    // redirect directly to the artisan's verified WhatsApp with the message text pre-filled
    this.openWhatsApp();
    this.infoBanner.set(
      'Connecting to artisan via WhatsApp. CeylonGo facilitates direct traveler-to-artisan communication.'
    );
  }

  openWhatsApp(): void {
    const phone = this.sanitizedPhone();
    const text = encodeURIComponent(this.messageText().trim());
    const url = `https://wa.me/${phone}?text=${text}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  makeCall(): void {
    const phone = this.listing()?.phone;
    if (phone && typeof window !== 'undefined') {
      window.location.href = `tel:${phone}`;
    }
  }

  callPhone(): void {
    this.makeCall();
  }

  goBack(): void {
    const isDemo = this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode();
    this.navService.navigateBackFromContact(this.listingId(), isDemo);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    const cat = this.listing()?.craft_category?.toLowerCase() || '';
    if (cat.includes('pottery') || cat.includes('ceramic')) target.src = '/images/artisan/avatar_pottery.jpg';
    else if (cat.includes('batik') || cat.includes('textile')) target.src = '/images/artisan/avatar_batik.jpg';
    else if (cat.includes('garden') || cat.includes('herbal')) target.src = '/images/artisan/avatar_garden.jpg';
    else if (cat.includes('spice') || cat.includes('local')) target.src = '/images/artisan/avatar_spices.jpg';
    else if (cat.includes('weaving') || cat.includes('handmade') || cat.includes('handloom')) target.src = '/images/artisan/avatar_weaving.jpg';
    else if (cat.includes('jewel') || cat.includes('gem')) target.src = '/images/artisan/avatar_gem.jpg';
    else if (cat.includes('brass') || cat.includes('metal')) target.src = '/images/artisan/avatar_brass.jpg';
    else if (cat.includes('wood') || cat.includes('mask')) target.src = '/images/artisan/avatar_woodcarver.jpg';
    else target.src = '/images/artisan/avatar_kandy.jpg';
  }
}
