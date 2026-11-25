import { DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { CheckedRentalDates, RentalDatePicker } from './rental-date-picker';
import { RentalDates, previewDateAvailable } from './rental-dates';
import { PreviewRental, RentalBookingPreviewStore, SAMPLE_TRAVELER, previewEstimate } from './rental-booking-preview.store';
import { RentalImage } from './rental-image';
import { previewVehicle } from './rental-preview';

const STEPS = ['Rental dates', 'Pickup & return', 'Traveler requirements', 'Price summary', 'Review', 'Confirmation'];

@Component({
  imports: [RouterLink, DecimalPipe, DatePipe, RentalDatePicker, RentalImage],
  templateUrl: './rental-booking.html',
  styleUrl: './rental-booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalBooking {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly store = inject(RentalBookingPreviewStore);
  private readonly viewport = inject(ViewportScroller);
  private readonly router = inject(Router);
  private readonly initialId = this.route.snapshot.paramMap.get('id');
  private readonly routeId = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly vehicle = computed(() => previewVehicle(Number(this.routeId().get('id'))));
  readonly search = this.route.snapshot.queryParamMap;
  readonly incomingDates = (this.router.currentNavigation()?.extras.state?.['dates'] ?? null) as RentalDates | null;
  readonly steps = STEPS;
  readonly traveler = SAMPLE_TRAVELER;
  readonly step = linkedSignal(() => this.initialStep(0));
  readonly checkedDates = linkedSignal<CheckedRentalDates | null>(() => this.initialStep(null));
  readonly draftDates = linkedSignal<RentalDates | null>(() => this.routeId().get('id') === this.initialId ? this.incomingDates : null);
  readonly locationAccepted = linkedSignal(() => this.initialStep(false));
  readonly scenario = linkedSignal(() => this.initialStep('eligible'));
  readonly safetyAccepted = linkedSignal(() => this.initialStep(false));
  readonly termsAccepted = linkedSignal(() => this.initialStep(false));
  readonly error = linkedSignal(() => this.initialStep(''));
  readonly confirmation = linkedSignal<PreviewRental | null>(() => this.initialStep(null));
  readonly estimate = computed(() => previewEstimate(this.vehicle()?.price_per_day ?? 0, this.checkedDates()?.days ?? 0));
  readonly needsLicense = computed(() => this.vehicle()?.vehicle_type === 'bike');

  constructor() { afterNextRender(() => this.viewport.scrollToPosition([0, 0])); }

  setDates(dates: CheckedRentalDates | null): void {
    this.checkedDates.set(dates);
    if (dates) this.draftDates.set(dates.dates);
    this.termsAccepted.set(false);
    this.error.set('');
  }

  edit(step: number): void {
    if (step < 0 || step >= this.step() || this.confirmation()) return;
    this.termsAccepted.set(false);
    this.move(step);
  }

  continue(): void {
    switch (this.step()) {
      case 0: if (!this.checkedDates()) return this.error.set('Check the selected dates before continuing.'); break;
      case 1: if (!this.locationAccepted()) return this.error.set('Confirm that you are using sample pickup and return.'); break;
      case 2: {
        const error = this.requirementsError();
        if (error) return this.error.set(error);
        break;
      }
      case 3: break;
      default: return;
    }
    const next = this.step() + 1;
    this.move(next);
  }

  confirm(event: Event): void {
    if (this.step() !== 4 || this.confirmation()) return;
    const vehicle = this.vehicle();
    const check = this.checkedDates();
    if (!vehicle || !check || !this.locationAccepted()) return;
    if (Date.parse(check.dates.pickup_at) <= Date.now() || !previewDateAvailable(check.dates)) {
      this.checkedDates.set(null);
      this.move(0);
      this.error.set('The sample dates are no longer available. Check a new interval.');
      return;
    }
    const eligibility = this.requirementsError();
    if (eligibility) {
      this.move(2);
      this.error.set(eligibility);
      return;
    }
    if (!this.termsAccepted()) return this.error.set('Acknowledge the preview terms before confirming.');
    if (!this.auth.isAuthenticated()) {
      this.authModal.open('login', event.currentTarget as HTMLElement);
      return;
    }
    const user = this.auth.currentUser();
    if (user?.role !== 'traveler' || !user.is_active) return this.error.set('Sign in with an active traveler account to finish the simulation.');
    this.confirmation.set(this.store.simulate(user.id, vehicle, check.dates, check.days));
    this.move(5);
  }

  private requirementsError(): string {
    if (this.scenario() === 'underage') return 'The sample traveler does not meet the minimum age at pickup.';
    if (this.needsLicense() && this.scenario() === 'expired') return 'The sample driving licence expires before return.';
    if (this.needsLicense() && this.scenario() !== 'eligible') {
      return 'A motorbike requires an approved driving licence that is valid through return and trusted proof of age.';
    }
    if (!this.safetyAccepted()) return 'Acknowledge the safety requirements to continue.';
    return '';
  }

  private move(step: number): void {
    this.error.set('');
    this.step.set(step);
    requestAnimationFrame(() => document.getElementById('booking-step-title')?.focus());
  }

  private initialStep<Value>(value: Value): Value {
    this.routeId();
    return value;
  }
}
