import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { LocationPickerComponent } from '../shared/components/location-picker/location-picker.component';
import { RentalApi } from './rental-api';
import { CheckedRentalDates, RentalDatePicker } from './rental-date-picker';
import { RentalReviews, RentalVehicle, formatLkr } from './rental-models';
import { previewVehicle, rentalPreviewEnabled } from './rental-preview';
import { RentalWishlist } from './rental-wishlist';

type VehicleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; vehicle: RentalVehicle };

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; available: boolean };

type ReviewsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: RentalReviews };

@Component({
  selector: 'app-rental-details',
  imports: [RouterLink, RentalWishlist, RentalDatePicker, LocationPickerComponent],
  templateUrl: './rental-details.html',
  styleUrl: './rental-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RentalApi);

  private readonly retryVehicle$ = new Subject<void>();
  private readonly retryAvailability$ = new Subject<void>();
  private readonly retryReviews$ = new Subject<void>();

  readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly preview = computed(() => rentalPreviewEnabled && this.params().get('preview') === '1');

  readonly selectedDates = signal<CheckedRentalDates | null>(null);
  readonly shareNotice = signal('');
  readonly lightboxIndex = signal<number | null>(null);

  readonly vehicleId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('id')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('id')) },
  );

  readonly vehicleState = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, qParams]) => {
        const id = Number(params.get('id'));
        const isPreview = rentalPreviewEnabled && qParams.get('preview') === '1';
        if (!Number.isInteger(id) || id <= 0) {
          return of<VehicleState>({ status: 'error', message: 'Invalid vehicle reference.' });
        }
        return this.retryVehicle$.pipe(
          startWith(undefined),
          switchMap(() => {
            if (isPreview) {
              const found = previewVehicle(id);
              return of<VehicleState>(
                found
                  ? { status: 'ready', vehicle: found }
                  : { status: 'error', message: 'Preview vehicle not found.' },
              );
            }
            return this.api.detail(id).pipe(
              map((vehicle): VehicleState => ({ status: 'ready', vehicle })),
              startWith<VehicleState>({ status: 'loading' }),
              catchError((err: { status?: number; error?: { detail?: string } }) =>
                of<VehicleState>({
                  status: 'error',
                  message:
                    err?.status === 401 || err?.status === 403
                      ? 'The vehicle server denied access to these public details.'
                      : err?.error?.detail || 'We could not load this vehicle right now.',
                }),
              ),
            );
          }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as VehicleState },
  );

  readonly availabilityState = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, qParams]) => {
        const id = Number(params.get('id'));
        const isPreview = rentalPreviewEnabled && qParams.get('preview') === '1';
        const pickup = qParams.get('pickup') ?? '';
        const dropoff = qParams.get('dropoff') ?? qParams.get('return') ?? '';
        if (!Number.isInteger(id) || id <= 0) {
          return of<AvailabilityState>({ status: 'idle' });
        }
        if (!pickup || !dropoff) {
          return of<AvailabilityState>({ status: 'idle' });
        }
        return this.retryAvailability$.pipe(
          startWith(undefined),
          switchMap(() => {
            if (isPreview) {
              return of<AvailabilityState>({ status: 'ready', available: true });
            }
            return this.api.availability(id, pickup, dropoff).pipe(
              map((res): AvailabilityState => ({ status: 'ready', available: res.is_available })),
              startWith<AvailabilityState>({ status: 'loading' }),
              catchError(() => of<AvailabilityState>({ status: 'error' })),
            );
          }),
        );
      }),
    ),
    { initialValue: { status: 'idle' } as AvailabilityState },
  );

  readonly reviewsState = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, qParams]) => {
        const id = Number(params.get('id'));
        const isPreview = rentalPreviewEnabled && qParams.get('preview') === '1';
        if (!Number.isInteger(id) || id <= 0) {
          return of<ReviewsState>({ status: 'error' });
        }
        return this.retryReviews$.pipe(
          startWith(undefined),
          switchMap(() => {
            if (isPreview) {
              return of<ReviewsState>({
                status: 'ready',
                data: { items: [], total: 0, average_rating: 0 },
              });
            }
            return this.api.reviews(id).pipe(
              map((data): ReviewsState => ({ status: 'ready', data })),
              startWith<ReviewsState>({ status: 'loading' }),
              catchError(() => of<ReviewsState>({ status: 'error' })),
            );
          }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as ReviewsState },
  );

  readonly formatLkr = formatLkr;

  galleryPhotos(vehicle: RentalVehicle): string[] {
    const raw = [
      vehicle.primary_image_url,
      ...(vehicle.images ?? []).map((img) => img.image_url),
    ];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of raw) {
      const clean = item?.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
      }
    }
    return out;
  }

  categoryLabel(vehicle: RentalVehicle): string {
    const raw = (vehicle.vehicle_subtype || vehicle.rental?.subtype || vehicle.category || vehicle.vehicle_type || '').toLowerCase();
    if (raw === 'scooter') return 'Scooter';
    if (raw === 'motorcycle' || raw === 'bike') return 'Motorbike';
    if (raw === 'city' || raw === 'mountain' || raw === 'road' || raw === 'hybrid') {
      return `${raw.charAt(0).toUpperCase() + raw.slice(1)} Bicycle`;
    }
    if (raw === 'bicycle' || raw === 'electric' || vehicle.vehicle_type === 'bicycle') return 'Bicycle';
    return 'Rental Vehicle';
  }

  isMotorized(vehicle: RentalVehicle): boolean {
    return vehicle.requires_driving_license ?? (vehicle.vehicle_type === 'bike');
  }

  pickupCoordinates(vehicle: RentalVehicle): { lat: number; lng: number } | null {
    const rawLat = vehicle.location?.latitude ?? vehicle.latitude;
    const rawLng = vehicle.location?.longitude ?? vehicle.longitude;
    if (rawLat === null || rawLat === undefined || rawLat === '' || rawLng === null || rawLng === undefined || rawLng === '') {
      return null;
    }
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  bookingQueryParams(vehicle: RentalVehicle): Record<string, string | number> {
    const out: Record<string, string | number> = {};
    if (this.preview()) out['preview'] = '1';
    const checked = this.selectedDates();
    if (checked) {
      out['pickup_at'] = checked.dates.pickup_at;
      out['return_at'] = checked.dates.return_at;
      out['days'] = checked.days;
      out['hours'] = checked.hours;
      out['quantity'] = checked.quantity ?? 1;
      if (checked.totalPrice) out['total'] = checked.totalPrice;
    } else {
      const q = this.params();
      if (q.get('pickup')) out['pickup'] = q.get('pickup')!;
      if (q.get('dropoff') ?? q.get('return')) out['dropoff'] = (q.get('dropoff') ?? q.get('return'))!;
    }
    if (!out['days'] && vehicle.price_per_day) {
      out['days'] = 1;
    }
    return out;
  }

  retryVehicle(): void {
    this.retryVehicle$.next();
  }

  retryAvailability(): void {
    this.retryVehicle$.next();
    this.retryAvailability$.next();
    this.retryReviews$.next();
  }

  retryReviews(): void {
    this.retryVehicle$.next();
    this.retryReviews$.next();
    this.retryAvailability$.next();
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  stepLightbox(delta: number, total: number): void {
    const current = this.lightboxIndex();
    if (current === null || total <= 0) return;
    this.lightboxIndex.set((current + delta + total) % total);
  }

  async shareVehicle(vehicle: RentalVehicle): Promise<void> {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: vehicle.vehicle_name, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        this.shareNotice.set('Link copied');
        setTimeout(() => this.shareNotice.set(''), 2500);
        return;
      }
    } catch {
      // Fallback notice below
    }
    this.shareNotice.set('Ready to share');
    setTimeout(() => this.shareNotice.set(''), 2500);
  }
}
