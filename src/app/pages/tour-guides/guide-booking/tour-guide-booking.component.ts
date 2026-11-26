import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import {
  MvpGuideBookingResponse,
  MvpGuideSlot,
  TourGuide,
  TourGuideBookingDraft,
  TourGuideBookingRecord,
  TourGuidePaymentMethod,
  TourPackage,
} from '../../../core/models/tour-guide.models';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { TourGuideService } from '../../../core/services/tour-guide.service';
import { Footer } from '../../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { TravelerNavbar } from '../../../shared/components/traveler-navbar/traveler-navbar';

@Component({
  selector: 'app-tour-guide-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TravelerNavbar,
    Footer,
    TravelerAuthModal,
  ],
  templateUrl: './tour-guide-booking.component.html',
  styleUrl: './tour-guide-booking.component.scss',
})
export class TourGuideBookingComponent implements OnInit {
  readonly guideService = inject(TourGuideService);
  readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);

  readonly step = signal<1 | 2 | 3>(1);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingSlots = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditingSelection = signal<boolean>(false);

  readonly guide = signal<TourGuide | null>(null);
  readonly packageId = signal<string>('');
  readonly slots = signal<MvpGuideSlot[]>([]);
  readonly selectedSlotId = signal<number | null>(null);
  readonly date = signal<string>('');
  readonly time = signal<string>('');
  readonly travelers = signal<number>(1);
  readonly days = signal<number>(1);
  readonly requestKey = signal<string>(this.guideService.createRequestKey());

  // Payment retry tracking without duplicating reservations
  readonly createdBooking = signal<MvpGuideBookingResponse | null>(null);
  readonly paymentAttemptNo = signal<number>(1);
  readonly paymentRequestKey = signal<string>(this.guideService.createRequestKey());

  // Traveler info & terms
  travelerName = '';
  travelerEmail = '';
  travelerPhone = '';
  termsAccepted = false;

  // Step 2 — Payment state
  readonly paymentMethod = signal<TourGuidePaymentMethod>('at_location');
  readonly simulateOutcome = signal<'success' | 'failure'>('success');
  readonly isSubmitting = signal<boolean>(false);
  readonly paymentError = signal<string | null>(null);

  // Step 3 — Confirmed record
  readonly bookingRecord = signal<TourGuideBookingRecord | null>(null);

  readonly minDate = this.defaultFutureDate(0);

  readonly packages = computed<TourPackage[]>(() => this.guide()?.packages ?? []);

  readonly selectedPackage = computed<TourPackage | null>(() => {
    const list = this.packages();
    if (!list.length) return null;
    const id = this.packageId();
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

  readonly totalAmount = computed<number>(() => {
    const slot = this.selectedSlot();
    if (slot) {
      return Number(slot.total_amount) || 0;
    }
    const pkg = this.selectedPackage();
    if (!pkg) return 0;
    return this.guideService.calculatePackageTotal(pkg, this.travelers(), this.days());
  });

  readonly confirmationHeading = computed<string>(() => {
    const rec = this.bookingRecord();
    if (rec?.bookingStatus === 'confirmed') {
      return 'Booking Confirmed';
    }
    return 'Booking Request Submitted';
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        if (!this.travelerName) this.travelerName = user.full_name || '';
        if (!this.travelerEmail) this.travelerEmail = user.email || '';
      }
    });
  }

  ngOnInit(): void {
    const guideId = this.route.snapshot.paramMap.get('id') || '';
    const q = this.route.snapshot.queryParamMap;
    const existingDraft = this.guideService.bookingDraft();

    const initialPkgId =
      q.get('packageId') ||
      (existingDraft?.guideId === guideId ? existingDraft.packageId : '');
    const initialSlotId = Number(
      q.get('slotId') || (existingDraft?.guideId === guideId ? existingDraft.slotId : 0)
    );
    const initialDate =
      q.get('date') || (existingDraft?.guideId === guideId ? existingDraft.date : '');
    const initialTravelers = Number(
      q.get('travelers') || existingDraft?.travelers || 1
    );

    this.packageId.set(initialPkgId);
    if (Number.isInteger(initialSlotId) && initialSlotId > 0) {
      this.selectedSlotId.set(initialSlotId);
    }
    if (initialDate) {
      this.date.set(initialDate);
    }
    this.travelers.set(Math.max(1, initialTravelers || 1));

    if (existingDraft?.guideId === guideId && existingDraft.requestKey) {
      this.requestKey.set(existingDraft.requestKey);
    }

    this.loadGuide(guideId);
  }

  private loadGuide(guideId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.guideService.getGuideById(guideId).subscribe({
      next: (loaded) => {
        if (!loaded) {
          this.guide.set(null);
          this.errorMessage.set('Tour guide could not be found.');
          this.isLoading.set(false);
          return;
        }
        this.guide.set(loaded);

        const pkgs = loaded.packages ?? [];
        if (pkgs.length > 0) {
          const pkg = pkgs.find((p) => p.id === this.packageId()) ?? pkgs[0];
          this.packageId.set(pkg.id);
          if (this.travelers() > pkg.maxGroupSize) {
            this.travelers.set(pkg.maxGroupSize);
          }
          this.loadSlotsForCurrentSelection();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.message || 'Unable to load tour guide for booking.');
      },
    });
  }

  loadSlotsForCurrentSelection(): void {
    const g = this.guide();
    const pkg = this.selectedPackage();
    if (!g || !pkg) {
      this.slots.set([]);
      return;
    }

    this.isLoadingSlots.set(true);
    this.guideService
      .getGuideAvailability(g.id, pkg.id, this.travelers(), this.date() || undefined)
      .subscribe({
        next: (slots) => {
          this.isLoadingSlots.set(false);
          this.slots.set(slots);
          const open = slots.filter((s) => s.available);
          if (open.length > 0) {
            const matched = open.find((s) => s.id === this.selectedSlotId()) ?? open[0];
            this.selectedSlotId.set(matched.id);
            this.date.set(this.guideService.slotSriLankaDate(matched.starts_at));
            this.time.set(
              this.guideService.formatSlotTimeRange(matched.starts_at, matched.ends_at)
            );
            this.syncDraft();
          } else {
            this.selectedSlotId.set(null);
          }
        },
        error: () => {
          this.isLoadingSlots.set(false);
          this.slots.set([]);
        },
      });
  }

  guideProfileQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      packageId: this.packageId(),
      travelers: this.travelers(),
    };
    if (this.date()) params['date'] = this.date();
    if (this.selectedSlotId()) params['slotId'] = this.selectedSlotId()!;
    return params;
  }

  toggleEditSelection(): void {
    this.isEditingSelection.update((v) => !v);
    this.syncDraft();
  }

  onPackageChange(pkgId: string): void {
    const pkg = this.packages().find((p) => p.id === pkgId);
    if (!pkg) return;
    this.packageId.set(pkg.id);
    if (this.travelers() > pkg.maxGroupSize) {
      this.travelers.set(pkg.maxGroupSize);
    }
    this.loadSlotsForCurrentSelection();
  }

  onDateOrTravelersChange(): void {
    this.loadSlotsForCurrentSelection();
  }

  onSlotChange(slotIdVal: number | string): void {
    const numId = Number(slotIdVal);
    const slot = this.availableSlots().find((s) => s.id === numId);
    if (slot) {
      this.selectedSlotId.set(slot.id);
      this.date.set(this.guideService.slotSriLankaDate(slot.starts_at));
      this.time.set(
        this.guideService.formatSlotTimeRange(slot.starts_at, slot.ends_at)
      );
      this.syncDraft();
    }
  }

  formatSlotOption(slot: MvpGuideSlot): string {
    const d = this.guideService.slotSriLankaDate(slot.starts_at);
    const t = this.guideService.formatSlotTimeRange(slot.starts_at, slot.ends_at);
    return `${d} · ${t} (${slot.currency} ${Number(slot.total_amount).toLocaleString()})`;
  }

  pricingUnitLabel(pkg: TourPackage | null): string {
    return this.guideService.formatPricingUnitLabel(pkg?.pricingUnit);
  }

  openAuthModal(): void {
    this.authModalService.open('login');
  }

  continueToPayment(): void {
    this.errorMessage.set(null);
    const pkg = this.selectedPackage();
    const slot = this.selectedSlot();
    if (!pkg) {
      this.errorMessage.set('Please select an active tour package.');
      return;
    }
    if (!slot || !slot.available) {
      this.errorMessage.set(
        'No open scheduled slot is available for this selection. Choose another date or package.'
      );
      return;
    }
    if (
      this.travelers() < 1 ||
      this.travelers() > Math.min(pkg.maxGroupSize, slot.capacity)
    ) {
      this.errorMessage.set(
        `Traveler count must be between 1 and ${Math.min(pkg.maxGroupSize, slot.capacity)}.`
      );
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'booking',
        resumeCallback: () => this.advanceToStepTwo(),
      });
      return;
    }

    this.advanceToStepTwo();
  }

  private advanceToStepTwo(): void {
    if (!this.travelerName.trim() || !this.travelerEmail.trim()) {
      this.errorMessage.set('Traveler full name and email address are required.');
      return;
    }
    if (!this.termsAccepted) {
      this.errorMessage.set(
        'Please accept the tour guidelines and cancellation policy to continue.'
      );
      return;
    }

    this.syncDraft();
    this.paymentError.set(null);
    this.step.set(2);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backToDetails(): void {
    this.paymentError.set(null);
    this.step.set(1);
  }

  confirmBooking(): void {
    const g = this.guide();
    const pkg = this.selectedPackage();
    const slot = this.selectedSlot();
    if (!g || !pkg || this.isSubmitting()) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'booking',
        resumeCallback: () => this.confirmBooking(),
      });
      return;
    }

    if (!this.createdBooking() && (!slot || !slot.available)) {
      this.paymentError.set('Please choose an open availability slot.');
      return;
    }

    this.isSubmitting.set(true);
    this.paymentError.set(null);

    const draft: TourGuideBookingDraft = {
      guideId: g.id,
      packageId: pkg.id,
      slotId: slot?.id,
      startsAtIso: slot?.starts_at,
      endsAtIso: slot?.ends_at,
      expectedTotal: slot ? String(slot.total_amount) : undefined,
      date: this.date(),
      time: this.time(),
      travelers: this.travelers(),
      days: 1,
      requestKey: this.requestKey(),
    };

    this.guideService
      .submitGuideBooking({
        guide: g,
        selectedPackage: pkg,
        draft,
        selectedSlot: slot,
        existingBooking: this.createdBooking(),
        paymentMethod: this.paymentMethod(),
        simulateOutcome: this.simulateOutcome(),
        paymentAttemptNo: this.paymentAttemptNo(),
        paymentRequestKey: this.paymentRequestKey(),
        travelerName: this.travelerName.trim(),
        travelerEmail: this.travelerEmail.trim(),
        travelerPhone: this.travelerPhone.trim() || undefined,
        onBookingCreated: (created) => this.createdBooking.set(created),
      })
      .subscribe({
        next: (record) => {
          this.bookingRecord.set(record);
          this.isSubmitting.set(false);
          this.step.set(3);
          this.guideService.clearBookingDraft();
          if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.paymentAttemptNo.update((n) => n + 1);
          this.paymentRequestKey.set(this.guideService.createRequestKey());
          const msg =
            err?.message || 'Booking submission failed. Please retry safely.';
          this.paymentError.set(msg);
          if (!this.createdBooking()) {
            this.loadSlotsForCurrentSelection();
          }
        },
      });
  }

  paymentStatusLabel(record: TourGuideBookingRecord): string {
    if (record.paymentStatus === 'paid_demo') return 'Paid (Academic Demo)';
    if (record.paymentStatus === 'failed') return 'Failed';
    return 'Unpaid';
  }

  paymentMethodLabel(record: TourGuideBookingRecord): string {
    return record.paymentMethod === 'simulated'
      ? 'Academic Demo Online Payment'
      : 'Pay at Location (Unpaid)';
  }

  private syncDraft(): void {
    const g = this.guide();
    const pkg = this.selectedPackage();
    const slot = this.selectedSlot();
    if (!g || !pkg) return;

    this.guideService.setBookingDraft({
      guideId: g.id,
      packageId: pkg.id,
      slotId: slot?.id,
      startsAtIso: slot?.starts_at,
      endsAtIso: slot?.ends_at,
      expectedTotal: slot ? String(slot.total_amount) : undefined,
      date: this.date(),
      time: this.time(),
      travelers: this.travelers(),
      days: 1,
      requestKey: this.requestKey(),
    });
  }

  private defaultFutureDate(offsetDays = 2): string {
    return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }
}
