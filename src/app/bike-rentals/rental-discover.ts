import { DecimalPipe, NgTemplateOutlet, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { RentalApi } from './rental-api';
import { RentalImage } from './rental-image';
import { DEFAULT_QUERY, PRICE_RANGES, RentalCategory, RentalPage, RentalQuery, RentalSort, rentalDateError } from './rental-models';
import { rentalPreviewEnabled, previewSearch } from './rental-preview';
import { RentalScroll } from './rental.routes';
import { RentalWishlist } from './rental-wishlist';

const LIVE_CATEGORIES: readonly { value: RentalCategory; label: string; icon: string }[] = [
  { value: '', label: 'All Vehicles', icon: 'all' },
  { value: 'bike', label: 'Motorbikes', icon: 'motor' },
  { value: 'bicycle', label: 'Bicycles', icon: 'cycle' },
];
const PREVIEW_CATEGORIES = [
  LIVE_CATEGORIES[0],
  { value: 'scooter', label: 'Scooters', icon: 'motor' },
  { value: 'motorcycle', label: 'Motorcycles', icon: 'motor' },
  LIVE_CATEGORIES[2],
  { value: 'electric', label: 'Electric Bikes', icon: 'electric' },
] as const;

interface BrowseState { query: RentalQuery; preview: boolean }
type Results = { kind: 'loading' } | { kind: 'error'; status: number } | { kind: 'ready'; page: RentalPage };

function readState(params: ParamMap): BrowseState {
  const preview = rentalPreviewEnabled && params.get('preview') === '1';
  const category = params.get('type') as RentalCategory;
  const sort = params.get('sort') as RentalSort;
  const requestedPage = Number(params.get('page'));
  const pickup = params.get('pickup') ?? '';
  const dropoff = params.get('return') ?? '';
  const dateError = rentalDateError(pickup, dropoff);
  return { preview, query: {
    city: (params.get('city') ?? '').trim().slice(0, 100),
    pickup: dateError ? '' : pickup, dropoff: dateError ? '' : dropoff,
    category: (preview ? PREVIEW_CATEGORIES : LIVE_CATEGORIES).some(option => option.value === category) ? category : '',
    sort: sort === 'price_asc' || sort === 'price_desc' || (preview && (sort === 'popular' || sort === 'rating')) ? sort : 'newest',
    price: Object.hasOwn(PRICE_RANGES, params.get('price') ?? '') ? params.get('price')! : '',
    rating: preview && params.get('rating') === '1',
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  } };
}

@Component({
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, RentalImage, RentalWishlist],
  templateUrl: './rental-discover.html',
  styleUrl: './rental-discover.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalDiscover {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(RentalApi);
  private readonly scroll = inject(RentalScroll);
  private readonly viewport = inject(ViewportScroller);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly searchForm = viewChild<ElementRef<HTMLFormElement>>('searchForm');
  private readonly retryRequest = new BehaviorSubject(0);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly state = computed(() => readState(this.params()));
  readonly query = computed(() => this.state().query);
  readonly preview = computed(() => this.state().preview);
  readonly categories = computed(() => this.preview() ? PREVIEW_CATEGORIES : LIVE_CATEGORIES);
  readonly previewEnabled = rentalPreviewEnabled;
  readonly moreCities = signal(false);
  readonly cities = ['Colombo', 'Kandy', 'Galle', 'Trincomalee', 'Jaffna', 'Ella', 'Matara', 'Anuradhapura'];
  readonly prices = [
    { value: 'budget', label: 'LKR 500–1,500' },
    { value: 'mid', label: 'LKR 1,501–3,000' },
    { value: 'premium', label: 'LKR 3,001+' },
  ];
  readonly dateError = signal('');
  readonly results = toSignal(combineLatest([this.route.queryParamMap, this.retryRequest]).pipe(
    switchMap(([params]) => {
      const { query, preview } = readState(params);
      if (preview) return of<Results>({ kind: 'ready', page: previewSearch(query) });
      return this.api.search(query).pipe(
        map(page => ({ kind: 'ready', page }) as const),
        startWith({ kind: 'loading' } as const),
        catchError(error => of({ kind: 'error', status: error.status } as const)),
      );
    }),
  ), { initialValue: { kind: 'loading' } as Results });

  constructor() {
    effect(() => {
      if (this.results().kind !== 'loading' && this.scroll.position) {
        const position = this.scroll.position;
        this.scroll.position = 0;
        requestAnimationFrame(() => {
          if (this.host.nativeElement.isConnected) this.viewport.scrollToPosition([0, position]);
        });
      }
    });
  }

  search(event: Event, city: string, pickup: string, dropoff: string, category: string): void {
    event.preventDefault();
    const error = rentalDateError(pickup, dropoff);
    this.dateError.set(error);
    if (!error) this.update({ city: city.trim(), pickup, dropoff, category: category as RentalCategory });
  }

  update(change: Partial<RentalQuery>): void {
    this.dateError.set('');
    this.navigate({ ...this.query(), page: 1, ...change }, this.preview());
  }

  sortBy(sort: string): void {
    this.update({ sort: sort as RentalSort });
  }

  clear(): void {
    this.searchForm()?.nativeElement.reset();
    this.dateError.set('');
    this.navigate(DEFAULT_QUERY, this.preview());
  }

  changeMode(): void {
    this.searchForm()?.nativeElement.reset();
    this.dateError.set('');
    this.navigate(DEFAULT_QUERY, !this.preview());
  }

  retry(): void {
    this.retryRequest.next(this.retryRequest.value + 1);
  }

  rememberScroll(): void {
    this.scroll.position = this.viewport.getScrollPosition()[1];
  }

  private navigate(query: RentalQuery, preview: boolean): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {
      preview: preview ? '1' : null, city: query.city || null, pickup: query.pickup || null,
      return: query.dropoff || null, type: query.category || null, price: query.price || null,
      rating: query.rating ? '1' : null, sort: query.sort === 'newest' ? null : query.sort,
      page: query.page > 1 ? query.page : null,
    } });
  }
}
