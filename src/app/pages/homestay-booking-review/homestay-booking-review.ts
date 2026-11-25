import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { BookingConfirmation, BookingDraft, HomestayDetail } from '../../core/models/homestay.models';
import { HomestayService } from '../../core/services/homestay.service';

@Component({
  selector: 'app-homestay-booking-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './homestay-booking-review.html',
  styleUrl: './homestay-booking-review.scss',
})
export class HomestayBookingReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly homestayService = inject(HomestayService);

  readonly homestay = signal<HomestayDetail | null>(null);
  readonly draft = signal<BookingDraft | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isNotFound = signal<boolean>(false);
  readonly isConfirmed = signal<boolean>(false);
  readonly confirmationData = signal<BookingConfirmation | null>(null);

  // Traveler info inputs
  readonly travelerName = signal<string>('Alex Morgan');
  readonly travelerEmail = signal<string>('alex.morgan@ceylongo.com');
  readonly travelerPhone = signal<string>('+94 77 123 4567');
  readonly specialRequests = signal<string>('');

  // UI state
  readonly toastMessage = signal<string | null>(null);

  readonly formattedCheckIn = computed(() => {
    const d = this.draft();
    if (!d || !d.checkIn) return '';
    return this.formatDisplayDate(d.checkIn);
  });

  readonly formattedCheckOut = computed(() => {
    const d = this.draft();
    if (!d || !d.checkOut) return '';
    return this.formatDisplayDate(d.checkOut);
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const numericId = Number(idParam);

    if (isNaN(numericId) || numericId <= 0) {
      this.isNotFound.set(true);
      this.isLoading.set(false);
      return;
    }

    // Attempt to recover existing draft or construct from route params + service
    const existingDraft = this.homestayService.getBookingDraft();

    this.homestayService.getHomestayById(numericId).subscribe({
      next: (item) => {
        if (!item) {
          this.isNotFound.set(true);
          this.isLoading.set(false);
          return;
        }

        this.homestay.set(item);

        if (existingDraft && existingDraft.homestayId === numericId) {
          this.draft.set(existingDraft);
        } else {
          // Construct draft from query parameters or sensible defaults
          const qp = this.route.snapshot.queryParamMap;
          const today = new Date();
          const d1 = new Date(today);
          d1.setDate(today.getDate() + 1);
          const d2 = new Date(d1);
          d2.setDate(d1.getDate() + 2);

          const checkIn = qp.get('check_in') || this.formatDate(d1);
          const checkOut = qp.get('check_out') || this.formatDate(d2);
          const adults = Number(qp.get('adults')) || 2;
          const children = Number(qp.get('children')) || 0;
          const totalGuests = adults + children;
          const nights = this.homestayService.calculateNights(checkIn, checkOut) || 2;
          const basePrice = this.homestayService.calculateEstimatedPrice(item.price_per_night, nights);

          const fallbackDraft: BookingDraft = {
            homestayId: item.id,
            homestayName: item.name,
            homestayLocation: item.location,
            homestayImage: item.image_url,
            nightlyRate: item.price_per_night,
            checkIn,
            checkOut,
            adults,
            children,
            totalGuests,
            nights,
            basePrice,
            estimatedTotal: basePrice,
          };

          this.draft.set(fallbackDraft);
          this.homestayService.setBookingDraft(fallbackDraft);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.isNotFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  editBookingDetails(): void {
    const d = this.draft();
    const h = this.homestay();
    if (!h) return;

    this.router.navigate(['/homestays', h.id], {
      queryParams: d
        ? {
            check_in: d.checkIn,
            check_out: d.checkOut,
            adults: d.adults,
            children: d.children,
          }
        : undefined,
    });
  }

  confirmReservation(): void {
    const d = this.draft();
    const h = this.homestay();
    if (!d || !h) return;

    if (!this.travelerName().trim()) {
      this.showToast('Please enter your full name');
      return;
    }

    if (!this.travelerEmail().trim()) {
      this.showToast('Please enter a valid email address');
      return;
    }

    const updatedDraft: BookingDraft = {
      ...d,
      guestName: this.travelerName().trim(),
      guestEmail: this.travelerEmail().trim(),
      guestPhone: this.travelerPhone().trim(),
      specialRequests: this.specialRequests().trim(),
    };

    const confirmation = this.homestayService.simulateBookingConfirmation(updatedDraft);
    this.confirmationData.set(confirmation);
    this.isConfirmed.set(true);
    this.showToast('Reservation request submitted (Demo Mode)');
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

  private formatDisplayDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}

export default HomestayBookingReview;


