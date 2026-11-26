import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { BookingDraft, HomestayDetail as HomestayDetailModel } from '../../core/models/homestay.models';
import { HomestayService } from '../../core/services/homestay.service';

@Component({
  selector: 'app-homestay-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './homestay-detail.html',
  styleUrl: './homestay-detail.scss',
})
export class HomestayDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly homestayService = inject(HomestayService);

  private routeSub?: Subscription;

  // Property Data Signals
  readonly homestay = signal<HomestayDetailModel | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isNotFound = signal<boolean>(false);
  readonly currentId = signal<number>(0);

  // Gallery & Lightbox Signals
  readonly isGalleryModalOpen = signal<boolean>(false);
  readonly activePhotoIndex = signal<number>(0);

  // Booking Form Signals
  readonly checkInDate = signal<string>('');
  readonly checkOutDate = signal<string>('');
  readonly adultsCount = signal<number>(2);
  readonly childrenCount = signal<number>(0);
  readonly dateErrorMessage = signal<string | null>(null);
  readonly guestErrorMessage = signal<string | null>(null);

  // UI state signals
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Computed Values
  readonly todayString = computed(() => {
    const d = new Date();
    return this.formatDate(d);
  });

  readonly totalGuests = computed(() => this.adultsCount() + this.childrenCount());

  readonly nightsCount = computed(() => {
    return this.homestayService.calculateNights(this.checkInDate(), this.checkOutDate());
  });

  readonly estimatedBasePrice = computed(() => {
    const h = this.homestay();
    if (!h) return 0;
    return this.homestayService.calculateEstimatedPrice(h.price_per_night, this.nightsCount());
  });

  readonly estimatedTotal = computed(() => this.estimatedBasePrice());

  readonly isWishlisted = computed(() => {
    const h = this.homestay();
    return h ? this.homestayService.isWishlisted(h.id) : false;
  });

  readonly wishlistCount = computed(() => this.homestayService.wishlistIds().length);

  readonly isCapacityExceeded = computed(() => {
    const h = this.homestay();
    if (!h) return false;
    return this.totalGuests() > h.max_guests;
  });

  readonly canContinueToBooking = computed(() => {
    return (
      !this.isLoading() &&
      !this.isNotFound() &&
      this.homestay() !== null &&
      this.nightsCount() > 0 &&
      !this.isCapacityExceeded() &&
      !this.dateErrorMessage() &&
      !this.guestErrorMessage()
    );
  });

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.loadHomestay(idParam);
      } else {
        this.isNotFound.set(true);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadHomestay(idParam: string): void {
    this.isLoading.set(true);
    this.isNotFound.set(false);

    const numericId = Number(idParam);
    if (isNaN(numericId) || numericId <= 0) {
      this.isNotFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.currentId.set(numericId);

    this.homestayService.getHomestayById(numericId).subscribe({
      next: (item) => {
        if (!item) {
          this.isNotFound.set(true);
          this.homestay.set(null);
        } else {
          this.homestay.set(item);
          this.isNotFound.set(false);
          this.initializeBookingDates();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isNotFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private initializeBookingDates(): void {
    const qp = this.route.snapshot.queryParamMap;
    const qCheckIn = qp.get('check_in');
    const qCheckOut = qp.get('check_out');
    const qAdults = qp.get('adults');
    const qChildren = qp.get('children');

    const today = new Date();
    const defaultCheckIn = new Date(today);
    defaultCheckIn.setDate(today.getDate() + 1);

    const defaultCheckOut = new Date(defaultCheckIn);
    defaultCheckOut.setDate(defaultCheckIn.getDate() + 2);

    this.checkInDate.set(qCheckIn || this.formatDate(defaultCheckIn));
    this.checkOutDate.set(qCheckOut || this.formatDate(defaultCheckOut));

    if (qAdults && !isNaN(Number(qAdults)) && Number(qAdults) > 0) {
      this.adultsCount.set(Number(qAdults));
    }
    if (qChildren && !isNaN(Number(qChildren)) && Number(qChildren) >= 0) {
      this.childrenCount.set(Number(qChildren));
    }

    this.validateDates();
    this.validateGuests();
  }

  onDatesChanged(): void {
    this.validateDates();
  }

  validateDates(): void {
    const checkIn = this.checkInDate();
    const checkOut = this.checkOutDate();
    const today = this.todayString();

    if (!checkIn) {
      this.dateErrorMessage.set('Please select a check-in date');
      return;
    }

    if (checkIn < today) {
      this.dateErrorMessage.set('Check-in date cannot be in the past');
      return;
    }

    if (!checkOut) {
      this.dateErrorMessage.set('Please select a check-out date');
      return;
    }

    if (checkOut <= checkIn) {
      this.dateErrorMessage.set('Check-out date must be after check-in date');
      return;
    }

    this.dateErrorMessage.set(null);
  }

  updateAdults(delta: number): void {
    const next = this.adultsCount() + delta;
    if (next < 1) return;
    this.adultsCount.set(next);
    this.validateGuests();
  }

  updateChildren(delta: number): void {
    const next = this.childrenCount() + delta;
    if (next < 0) return;
    this.childrenCount.set(next);
    this.validateGuests();
  }

  validateGuests(): void {
    const h = this.homestay();
    if (!h) return;

    if (this.adultsCount() < 1) {
      this.guestErrorMessage.set('At least 1 adult guest is required');
      return;
    }

    if (this.totalGuests() > h.max_guests) {
      this.guestErrorMessage.set(`Maximum property capacity is ${h.max_guests} guests`);
      return;
    }

    this.guestErrorMessage.set(null);
  }

  continueToBooking(): void {
    const h = this.homestay();
    if (!h || !this.canContinueToBooking()) return;

    const draft: BookingDraft = {
      homestayId: h.id,
      homestayName: h.name,
      homestayLocation: h.location,
      homestayImage: h.image_url,
      nightlyRate: h.price_per_night,
      checkIn: this.checkInDate(),
      checkOut: this.checkOutDate(),
      adults: this.adultsCount(),
      children: this.childrenCount(),
      totalGuests: this.totalGuests(),
      nights: this.nightsCount(),
      basePrice: this.estimatedBasePrice(),
      estimatedTotal: this.estimatedTotal(),
    };

    this.homestayService.setBookingDraft(draft);

    this.router.navigate(['/homestays', h.id, 'booking'], {
      queryParams: {
        check_in: this.checkInDate(),
        check_out: this.checkOutDate(),
        adults: this.adultsCount(),
        children: this.childrenCount(),
      },
    });
  }

  toggleWishlist(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const h = this.homestay();
    if (!h) return;

    this.homestayService.changeWishlist(h).subscribe({
      next: added => {
        h.is_wishlisted = added;
        this.showToast(added ? 'Saved to wishlist' : 'Removed from wishlist');
      },
      error: () => this.showToast('Could not update the wishlist. Try again.'),
    });
  }

  copyShareLink(): void {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.showToast('Link copied to clipboard!');
    } else {
      this.showToast('Share link ready!');
    }
  }

  // Gallery Modal Methods
  openGallery(index: number = 0): void {
    this.activePhotoIndex.set(index);
    this.isGalleryModalOpen.set(true);
  }

  closeGallery(): void {
    this.isGalleryModalOpen.set(false);
  }

  nextPhoto(): void {
    const h = this.homestay();
    if (!h || !h.images.length) return;
    const next = (this.activePhotoIndex() + 1) % h.images.length;
    this.activePhotoIndex.set(next);
  }

  prevPhoto(): void {
    const h = this.homestay();
    if (!h || !h.images.length) return;
    const prev = (this.activePhotoIndex() - 1 + h.images.length) % h.images.length;
    this.activePhotoIndex.set(prev);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default HomestayDetail;


