import { Recommendations } from '../../../recommendations/recommendations';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  MvpGuideSlot,
  TourGuide,
  TourPackage,
} from '../../../core/models/tour-guide.models';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { TourGuideService } from '../../../core/services/tour-guide.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import { ServiceWeatherCardComponent } from '../../../shared/components/service-weather-card/service-weather-card';

@Component({
  selector: 'app-tour-guide-detail',
  standalone: true,
  imports: [
    Recommendations,
    CommonModule,
    FormsModule,
    RouterModule,
    LocationPickerComponent,
    ServiceWeatherCardComponent,
  ],
  templateUrl: './tour-guide-detail.component.html',
  styleUrl: './tour-guide-detail.component.scss',
})
export class TourGuideDetailComponent implements OnInit {
  readonly guideService = inject(TourGuideService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly guide = signal<TourGuide | null>(null);

  // Live Backend Availability Slots State
  readonly slots = signal<MvpGuideSlot[]>([]);
  readonly isLoadingSlots = signal<boolean>(false);
  readonly slotsError = signal<string | null>(null);
  readonly selectedSlotId = signal<number | null>(null);

  // Gallery Lightbox State
  readonly isGalleryViewerOpen = signal<boolean>(false);
  readonly activePhotoIndex = signal<number>(0);

  // Share Feedback State
  readonly shareStatus = signal<string | null>(null);
  readonly shareUrl = signal<string | null>(null);

  // Selected Package & Booking Card State
  readonly selectedPackageId = signal<string>('');
  readonly selectedDate = signal<string>('');
  readonly selectedTime = signal<string>('');
  readonly travelers = signal<number>(1);
  readonly durationDays = signal<number>(1);
  readonly validationError = signal<string | null>(null);

  readonly minDate = this.defaultFutureDate(0);

  readonly galleryImages = computed<string[]>(() => {
    const g = this.guide();
    if (!g) return [];
    const list = g.galleryImages?.length ? g.galleryImages : [g.coverImageUrl];
    return Array.from(new Set(list.filter(Boolean)));
  });

  readonly packages = computed<TourPackage[]>(() => this.guide()?.packages ?? []);

  readonly selectedPackage = computed<TourPackage | null>(() => {
    const list = this.packages();
    if (!list.length) return null;
    const id = this.selectedPackageId();
    return list.find((p) => p.id === id) ?? list[0];
  });

  readonly availableSlots = computed<MvpGuideSlot[]>(() =>
    this.slots().filter((s) => s.available)
  );

  readonly selectedSlot = computed<MvpGuideSlot | null>(() => {
    const open = this.availableSlots();
    if (!open.length) return null;
    const id = this.selectedSlotId();
    return open.find((s) => s.id === id) ?? open[0];
  });

  readonly isFavorite = computed<boolean>(() => {
    const g = this.guide();
    if (!g) return false;
    return this.guideService.isFavorite(g.id);
  });

  readonly totalPrice = computed<number>(() => {
    const slot = this.selectedSlot();
    if (slot) {
      return Number(slot.total_amount) || 0;
    }
    const pkg = this.selectedPackage();
    if (!pkg) {
      return 0;
    }
    return this.guideService.calculatePackageTotal(
      pkg,
      this.travelers(),
      this.durationDays()
    );
  });

  ngOnInit(): void {
    const guideId = this.route.snapshot.paramMap.get('id') || '';
    const query = this.route.snapshot.queryParamMap;

    const queryDate = query.get('date');
    if (queryDate) {
      this.selectedDate.set(queryDate);
    }
    const queryTravelers = Number(query.get('travelers'));
    if (Number.isInteger(queryTravelers) && queryTravelers >= 1) {
      this.travelers.set(queryTravelers);
    }

    const queryPkgId = query.get('packageId');
    const querySlotId = Number(query.get('slotId'));
    if (Number.isInteger(querySlotId) && querySlotId > 0) {
      this.selectedSlotId.set(querySlotId);
    }

    this.loadGuide(guideId, queryPkgId);
  }

  retryLoad(): void {
    const guideId = this.route.snapshot.paramMap.get('id') || '';
    this.loadGuide(guideId, null);
  }

  private loadGuide(guideId: string, preferredPkgId: string | null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.guideService.getGuideById(guideId).subscribe({
      next: (loaded) => {
        if (!loaded) {
          this.guide.set(null);
          this.errorMessage.set('The requested tour guide profile could not be found.');
          this.isLoading.set(false);
          return;
        }
        this.guide.set(loaded);
        this.guideService.selectGuide(loaded);

        const pkgs = loaded.packages ?? [];
        if (pkgs.length > 0) {
          const initialPkg =
            (preferredPkgId ? pkgs.find((p) => p.id === preferredPkgId) : undefined) ??
            pkgs[0];
          this.selectPackage(initialPkg);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.message || 'Unable to load tour guide details. Please try again.'
        );
      },
    });
  }

  selectPackage(pkg: TourPackage): void {
    this.validationError.set(null);
    this.selectedPackageId.set(pkg.id);

    const min = pkg.minGroupSize ?? 1;
    if (this.travelers() < min) {
      this.travelers.set(min);
    } else if (this.travelers() > pkg.maxGroupSize) {
      this.travelers.set(pkg.maxGroupSize);
    }
    this.fetchAvailabilityForSelection();
  }

  onPackageDropdownChange(pkgId: string): void {
    const found = this.packages().find((p) => p.id === pkgId);
    if (found) {
      this.selectPackage(found);
    }
  }

  onDateFilterChange(dateStr: string): void {
    this.selectedDate.set(dateStr);
    this.validationError.set(null);
    this.fetchAvailabilityForSelection();
  }

  onSlotDropdownChange(slotIdVal: number | string): void {
    const numId = Number(slotIdVal);
    const slot = this.slots().find((s) => s.id === numId);
    if (slot) {
      this.selectedSlotId.set(slot.id);
      this.selectedTime.set(this.formatSlotLabel(slot));
      this.validationError.set(null);
    }
  }

  fetchAvailabilityForSelection(): void {
    const g = this.guide();
    const pkg = this.selectedPackage();
    if (!g || !pkg) {
      this.slots.set([]);
      return;
    }

    this.isLoadingSlots.set(true);
    this.slotsError.set(null);

    this.guideService
      .getGuideAvailability(
        g.id,
        pkg.id,
        this.travelers(),
        this.selectedDate().trim() || undefined
      )
      .subscribe({
        next: (slots) => {
          this.isLoadingSlots.set(false);
          this.slots.set(slots);
          const firstOpen = slots.find((s) => s.available);
          if (firstOpen) {
            const existing = slots.find(
              (s) => s.id === this.selectedSlotId() && s.available
            );
            const chosen = existing || firstOpen;
            this.selectedSlotId.set(chosen.id);
            this.selectedTime.set(this.formatSlotLabel(chosen));
          } else {
            this.selectedSlotId.set(null);
            this.selectedTime.set('');
          }
        },
        error: (err) => {
          this.isLoadingSlots.set(false);
          this.slots.set([]);
          this.slotsError.set(
            err?.error?.detail || err?.message || 'Unable to load scheduled availability.'
          );
        },
      });
  }

  formatSlotLabel(slot: MvpGuideSlot): string {
    const dateStr = this.guideService.slotSriLankaDate(slot.starts_at);
    const timeRange = this.guideService.formatSlotTimeRange(slot.starts_at, slot.ends_at);
    return `${dateStr} · ${timeRange} (${slot.currency} ${Number(slot.total_amount).toLocaleString()})`;
  }

  incrementTravelers(): void {
    const max = this.selectedPackage()?.maxGroupSize ?? 12;
    this.travelers.update((t) => Math.min(max, t + 1));
    this.validationError.set(null);
    this.fetchAvailabilityForSelection();
  }

  decrementTravelers(): void {
    const min = this.selectedPackage()?.minGroupSize ?? 1;
    this.travelers.update((t) => Math.max(min, t - 1));
    this.validationError.set(null);
    this.fetchAvailabilityForSelection();
  }

  pricingUnitLabel(pkg: TourPackage | null): string {
    return this.guideService.formatPricingUnitLabel(pkg?.pricingUnit);
  }

  packageTotalForCurrentTravelers(pkg: TourPackage): number {
    return this.guideService.calculatePackageTotal(
      pkg,
      Math.min(this.travelers(), pkg.maxGroupSize),
      1
    );
  }

  toggleWishlist(event: Event): void {
    const g = this.guide();
    if (!g) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', event.currentTarget as HTMLElement, {
        type: 'wishlist',
        resumeCallback: () => this.guideService.toggleFavorite(g.id),
      });
      return;
    }
    this.guideService.toggleFavorite(g.id);
  }

  shareProfile(): void {
    const g = this.guide();
    if (!g) return;
    const url = typeof window !== 'undefined' ? window.location.href : `/tour-guides/${g.id}`;
    this.shareUrl.set(url);

    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator
        .share({ title: `${g.name} — CeylonGo Local Tour Guide`, url })
        .then(() => this.shareStatus.set('Link shared.'))
        .catch(() => this.shareStatus.set('Share link ready below.'));
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(url)
        .then(() => this.shareStatus.set('Profile link copied to clipboard.'))
        .catch(() => this.shareStatus.set('Share link ready below.'));
    } else {
      this.shareStatus.set('Share link ready below.');
    }
  }

  openGalleryViewer(index = 0): void {
    this.activePhotoIndex.set(index);
    this.isGalleryViewerOpen.set(true);
  }

  closeGalleryViewer(): void {
    this.isGalleryViewerOpen.set(false);
  }

  prevPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i - 1 + total) % total);
  }

  nextPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i + 1) % total);
  }

  continueToBooking(event?: Event): void {
    this.validationError.set(null);
    const g = this.guide();
    const pkg = this.selectedPackage();
    const slot = this.selectedSlot();

    if (!g || !pkg) {
      this.validationError.set('Please select an active tour package.');
      return;
    }
    if (!slot || !slot.available) {
      this.validationError.set('Please select an open scheduled departure slot.');
      return;
    }
    if (this.travelers() < 1 || this.travelers() > Math.min(pkg.maxGroupSize, slot.capacity)) {
      this.validationError.set(
        `Traveler count must be between 1 and ${Math.min(pkg.maxGroupSize, slot.capacity)} for this slot.`
      );
      return;
    }

    const slotDate = this.guideService.slotSriLankaDate(slot.starts_at);
    const slotTime = this.guideService.formatSlotTimeRange(slot.starts_at, slot.ends_at);

    const proceed = () => {
      this.guideService.setBookingDraft({
        guideId: g.id,
        packageId: pkg.id,
        slotId: slot.id,
        startsAtIso: slot.starts_at,
        endsAtIso: slot.ends_at,
        expectedTotal: String(slot.total_amount),
        date: slotDate,
        time: slotTime,
        travelers: this.travelers(),
        days: 1,
        requestKey: this.guideService.createRequestKey(),
      });

      void this.router.navigate(['/tour-guides', g.id, 'booking'], {
        queryParams: {
          packageId: pkg.id,
          slotId: slot.id,
          date: slotDate,
          travelers: this.travelers(),
        },
      });
    };

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', event?.currentTarget as HTMLElement | undefined, {
        type: 'booking',
        resumeCallback: proceed,
      });
      return;
    }

    proceed();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.guideService.neutralPlaceholder) {
      img.src = this.guideService.neutralPlaceholder;
    }
  }

  private defaultFutureDate(offsetDays = 2): string {
    return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }
}
