import { DecimalPipe, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { RentalApi } from './rental-api';
import { CheckedRentalDates, RentalDatePicker } from './rental-date-picker';
import { RentalImage } from './rental-image';
import { RentalReviews, RentalVehicle, isBike, rentalDateError } from './rental-models';
import { previewVehicle, rentalPreviewEnabled } from './rental-preview';
import { RentalWishlist } from './rental-wishlist';

type Details =
  | { kind: 'loading' | 'missing' }
  | { kind: 'error'; status: number }
  | { kind: 'ready'; vehicle: RentalVehicle; preview: boolean; reviews: RentalReviews | null;
      available: boolean | null; requestedDates: boolean };

@Component({
  imports: [RouterLink, DecimalPipe, RentalImage, RentalWishlist, RentalDatePicker],
  templateUrl: './rental-details.html',
  styleUrl: './rental-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RentalApi);
  private readonly viewport = inject(ViewportScroller);
  private readonly retryRequest = new Subject<void>();
  readonly search = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly checked = linkedSignal<CheckedRentalDates | null>(() => { this.params(); this.search(); return null; });
  readonly shareMessage = signal('');
  readonly shareUrl = signal('');

  readonly state = toSignal(combineLatest([this.route.paramMap, this.route.queryParamMap, this.retryRequest.pipe(startWith(undefined))]).pipe(
    switchMap(([params, search]) => {
      const id = Number(params.get('id'));
      if (!Number.isSafeInteger(id) || id < 1) return of<Details>({ kind: 'missing' });
      if (rentalPreviewEnabled && search.get('preview') === '1') {
        const vehicle = previewVehicle(id);
        return of<Details>(vehicle ? { kind: 'ready', vehicle, preview: true, reviews: null, available: null, requestedDates: false } : { kind: 'missing' });
      }
      const pickup = search.get('pickup') ?? '';
      const dropoff = search.get('return') ?? '';
      const requestedDates = !!pickup && !rentalDateError(pickup, dropoff);
      return this.api.detail(id).pipe(
        switchMap(vehicle => !isBike(vehicle) ? of<Details>({ kind: 'missing' }) : forkJoin({
          reviews: this.api.reviews(id).pipe(catchError(() => of(null))),
          availability: requestedDates ? this.api.availability(id, pickup, dropoff).pipe(catchError(() => of(null))) : of(null),
        }).pipe(map(({ reviews, availability }): Details => ({
          kind: 'ready', vehicle, preview: false, reviews, requestedDates, available: availability?.is_available ?? null,
        })))),
        startWith({ kind: 'loading' } as Details),
        catchError(error => of<Details>(error.status === 404 ? { kind: 'missing' } : { kind: 'error', status: error.status })),
      );
    }),
  ), { initialValue: { kind: 'loading' } as Details });

  constructor() {
    afterNextRender(() => this.viewport.scrollToPosition([0, 0]));
  }

  retry(): void { this.retryRequest.next(); }

  async share(vehicle: RentalVehicle, preview: boolean): Promise<void> {
    const url = new URL('/bicycles/' + vehicle.id, window.location.origin);
    if (preview) url.searchParams.set('preview', '1');
    this.shareMessage.set('');
    this.shareUrl.set('');
    try {
      await navigator.clipboard.writeText(url.href);
      this.shareMessage.set('Vehicle link copied.');
    } catch {
      this.shareUrl.set(url.href);
      this.shareMessage.set('Copy the vehicle link below.');
    }
  }

  category(vehicle: RentalVehicle): string {
    switch (vehicle.category) {
      case 'scooter': return 'Scooter';
      case 'motorcycle': return 'Motorcycle';
      case 'electric': return 'Electric bicycle (sample)';
      default: return vehicle.vehicle_type === 'bike' ? 'Motorbike' : 'Bicycle';
    }
  }
}
