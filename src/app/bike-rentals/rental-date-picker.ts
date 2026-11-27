import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, defer, map, merge, of, startWith, switchMap, takeWhile, timer } from 'rxjs';
import { RentalApi, RentalQuote } from './rental-api';
import { RentalDates, dateWindow, previewBlockedDay, previewDateAvailable, sriLankaDate } from './rental-dates';

export interface CheckedRentalDates {
  dates: RentalDates;
  days: number;
  hours: number;
  quantity?: number;
  totalPrice?: string;
  rate?: string;
  availableQuantity?: number;
  requiresDrivingLicense?: boolean;
}

type QuoteState =
  | { kind: 'idle' | 'loading' | 'unavailable' | 'error' | 'elapsed' }
  | { kind: 'ready'; price: RentalQuote };

function pickupDeadline(pickup: number): Observable<QuoteState> {
  return defer(() => {
    const remaining = pickup - Date.now();
    if (remaining <= 0) return of({ kind: 'elapsed' } as const);
    // Browser timers have a signed 32-bit delay limit.
    return timer(Math.min(remaining, 2_147_483_647)).pipe(switchMap(() => pickupDeadline(pickup)));
  });
}

function quoteInstant(timestamp: string): number {
  // The backend normalizes timestamps to UTC and may serialize them without an offset.
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp) ? timestamp : timestamp + 'Z');
}

@Component({
  imports: [DecimalPipe],
  selector: 'app-rental-date-picker',
  templateUrl: './rental-date-picker.html',
  styleUrl: './rental-date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalDatePicker {
  private readonly api = inject(RentalApi);
  private readonly checks = new Subject<CheckedRentalDates | null>();
  readonly id = input.required<number>();
  readonly preview = input(false);
  readonly pickupDate = input('');
  readonly returnDate = input('');
  readonly initialDates = input<RentalDates | null>(null);
  readonly initialQuantity = input(1);
  readonly showQuantity = input(false);
  readonly checked = output<CheckedRentalDates | null>();
  readonly today = sriLankaDate(Date.now());
  readonly blocked = previewBlockedDay();
  readonly pickup = linkedSignal(() => this.initialDates()?.pickup_at.slice(0, 10) ?? this.pickupDate());
  readonly dropoff = linkedSignal(() => this.initialDates()?.return_at.slice(0, 10) ?? this.returnDate());
  readonly pickupTime = linkedSignal(() => this.initialDates()?.pickup_at.slice(11, 16) ?? '09:00');
  readonly dropoffTime = linkedSignal(() => this.initialDates()?.return_at.slice(11, 16) ?? '09:00');
  readonly quantity = linkedSignal(() => Math.max(1, Math.min(20, this.initialQuantity() || 1)));
  readonly busy = signal(false);
  readonly error = signal('');
  readonly quoteState = signal<QuoteState>({ kind: 'idle' });
  readonly result = signal<CheckedRentalDates | null>(null);
  readonly duration = computed(() => dateWindow(this.pickup(), this.pickupTime(), this.dropoff(), this.dropoffTime()));

  constructor() {
    this.checks.pipe(switchMap(window => {
      if (!window) return of({ window: null, error: '' });
      if (this.preview()) {
        return of(previewDateAvailable(window.dates)
          ? { window: { ...window, quantity: this.quantity() }, error: '' }
          : { window: null, error: 'These dates overlap the sample maintenance day. Choose another interval.' });
      }
      const qty = this.quantity();
      return this.api.validateDates(this.id(), window.dates, qty).pipe(
        map(response => response.is_valid
          ? { window: { dates: window.dates, days: response.duration_days, hours: response.duration_hours, quantity: qty }, error: '' }
          : { window: null, error: response.collision_type === 'maintenance' ? 'Maintenance overlaps the selected dates.' :
            response.collision_type === 'booked' ? 'This vehicle is already booked during the selected dates.' :
              response.error_message || 'The vehicle is unavailable for the selected dates.' }),
        catchError(error => of({ window: null, error: error.status === 401 || error.status === 403
          ? 'The rental service denied this availability check. Try again.'
          : error?.error?.detail || 'Availability couldn’t be checked. Try again.' })),
      );
    }), switchMap(({ window, error }) => {
      this.busy.set(false);
      this.error.set(error);
      this.result.set(window);
      this.checked.emit(window);
      if (!window || this.preview()) return EMPTY;
      const id = this.id();
      const qty = window.quantity ?? 1;
      const pickup = Date.parse(window.dates.pickup_at);
      const dropoff = Date.parse(window.dates.return_at);
      const quote = this.api.quote(id, window.dates, qty).pipe(
        map((price): QuoteState => price.vehicle_id === id && quoteInstant(price.pickup_at) === pickup &&
          quoteInstant(price.return_at) === dropoff
          ? { kind: 'ready', price } : { kind: 'unavailable' }),
        catchError(error => of<QuoteState>({ kind: error.status === 404 ? 'unavailable' : 'error' })),
        startWith({ kind: 'loading' } as const),
      );
      // Subscribe to the deadline first so a check that arrives after pickup does not request pricing.
      return merge(pickupDeadline(pickup), quote).pipe(takeWhile(state => state.kind !== 'elapsed', true));
    }), takeUntilDestroyed()).subscribe(state => {
      this.quoteState.set(state);
      if (state.kind === 'ready') {
        const current = this.result();
        if (current) {
          const enriched: CheckedRentalDates = {
            ...current,
            quantity: state.price.quantity ?? current.quantity ?? 1,
            days: state.price.duration_days ?? current.days,
            hours: state.price.duration_hours ?? current.hours,
            totalPrice: state.price.total_price,
            rate: state.price.rate,
            availableQuantity: state.price.available_quantity,
            requiresDrivingLicense: state.price.requires_driving_license,
          };
          this.result.set(enriched);
          this.checked.emit(enriched);
        }
      }
      if (state.kind === 'elapsed') {
        this.result.set(null);
        this.checked.emit(null);
      }
    });
  }

  edited(): void {
    this.checks.next(null);
    this.quoteState.set({ kind: 'idle' });
  }

  check(event: Event): void {
    event.preventDefault();
    this.edited();
    const window = dateWindow(this.pickup(), this.pickupTime(), this.dropoff(), this.dropoffTime());
    if (!window.dates) {
      this.error.set(window.error);
      return;
    }
    this.busy.set(true);
    this.checks.next(window);
  }
}
