import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, firstValueFrom, map, of, startWith, Subject, switchMap } from 'rxjs';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { MvpBookingResponse, MvpPaymentResponse, RentalApi } from './rental-api';
import { CheckedRentalDates, RentalDatePicker } from './rental-date-picker';
import { previewEstimate, RentalBookingPreviewStore } from './rental-booking-preview.store';
import { RentalImage } from './rental-image';
import { RentalVehicle, formatLkr } from './rental-models';
import { previewVehicle, rentalPreviewEnabled } from './rental-preview';

type VehicleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; vehicle: RentalVehicle };

type WizardStep = 'review' | 'payment' | 'confirmation';
type PaymentMethod = 'online' | 'at_location';
type DemoOutcome = 'success' | 'failure';

function makeRequestKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 36);
  }
  return `rent-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`.slice(0, 36);
}

@Component({
  selector: 'app-rental-booking',
  imports: [FormsModule, RouterLink, RentalImage, RentalDatePicker],
  templateUrl: './rental-booking.html',
  styleUrl: './rental-booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalBooking {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RentalApi);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly previewStore = inject(RentalBookingPreviewStore);
  private readonly retry$ = new Subject<void>();

  readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly preview = computed(() => rentalPreviewEnabled && this.params().get('preview') === '1');
  readonly currentUser = this.auth.currentUser;

  readonly vehicleState = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, qParams]) => {
        const id = Number(params.get('id'));
        const isPreview = rentalPreviewEnabled && qParams.get('preview') === '1';
        if (!Number.isInteger(id) || id <= 0) {
          return of<VehicleState>({ status: 'error', message: 'Invalid rental vehicle ID.' });
        }
        return this.retry$.pipe(
          startWith(undefined),
          switchMap(() => {
            if (isPreview) {
              const found = previewVehicle(id);
              return of<VehicleState>(
                found
                  ? { status: 'ready', vehicle: found }
                  : { status: 'error', message: 'Preview rental vehicle not found.' },
              );
            }
            return this.api.detail(id).pipe(
              map((vehicle): VehicleState => ({ status: 'ready', vehicle })),
              startWith<VehicleState>({ status: 'loading' }),
              catchError((err: { error?: { detail?: string } }) =>
                of<VehicleState>({
                  status: 'error',
                  message: err?.error?.detail || 'Could not load rental vehicle details.',
                }),
              ),
            );
          }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as VehicleState },
  );

  readonly step = signal<WizardStep>('review');
  readonly editingDates = signal(false);
  readonly selectedDates = signal<CheckedRentalDates | null>(null);

  readonly fullName = signal('');
  readonly email = signal('');
  readonly licenseConfirmed = signal(false);
  readonly licenseValidUntil = signal('');
  readonly termsAccepted = signal(false);
  readonly reviewError = signal('');
  readonly revalidating = signal(false);

  readonly paymentMethod = signal<PaymentMethod>('online');
  readonly simulateOutcome = signal<DemoOutcome>('success');
  readonly submitting = signal(false);
  readonly paymentError = signal('');
  readonly conflictNeedsRefresh = signal(false);

  readonly createdBooking = signal<MvpBookingResponse | null>(null);
  readonly completedPayment = signal<MvpPaymentResponse | null>(null);
  readonly previewReference = signal('');
  readonly paymentAttempt = signal(1);
  private bookingRequestKey = makeRequestKey();
  private paymentRequestKey = makeRequestKey();

  readonly formatLkr = formatLkr;

  readonly vehicleQuantity = computed(() => Math.max(1, this.selectedDates()?.quantity ?? 1));

  readonly estimatedTotal = computed(() => {
    const dates = this.selectedDates();
    if (dates?.totalPrice) {
      const serverNum = Number(dates.totalPrice);
      if (Number.isFinite(serverNum)) return serverNum;
    }
    const state = this.vehicleState();
    if (state.status !== 'ready') return 0;
    const days = dates?.days ?? 1;
    return previewEstimate(state.vehicle.price_per_day, days) * this.vehicleQuantity();
  });

  readonly confirmedTitle = computed(() => {
    const booking = this.createdBooking();
    return booking?.status === 'confirmed'
      ? 'Booking Confirmed'
      : 'Booking Request Submitted — Awaiting Provider Confirmation';
  });

  constructor() {
    effect(() => {
      const q = this.params();
      const pickup_at = q.get('pickup_at');
      const return_at = q.get('return_at');
      const days = Number(q.get('days'));
      const hours = Number(q.get('hours'));
      const qty = Math.max(1, Math.min(20, Number(q.get('quantity')) || 1));
      const total = q.get('total') ?? undefined;
      if (pickup_at && return_at && Number.isFinite(days) && days > 0) {
        this.selectedDates.set({
          dates: { pickup_at, return_at },
          days,
          hours: Number.isFinite(hours) && hours > 0 ? hours : days * 24,
          quantity: qty,
          totalPrice: total,
        });
      }
    });

    effect(() => {
      const user = this.currentUser();
      if (user) {
        if (!this.fullName().trim()) this.fullName.set(user.full_name);
        if (!this.email().trim()) this.email.set(user.email);
      } else if (this.preview()) {
        if (!this.fullName().trim()) this.fullName.set('Sample Traveler');
        if (!this.email().trim()) this.email.set('traveler@example.com');
      }
    });
  }

  retryLoad(): void {
    this.retry$.next();
  }

  onDatesChecked(checked: CheckedRentalDates | null): void {
    this.selectedDates.set(checked);
    if (checked) {
      this.editingDates.set(false);
      // Selection changed or refreshed -> fresh request key for new reservation if no booking exists yet
      if (!this.createdBooking()) {
        this.bookingRequestKey = makeRequestKey();
      }
    }
    this.conflictNeedsRefresh.set(false);
    this.reviewError.set('');
  }

  isMotorized(vehicle: RentalVehicle): boolean {
    return vehicle.requires_driving_license ?? (vehicle.vehicle_type === 'bike');
  }

  categoryLabel(vehicle: RentalVehicle): string {
    const raw = (vehicle.vehicle_subtype || vehicle.rental?.subtype || vehicle.category || vehicle.vehicle_type || '').toLowerCase();
    if (raw === 'scooter') return 'Scooter';
    if (raw === 'motorcycle' || raw === 'bike') return 'Motorbike';
    if (raw === 'bicycle' || raw === 'electric' || vehicle.vehicle_type === 'bicycle') return 'Bicycle';
    return 'Rental';
  }

  openLoginModal(): void {
    this.authModal.open('login', undefined, {
      type: 'navigation',
      resumeCallback: () => {
        const user = this.auth.currentUser();
        if (user) {
          this.fullName.set(user.full_name);
          this.email.set(user.email);
        }
      },
    });
  }

  returnDateSriLanka(iso: string | undefined): string {
    if (!iso) return '';
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return '';
    return new Date(ms + 19_800_000).toISOString().slice(0, 10);
  }

  async continueToPayment(vehicle: RentalVehicle): Promise<void> {
    this.reviewError.set('');

    if (!this.preview() && !this.currentUser()) {
      this.reviewError.set('Please sign in with your traveler account to continue.');
      this.openLoginModal();
      return;
    }

    const checked = this.selectedDates();
    if (!checked) {
      this.editingDates.set(true);
      this.reviewError.set('Please check pickup and return dates before continuing.');
      return;
    }

    if (!this.fullName().trim() || !this.email().trim()) {
      this.reviewError.set('Enter your full name and email address.');
      return;
    }

    if (this.isMotorized(vehicle)) {
      if (!this.licenseConfirmed()) {
        this.reviewError.set('Please confirm you hold a valid motorcycle driving license.');
        return;
      }
      const expiry = this.licenseValidUntil().trim();
      const returnDate = this.returnDateSriLanka(checked.dates.return_at);
      if (!expiry) {
        this.reviewError.set('Enter your motorcycle driving license expiry date.');
        return;
      }
      if (returnDate && expiry < returnDate) {
        this.reviewError.set(`Your driving license must remain valid through at least the return date (${returnDate}).`);
        return;
      }
    }

    if (!this.termsAccepted()) {
      this.reviewError.set('Please accept the rental requirements and cancellation terms to continue.');
      return;
    }

    if (!this.preview()) {
      this.revalidating.set(true);
      try {
        const qty = checked.quantity ?? 1;
        const freshQuote = await firstValueFrom(this.api.quote(vehicle.id, checked.dates, qty));
        if (!freshQuote.is_available || (freshQuote.available_quantity !== undefined && freshQuote.available_quantity < qty)) {
          this.reviewError.set('Selected vehicle quantity is no longer available for these dates. Choose another interval.');
          this.editingDates.set(true);
          return;
        }
        const prevTotal = checked.totalPrice;
        this.selectedDates.set({
          ...checked,
          days: freshQuote.duration_days ?? checked.days,
          hours: freshQuote.duration_hours ?? checked.hours,
          quantity: freshQuote.quantity ?? qty,
          totalPrice: freshQuote.total_price,
          rate: freshQuote.rate,
          availableQuantity: freshQuote.available_quantity,
          requiresDrivingLicense: freshQuote.requires_driving_license,
        });
        if (prevTotal && prevTotal !== freshQuote.total_price) {
          this.bookingRequestKey = makeRequestKey();
          this.reviewError.set(`Rental quote updated to ${formatLkr(freshQuote.total_price)}. Review the updated total and click Continue to Payment.`);
          return;
        }
      } catch (err: unknown) {
        const detail = (err as { error?: { detail?: string } })?.error?.detail;
        this.reviewError.set(detail || 'Could not verify availability and pricing. Please recheck dates.');
        return;
      } finally {
        this.revalidating.set(false);
      }
    }

    this.step.set('payment');
  }

  backToReview(): void {
    this.paymentError.set('');
    this.conflictNeedsRefresh.set(false);
    this.step.set('review');
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
    this.paymentError.set('');
  }

  refreshAfterConflict(): void {
    this.conflictNeedsRefresh.set(false);
    this.paymentError.set('');
    this.bookingRequestKey = makeRequestKey();
    this.editingDates.set(true);
    this.step.set('review');
  }

  async submitBooking(vehicle: RentalVehicle): Promise<void> {
    const checked = this.selectedDates();
    if (!checked || this.submitting()) return;

    const qty = checked.quantity ?? 1;

    if (this.preview()) {
      const ownerId = this.currentUser()?.id ?? 0;
      const simulated = this.previewStore.simulate(ownerId, vehicle, checked.dates, checked.days);
      const nowIso = new Date().toISOString();
      const total = previewEstimate(vehicle.price_per_day, checked.days) * qty;
      this.previewReference.set(simulated.reference);
      this.createdBooking.set({
        id: 0,
        booking_reference: simulated.reference,
        listing_id: vehicle.id,
        traveler_id: ownerId,
        request_key: this.bookingRequestKey,
        status: 'pending',
        starts_at: checked.dates.pickup_at,
        ends_at: checked.dates.return_at,
        quantity: qty,
        total_amount: total.toFixed(2),
        currency: 'LKR',
        created_at: nowIso,
      });
      this.completedPayment.set({
        id: 0,
        booking_id: 0,
        request_key: this.paymentRequestKey,
        attempt_no: 1,
        method: this.paymentMethod() === 'online' ? 'simulated' : 'at_location',
        status: this.paymentMethod() === 'online' && this.simulateOutcome() === 'success' ? 'demo_succeeded' : 'unpaid',
        display_amount: total.toFixed(2),
        currency: 'LKR',
        created_at: nowIso,
        resolved_at: nowIso,
      });
      this.step.set('confirmation');
      return;
    }

    if (!this.currentUser()) {
      this.openLoginModal();
      return;
    }

    this.submitting.set(true);
    this.paymentError.set('');
    this.conflictNeedsRefresh.set(false);

    try {
      let booking = this.createdBooking();
      if (!booking) {
        const motorized = this.isMotorized(vehicle);
        const payload = {
          listing_id: vehicle.id,
          starts_at: checked.dates.pickup_at,
          ends_at: checked.dates.return_at,
          quantity: qty,
          ...(checked.totalPrice ? { expected_total: checked.totalPrice } : {}),
          request_key: this.bookingRequestKey,
          ...(motorized
            ? {
                motorcycle_license_confirmed: this.licenseConfirmed(),
                license_valid_until: this.licenseValidUntil().trim(),
              }
            : {}),
        };

        booking = await firstValueFrom(this.api.createMvpBooking(payload));
        this.createdBooking.set(booking);
      }

      const attempt = this.paymentAttempt();
      this.paymentAttempt.set(attempt + 1);
      const payKey = makeRequestKey();
      this.paymentRequestKey = payKey;

      const payment = await firstValueFrom(
        this.paymentMethod() === 'online'
          ? this.api.simulateMvpPayment(booking.id, payKey, attempt, this.simulateOutcome())
          : this.api.payAtLocationMvp(booking.id, payKey),
      );

      this.completedPayment.set(payment);

      if (this.paymentMethod() === 'online' && payment.status.toLowerCase().includes('fail')) {
        this.paymentError.set(
          'Simulated online payment failed. You can retry Academic Demo payment or switch to Pay at Location using your existing reservation.',
        );
        return;
      }

      this.step.set('confirmation');
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { detail?: string | Array<{ msg?: string }> } };
      const rawDetail = httpErr?.error?.detail;
      const detail = Array.isArray(rawDetail)
        ? rawDetail.map((d) => d.msg).filter(Boolean).join('; ')
        : rawDetail;

      if (httpErr?.status === 409 && !this.createdBooking()) {
        this.conflictNeedsRefresh.set(true);
        this.paymentError.set(
          detail || 'Availability or rental price changed. Return to Booking Details to refresh your quote.',
        );
      } else {
        this.paymentError.set(
          detail || 'Unable to complete the booking request right now. Please try again or choose Pay at Location.',
        );
      }
    } finally {
      this.submitting.set(false);
    }
  }

  switchToPayAtLocation(vehicle: RentalVehicle): void {
    this.paymentMethod.set('at_location');
    void this.submitBooking(vehicle);
  }

  formatTimestamp(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return d.toLocaleString('en-LK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Colombo',
    });
  }

  paymentMethodDisplay(): string {
    return this.paymentMethod() === 'online' ? 'Online Payment — Academic Demo' : 'Pay at Location';
  }

  paymentStatusDisplay(): string {
    const raw = (this.completedPayment()?.status || '').toLowerCase();
    if (raw === 'paid' || raw === 'paid_demo' || raw === 'demo_succeeded' || raw === 'succeeded') {
      return 'Paid (Academic Demo)';
    }
    return 'Unpaid';
  }
}
