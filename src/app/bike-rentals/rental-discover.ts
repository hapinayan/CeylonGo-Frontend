import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { RentalApi } from './rental-api';
import { RentalImage } from './rental-image';
import {
  PAGE_SIZE,
  PRICE_RANGES,
  RENTAL_CITIES,
  RentalCategory,
  RentalPage,
  RentalQuery,
  RentalSort,
  RentalVehicle,
  formatLkr,
  rentalDateError,
} from './rental-models';
import { previewSearch, rentalPreviewEnabled } from './rental-preview';
import { RentalWishlist } from './rental-wishlist';

interface CategoryTile {
  readonly id: '' | 'scooter' | 'motorcycle' | 'bicycle';
  readonly label: string;
  readonly icon: 'grid' | 'scooter' | 'motorcycle' | 'bicycle';
}

const CATEGORY_TILES: readonly CategoryTile[] = [
  { id: '', label: 'All Vehicles', icon: 'grid' },
  { id: 'scooter', label: 'Scooters', icon: 'scooter' },
  { id: 'motorcycle', label: 'Motorbikes', icon: 'motorcycle' },
  { id: 'bicycle', label: 'Bicycles', icon: 'bicycle' },
];

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: readonly RentalVehicle[]; total: number; pages: number };

const SORTS = new Set(['newest', 'price_asc', 'price_desc', 'rating', 'popular']);
const CATEGORIES = new Set(['', 'scooter', 'motorcycle', 'bicycle', 'electric', 'bike']);
const PRICES = new Set(['', 'budget', 'mid', 'premium']);

function cleanCategory(value: string | null): RentalCategory {
  if (!value) return '';
  return CATEGORIES.has(value) ? (value as RentalCategory) : '';
}

function queryFrom(params: ParamMap): RentalQuery {
  const page = Number(params.get('page'));
  const sort = params.get('sort') ?? '';
  const price = params.get('price') ?? '';
  return {
    city: params.get('city')?.trim() ?? '',
    category: cleanCategory(params.get('category') ?? params.get('type')),
    pickup: params.get('pickup') ?? '',
    dropoff: params.get('dropoff') ?? params.get('return') ?? '',
    sort: SORTS.has(sort) ? (sort as RentalSort) : 'newest',
    price: PRICES.has(price) ? price : '',
    rating: params.get('rating') === '4',
    transmission: params.get('transmission')?.trim() ?? '',
    availableOnly: params.get('available') === '1',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

@Component({
  selector: 'app-rental-discover',
  imports: [FormsModule, RouterLink, RentalWishlist, RentalImage],
  templateUrl: './rental-discover.html',
  styleUrl: './rental-discover.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalDiscover {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(RentalApi);
  private readonly retries = new Subject<void>();

  readonly categories = CATEGORY_TILES;
  readonly cities = RENTAL_CITIES;
  readonly priceRanges = Object.entries(PRICE_RANGES);
  readonly minDate = new Date().toISOString().slice(0, 10);

  readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly preview = computed(() => rentalPreviewEnabled && this.params().get('preview') === '1');
  readonly query = computed(() => queryFrom(this.params()));

  readonly cityInput = signal('');
  readonly pickupInput = signal('');
  readonly dropoffInput = signal('');
  readonly dateError = signal('');

  readonly filtersOpen = signal(false);
  readonly draftCity = signal('');
  readonly draftCategory = signal<RentalCategory>('');
  readonly draftPrice = signal('');
  readonly draftTransmission = signal('');
  readonly draftAvailableOnly = signal(false);

  private readonly refresh$ = this.retries.pipe(startWith(undefined));
  private readonly result = toSignal(
    this.route.queryParamMap.pipe(
      switchMap((params) => {
        const current = queryFrom(params);
        this.syncInputs(current);
        return this.refresh$.pipe(
          switchMap(() => {
            if (rentalPreviewEnabled && params.get('preview') === '1') {
              const page = previewSearch(current);
              return of<LoadState>({ status: 'ready', ...page });
            }
            return this.api.search(current).pipe(
              map((page: RentalPage): LoadState => ({
                status: 'ready',
                items: page.items,
                total: page.total,
                pages: page.pages || Math.ceil(page.total / PAGE_SIZE),
              })),
              startWith<LoadState>({ status: 'loading' }),
              catchError((err: { status?: number; error?: { detail?: string } }) =>
                of<LoadState>({
                  status: 'error',
                  message:
                    err?.status === 401 || err?.status === 403
                      ? 'The rental catalog server denied access to the public catalog.'
                      : err?.error?.detail || 'We could not reach the rental catalog service. Please try again.',
                }),
              ),
            );
          }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as LoadState },
  );

  readonly state = this.result;

  readonly hasActiveFilters = computed(() => {
    const q = this.query();
    return !!(
      q.city ||
      q.category ||
      q.pickup ||
      q.dropoff ||
      q.price ||
      q.rating ||
      q.transmission ||
      q.availableOnly ||
      q.sort !== 'newest'
    );
  });

  readonly activeFilterCount = computed(() => {
    const q = this.query();
    let count = 0;
    if (q.city) count++;
    if (q.category) count++;
    if (q.price) count++;
    if (q.transmission) count++;
    if (q.availableOnly) count++;
    if (q.rating) count++;
    return count;
  });

  readonly countLabel = computed(() => {
    const s = this.state();
    if (s.status !== 'ready') return 'Rentals';
    return `${s.total} ${s.total === 1 ? 'Rental' : 'Rentals'} Found`;
  });

  readonly formatLkr = formatLkr;

  private syncInputs(q: RentalQuery): void {
    this.cityInput.set(q.city);
    this.pickupInput.set(q.pickup);
    this.dropoffInput.set(q.dropoff);
    this.dateError.set('');
  }

  searchVehicles(event?: Event, cityRaw?: string, pickupRaw?: string, dropoffRaw?: string): void {
    event?.preventDefault();
    const cityVal = cityRaw ?? this.cityInput();
    const pickupVal = pickupRaw ?? this.pickupInput();
    const dropoffVal = dropoffRaw ?? this.dropoffInput();
    this.cityInput.set(cityVal);
    this.pickupInput.set(pickupVal);
    this.dropoffInput.set(dropoffVal);

    const err = rentalDateError(pickupVal, dropoffVal);
    if (err) {
      this.dateError.set(err);
      return;
    }
    this.dateError.set('');
    this.navigate({
      city: cityVal.trim() || null,
      pickup: pickupVal || null,
      dropoff: dropoffVal || null,
      return: null,
      page: null,
    });
  }

  selectCategory(category: RentalCategory): void {
    this.navigate({ category: category || null, type: null, page: null });
  }

  setSort(sort: string): void {
    this.navigate({ sort: SORTS.has(sort) && sort !== 'newest' ? sort : null, page: null });
  }

  openFilters(): void {
    const q = this.query();
    this.draftCity.set(q.city);
    this.draftCategory.set(q.category);
    this.draftPrice.set(q.price);
    this.draftTransmission.set(q.transmission ?? '');
    this.draftAvailableOnly.set(!!q.availableOnly);
    this.filtersOpen.set(true);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  applyFilters(): void {
    this.filtersOpen.set(false);
    this.navigate({
      city: this.draftCity().trim() || null,
      category: this.draftCategory() || null,
      price: this.draftPrice() || null,
      transmission: this.draftTransmission() || null,
      available: this.draftAvailableOnly() ? '1' : null,
      page: null,
    });
  }

  clearFilters(): void {
    this.cityInput.set('');
    this.pickupInput.set('');
    this.dropoffInput.set('');
    this.dateError.set('');
    this.draftCity.set('');
    this.draftCategory.set('');
    this.draftPrice.set('');
    this.draftTransmission.set('');
    this.draftAvailableOnly.set(false);
    this.filtersOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.preview() ? { preview: '1' } : {},
    });
  }

  goToPage(page: number): void {
    this.navigate({ page: page > 1 ? String(page) : null });
  }

  retry(): void {
    this.retries.next();
  }

  categoryLabel(vehicle: RentalVehicle): string {
    const raw = (vehicle.vehicle_subtype || vehicle.rental?.subtype || vehicle.category || vehicle.vehicle_type || '').toLowerCase();
    if (raw === 'scooter') return 'Scooter';
    if (raw === 'motorcycle' || raw === 'bike') return 'Motorbike';
    if (raw === 'bicycle' || raw === 'electric' || vehicle.vehicle_type === 'bicycle') {
      return raw === 'city' || raw === 'mountain' || raw === 'road' || raw === 'hybrid'
        ? `${raw.charAt(0).toUpperCase() + raw.slice(1)} Bicycle`
        : 'Bicycle';
    }
    return 'Rental';
  }

  specsSummary(vehicle: RentalVehicle): string {
    const parts: string[] = [];
    const transmission = vehicle.rental?.transmission ?? vehicle.transmission;
    const seating = vehicle.rental?.seating_capacity ?? vehicle.seating_capacity;
    if (transmission) {
      parts.push(transmission.replace('_', ' '));
    }
    if (seating) {
      parts.push(`${seating} ${seating === 1 ? 'seat' : 'seats'}`);
    }
    if (vehicle.district || vehicle.city) {
      parts.push(vehicle.district || vehicle.city || '');
    }
    return parts.filter(Boolean).slice(0, 3).join(' · ') || this.categoryLabel(vehicle);
  }

  private navigate(changes: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
    });
  }
}
