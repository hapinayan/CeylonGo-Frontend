import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  BookingConfirmation,
  BookingDraft,
  HomestayBookingDetails,
  HomestayBookingRequest,
  HomestayDetail,
  PaymentResponse,
} from '../../core/models/homestay.models';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { HomestayService } from '../../core/services/homestay.service';
import { TravelerBackNavigationService } from '../../core/services/traveler-back-navigation.service';

@Component({
  selector: 'app-homestay-booking-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './homestay-booking-review.html',
  styleUrl: './homestay-booking-review.scss',
})
export class HomestayBookingReview implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly backNav = inject(TravelerBackNavigationService);
  readonly homestayService = inject(HomestayService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  readonly homestay = signal<HomestayDetail | null>(null);
  readonly draft = signal<BookingDraft | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isNotFound = signal<boolean>(false);
  readonly isConfirmed = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly confirmationData = signal<BookingConfirmation | null>(null);
  readonly createdBooking = signal<HomestayBookingDetails | null>(null);

  // Idempotency request key preserved across retries
  readonly bookingRequestKey = signal<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cg-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  // Payment method signal: Pay at Location or Online Academic Simulation
  readonly paymentMethod = signal<'at_location' | 'online'>('at_location');
  readonly simulateOutcome = signal<'success' | 'failure'>('success');
  readonly paymentAttemptNo = signal<number>(1);
  readonly bookingErrorMessage = signal<string | null>(null);
  readonly paymentErrorMessage = signal<string | null>(null);

  // Traveler info inputs
  readonly travelerName = signal<string>('');
  readonly travelerEmail = signal<string>('');
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

    // Pre-fill traveler info from authenticated user if available
    const user = this.authService.currentUser();
    if (user) {
      this.travelerName.set(user.full_name || '');
      this.travelerEmail.set(user.email || '');
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
          if (existingDraft.guestName && !this.travelerName()) {
            this.travelerName.set(existingDraft.guestName);
          }
          if (existingDraft.guestEmail && !this.travelerEmail()) {
            this.travelerEmail.set(existingDraft.guestEmail);
          }
          if (existingDraft.guestPhone) {
            this.travelerPhone.set(existingDraft.guestPhone);
          }
          if (existingDraft.specialRequests) {
            this.specialRequests.set(existingDraft.specialRequests);
          }
        } else {
          // Construct draft from query parameters
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

          const qUnitId = qp.get('unit_id');
          const unit = qUnitId && item.units?.length
            ? item.units.find((u) => u.id === Number(qUnitId))
            : item.units && item.units.length > 0
            ? item.units[0]
            : undefined;

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
            selectedUnitId: unit?.id,
            selectedUnitLabel: unit?.label,
            selectedUnitCapacity: unit?.capacity,
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

  selectPaymentMethod(method: 'at_location' | 'online'): void {
    this.paymentMethod.set(method);
    this.paymentErrorMessage.set(null);
  }

  setSimulateOutcome(outcome: 'success' | 'failure'): void {
    this.simulateOutcome.set(outcome);
    this.paymentErrorMessage.set(null);
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
            unit_id: d.selectedUnitId,
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

    // 1. Enforce Traveler Authentication before booking creation
    if (!this.authService.isAuthenticated()) {
      const updatedDraft: BookingDraft = {
        ...d,
        guestName: this.travelerName().trim(),
        guestEmail: this.travelerEmail().trim(),
        guestPhone: this.travelerPhone().trim(),
        specialRequests: this.specialRequests().trim(),
        paymentMethod: this.paymentMethod(),
      };
      this.homestayService.setBookingDraft(updatedDraft);
      this.showToast('Please sign in or create an account to submit your booking');
      this.authModalService.open('login', undefined, {
        type: 'booking',
        resumeCallback: () => {
          const u = this.authService.currentUser();
          if (u) {
            if (!this.travelerName()) this.travelerName.set(u.full_name);
            if (!this.travelerEmail()) this.travelerEmail.set(u.email);
          }
          this.confirmReservation();
        },
      });
      return;
    }

    // Check if an inventory unit is selected
    if (!d.selectedUnitId) {
      this.bookingErrorMessage.set(
        'A specific room/unit selection is required for booking. This property currently has no available units.'
      );
      this.showToast('No room unit selected');
      return;
    }

    this.isSubmitting.set(true);
    this.bookingErrorMessage.set(null);
    this.paymentErrorMessage.set(null);

    // If booking was already created in an earlier failed payment attempt, reuse it
    const existingBooking = this.createdBooking();
    if (existingBooking) {
      this.processPayment(existingBooking, d, h);
      return;
    }

    // 2. Call POST /api/v1/homestays/{id}/bookings
    const bookingPayload: HomestayBookingRequest = {
      room_id: d.selectedUnitId,
      check_in: d.checkIn,
      check_out: d.checkOut,
      guests: d.totalGuests,
      request_key: this.bookingRequestKey(),
      expected_total: d.estimatedTotal.toFixed(2),
    };

    this.homestayService.createHomestayBooking(h.id, bookingPayload).subscribe({
      next: (bookingResponse) => {
        this.createdBooking.set(bookingResponse);
        this.processPayment(bookingResponse, d, h);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          const detail =
            err.error?.detail ||
            'Room is no longer available or price changed for requested dates. Please re-check availability.';
          this.bookingErrorMessage.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } else {
          const detail =
            err.error?.detail ||
            'Failed to submit booking request to CeylonGo backend. Please verify details and retry.';
          this.bookingErrorMessage.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
        this.showToast('Booking request was not accepted');
      },
    });
  }

  private processPayment(
    booking: HomestayBookingDetails,
    d: BookingDraft,
    h: HomestayDetail
  ): void {
    const paymentReqKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cg-pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (this.paymentMethod() === 'online') {
      // Academic Demo Simulated Payment: POST /api/v1/payments/simulate
      const attempt = this.paymentAttemptNo();
      const outcome = this.simulateOutcome();

      this.homestayService
        .simulatePayment({
          booking_id: booking.id,
          request_key: paymentReqKey,
          attempt_no: attempt,
          simulate_outcome: outcome,
        })
        .subscribe({
          next: (paymentResponse) => {
            if (paymentResponse.status === 'demo_succeeded') {
              this.finalizeConfirmation(booking, d, h, paymentResponse, 'Academic Demo Online Payment');
            } else {
              // Simulated failure response
              this.isSubmitting.set(false);
              this.paymentAttemptNo.update((n) => n + 1);
              this.paymentErrorMessage.set(
                `Payment attempt #${attempt} was simulated as failed (demo_failed). Your booking request #${booking.id} remains reserved. You can retry with attempt #${this.paymentAttemptNo()} or switch to Pay at Location.`
              );
              this.showToast('Payment simulation failed');
            }
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.paymentAttemptNo.update((n) => n + 1);
            const detail = err.error?.detail || 'Simulated payment service error.';
            this.paymentErrorMessage.set(
              typeof detail === 'string' ? detail : 'Payment simulation could not be completed.'
            );
            this.showToast('Payment simulation failed');
          },
        });
    } else {
      // Pay at Location: POST /api/v1/payments/at-location
      this.homestayService
        .payAtLocation({
          booking_id: booking.id,
          request_key: paymentReqKey,
        })
        .subscribe({
          next: (paymentResponse) => {
            this.finalizeConfirmation(booking, d, h, paymentResponse, 'Pay at Location');
          },
          error: () => {
            // Even if recorded payment returned non-200, check authoritative booking
            this.finalizeConfirmation(booking, d, h, undefined, 'Pay at Location');
          },
        });
    }
  }

  private finalizeConfirmation(
    booking: HomestayBookingDetails,
    d: BookingDraft,
    h: HomestayDetail,
    payment?: PaymentResponse,
    paymentMethodName: string = 'Pay at Location'
  ): void {
    // Check authoritative booking status via GET /api/v1/homestays/{id}/bookings/{booking_id}
    this.homestayService.getHomestayBooking(h.id, booking.id).subscribe({
      next: (authoritative) => {
        const confirmation: BookingConfirmation = {
          id: authoritative.id,
          bookingReference: `CG-HS-${authoritative.id}`,
          homestayId: d.homestayId,
          homestayName: d.homestayName,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          totalGuests: d.totalGuests,
          nights: d.nights,
          estimatedTotal: Number(authoritative.total_amount) || d.estimatedTotal,
          hostName: h.host_name || 'Local Host',
          confirmedAt: authoritative.created_at || new Date().toISOString(),
          paymentStatus: payment?.status || authoritative.payments?.[0]?.status || 'unpaid',
          paymentMethod: paymentMethodName,
          currency: authoritative.currency || 'LKR',
        };

        this.confirmationData.set(confirmation);
        this.isConfirmed.set(true);
        this.backNav.markBookingConfirmed();
        this.isSubmitting.set(false);
        this.homestayService.clearBookingDraft();
        this.showToast('Booking request submitted to host!');
      },
      error: () => {
        const confirmation: BookingConfirmation = {
          id: booking.id,
          bookingReference: `CG-HS-${booking.id}`,
          homestayId: d.homestayId,
          homestayName: d.homestayName,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          totalGuests: d.totalGuests,
          nights: d.nights,
          estimatedTotal: Number(booking.total_amount) || d.estimatedTotal,
          hostName: h.host_name || 'Local Host',
          confirmedAt: booking.created_at || new Date().toISOString(),
          paymentStatus: payment?.status || 'unpaid',
          paymentMethod: paymentMethodName,
          currency: booking.currency || 'LKR',
        };

        this.confirmationData.set(confirmation);
        this.isConfirmed.set(true);
        this.backNav.markBookingConfirmed();
        this.isSubmitting.set(false);
        this.homestayService.clearBookingDraft();
      },
    });
  }

  ngOnDestroy(): void {
    this.backNav.clearBookingConfirmed();
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
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
