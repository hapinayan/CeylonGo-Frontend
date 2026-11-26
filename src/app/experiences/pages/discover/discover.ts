import { ViewportScroller } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { CategoryNav } from '../../components/category-nav';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { Pagination } from '../../components/pagination';
import { ActivityDiscoverQuery } from '../../models/activity';
import { Category, Experience, normalizeCategory, Sort } from '../../models/catalog';
import { ActivitiesApi, extractApiErrorMessage, toActivityCard } from '../../services/activities-api';
import { DiscoverViewState } from '../../services/discover-view-state';
import { WishlistState } from '../../services/wishlist-state';
import { publishDate } from '../../services/workflow-state';

type ResultsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: Experience[]; nextOffset: number | null };

@Component({
  imports: [
    ReactiveFormsModule,
    CategoryNav,
    ExperienceCard,
    ExperienceIcon,
    Pagination,
  ],
  templateUrl: './discover.html',
  styleUrl: './discover.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Discover {
  private readonly api = inject(ActivitiesApi);
  private readonly view = inject(DiscoverViewState);
  private readonly viewport = inject(ViewportScroller);
  readonly wishlist = inject(WishlistState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly todaySriLanka = publishDate();
  readonly maxSriLanka = publishDate(365);
  readonly pageSize = 8;

  readonly category = signal<Category>('all');
  readonly destination = signal('');
  readonly date = signal('');
  readonly participants = signal<number | null>(null);
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);
  readonly sort = signal<Sort>('newest');
  readonly page = signal(1);
  readonly offset = signal(0);
  readonly offsetHistory = signal<number[]>([0]);
  readonly filtersOpen = signal(false);
  readonly priceError = signal('');
  private readonly refresh = signal(0);

  readonly searchForm = new FormGroup({
    location: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    date: new FormControl('', { nonNullable: true }),
    travelers: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(1000),
      Validators.pattern(/^\d+$/),
    ]),
  });

  readonly filterForm = new FormGroup({
    minPrice: new FormControl<number | null>(null, [Validators.min(0)]),
    maxPrice: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  readonly hasActiveFilters = computed(
    () =>
      this.category() !== 'all' ||
      !!this.destination() ||
      !!this.date() ||
      this.participants() != null ||
      this.minPrice() != null ||
      this.maxPrice() != null,
  );

  private readonly query = computed(
    (): ActivityDiscoverQuery & { refresh: number } => {
      const cat = this.category();
      return {
        destination: this.destination() || undefined,
        category: cat === 'all' ? undefined : cat,
        date: this.date() || undefined,
        participants: this.participants() ?? undefined,
        min_price: this.minPrice() ?? undefined,
        max_price: this.maxPrice() ?? undefined,
        sort: this.sort(),
        limit: this.pageSize,
        offset: this.offset(),
        refresh: this.refresh(),
      };
    },
  );

  readonly resultsState = toSignal(
    toObservable(this.query).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(({ refresh: _refresh, ...params }) =>
        this.api.discover(params).pipe(
          map(
            (response): ResultsState => ({
              status: 'ready',
              items: (response.items ?? []).map(toActivityCard),
              nextOffset: response.next_offset ?? null,
            }),
          ),
          startWith({ status: 'loading' } as ResultsState),
          catchError((err) =>
            of<ResultsState>({
              status: 'error',
              message: extractApiErrorMessage(err, 'Could not load experiences. Please try again.'),
            }),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ResultsState },
  );

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params.has('category')) {
          const normalized = normalizeCategory(params.get('category'));
          if (normalized !== this.category()) {
            this.category.set(normalized);
            this.resetPagination();
          }
        }
        const destParam = params.get('destination') ?? params.get('location');
        if (destParam !== null && destParam.trim() !== this.destination()) {
          this.searchForm.controls.location.setValue(destParam.trim());
          this.destination.set(destParam.trim());
          this.resetPagination();
        }
      });

    const view = this.view;
    const lastScroll = view.captureScroll();
    const saved = view.live;
    if (saved) {
      if (!this.route.snapshot.queryParamMap.has('category')) {
        this.category.set(saved.category);
      }
      if (!this.route.snapshot.queryParamMap.has('destination') && !this.route.snapshot.queryParamMap.has('location')) {
        this.destination.set(saved.destination);
        this.searchForm.controls.location.setValue(saved.destination);
      }
      this.date.set(saved.date);
      this.searchForm.controls.date.setValue(saved.date);
      this.participants.set(saved.participants);
      this.searchForm.controls.travelers.setValue(saved.participants);
      this.minPrice.set(saved.minPrice);
      this.maxPrice.set(saved.maxPrice);
      this.filterForm.setValue({ minPrice: saved.minPrice, maxPrice: saved.maxPrice });
      this.sort.set(saved.sort);
      this.page.set(saved.page);
      this.offset.set(saved.offset);
      this.offsetHistory.set(saved.offsetHistory.length ? saved.offsetHistory : [0]);
      this.filtersOpen.set(saved.filtersOpen);

      let restore = saved.scroll[1] > 0;
      afterRenderEffect(() => {
        if (restore && this.resultsState().status === 'ready') {
          restore = false;
          this.viewport.scrollToPosition(saved.scroll, { behavior: 'instant' });
        }
      });
    }

    this.destroyRef.onDestroy(() => {
      view.live = {
        scroll: lastScroll(),
        category: this.category(),
        destination: this.destination(),
        date: this.date(),
        participants: this.participants(),
        minPrice: this.minPrice(),
        maxPrice: this.maxPrice(),
        sort: this.sort(),
        page: this.page(),
        offset: this.offset(),
        offsetHistory: this.offsetHistory(),
        filtersOpen: this.filtersOpen(),
      };
    });
  }

  private resetPagination(): void {
    this.page.set(1);
    this.offset.set(0);
    this.offsetHistory.set([0]);
  }

  search(): void {
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;

    const rawLocation = this.searchForm.controls.location.value.trim();
    const rawDate = this.searchForm.controls.date.value.trim();
    const rawTravelers = this.searchForm.controls.travelers.value;

    this.destination.set(rawLocation);
    this.date.set(rawDate);
    this.participants.set(rawTravelers != null && Number.isInteger(rawTravelers) ? rawTravelers : null);
    this.resetPagination();
  }

  selectCategory(category: Category): void {
    if (this.category() === category) return;
    this.category.set(category);
    this.resetPagination();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === 'all' ? null : category },
      queryParamsHandling: 'merge',
    });
  }

  changeSort(value: string): void {
    if (value === 'newest' || value === 'price_asc' || value === 'price_desc' || value === 'title') {
      this.sort.set(value);
      this.resetPagination();
    }
  }

  applyPriceFilters(): void {
    this.filterForm.markAllAsTouched();
    const { minPrice, maxPrice } = this.filterForm.getRawValue();
    if (
      this.filterForm.invalid ||
      (minPrice != null && minPrice < 0) ||
      (maxPrice != null && maxPrice < 0) ||
      (minPrice != null && maxPrice != null && minPrice > maxPrice)
    ) {
      this.priceError.set(
        'Enter non-negative LKR prices where the minimum does not exceed the maximum.',
      );
      return;
    }
    this.priceError.set('');
    this.minPrice.set(minPrice ?? null);
    this.maxPrice.set(maxPrice ?? null);
    this.resetPagination();
  }

  changePage(nextPage: number, heading: HTMLElement): void {
    if (nextPage === this.page() || nextPage < 1) return;
    const state = this.resultsState();
    if (nextPage > this.page()) {
      if (state.status !== 'ready' || state.nextOffset == null) return;
      this.offsetHistory.update((history) => [...history, state.nextOffset!]);
      this.offset.set(state.nextOffset);
      this.page.set(nextPage);
    } else {
      const history = this.offsetHistory();
      const targetOffset = history[nextPage - 1] ?? 0;
      this.offsetHistory.set(history.slice(0, nextPage));
      this.offset.set(targetOffset);
      this.page.set(nextPage);
    }
    this.view.revealResults(heading);
  }

  retry(): void {
    this.refresh.update((v) => v + 1);
  }

  reset(): void {
    this.searchForm.reset({ location: '', date: '', travelers: null });
    this.filterForm.reset({ minPrice: null, maxPrice: null });
    this.priceError.set('');
    this.destination.set('');
    this.date.set('');
    this.participants.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.category.set('all');
    this.sort.set('newest');
    this.filtersOpen.set(false);
    this.resetPagination();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null, destination: null, location: null },
      queryParamsHandling: 'merge',
    });
  }
}
