import { ViewportScroller } from '@angular/common';
import { afterRenderEffect, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { CategoryNav } from '../../components/category-nav';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { Pagination } from '../../components/pagination';
import { categories, Category, Experience } from '../../models/catalog';
import { DiscoverViewState } from '../../services/discover-view-state';
import { WishlistState } from '../../services/wishlist-state';
import { EcoApi } from '../../services/eco-api';

type Results =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; items: Experience[]; total: number; pages: number };

@Component({
  selector: 'app-live-experience-catalog',
  imports: [ReactiveFormsModule, CategoryNav, ExperienceCard, ExperienceIcon, Pagination],
  template: `
    <form class="experience-search" (submit)="$event.preventDefault(); submit()">
      <label class="search-field field-location">
        <div class="field-icon-circle"><app-experience-icon name="pin" /></div>
        <div class="field-text-wrap">
          <span class="field-heading">Where to?</span>
          <input type="search" [formControl]="searchInput" maxlength="100" placeholder="Search by city, meeting point or keyword">
        </div>
      </label>
      <label class="search-field field-date">
        <div class="field-icon-circle"><app-experience-icon name="calendar" /></div>
        <div class="field-text-wrap">
          <span class="field-heading">Date</span>
          <span class="search-field-hint">Availability in Details</span>
          <input type="date" aria-label="Date search unavailable" disabled hidden>
        </div>
      </label>
      <label class="search-field field-travelers">
        <div class="field-icon-circle"><app-experience-icon name="user" /></div>
        <div class="field-text-wrap">
          <span class="field-heading">Travelers</span>
          <span class="search-field-hint">Group size in Details</span>
          <input type="number" aria-label="Traveler search unavailable" disabled hidden>
        </div>
      </label>
      <button class="search-submit"><app-experience-icon name="search" /><span>Search</span></button>
    </form>
    <app-experience-categories [selected]="category()" [live]="true" (select)="selectCategory($event)" />
    <section aria-labelledby="live-experience-results">
      <div class="results-bar">
        <div class="results-count-wrap">
          @if (results(); as state) {
            @if (state.status === 'ready') {
              <div class="count-pill">
                <span class="pill-badge">{{ state.total }}</span>
                <span class="pill-text">Experiences Found</span>
              </div>
            }
          }
          <h2 #resultsHeading id="live-experience-results" tabindex="-1" aria-live="polite">
            @if (results(); as state) {
              @if (state.status === 'ready') { {{ state.total }} {{ state.total === 1 ? 'Experience' : 'Experiences' }} in Sri Lanka }
              @else { Experiences in Sri Lanka }
            }
          </h2>
        </div>
        <div class="results-controls">
          <label class="sort-control"><span class="sort-label">Sort by:</span> <select disabled><option>Default order</option></select></label>
          <button type="button" class="outline-control btn-filter" [attr.aria-expanded]="filtersOpen()" aria-controls="live-eco-filters"
            (click)="filtersOpen.set(!filtersOpen())"><app-experience-icon name="filter" /><span>Filters</span></button>
        </div>
      </div>
      @if (wishlist.error()) { <p role="alert">{{ wishlist.error() }}</p> }
      <p class="search-note">The public catalog currently lists Eco-Tourism experiences. Check availability on the listing details.</p>
      <fieldset class="filter-panel" id="live-eco-filters" [hidden]="!filtersOpen()">
        <legend>Eco-Tourism filters</legend>
        @if (categories(); as options) {
          <label>Eco category
            <select #selection [value]="ecoCategory()" (change)="setCategory(selection.value)">
              <option value="">All Eco-Tourism categories</option>
              @for (option of options; track option) { <option [value]="option">{{ option }}</option> }
            </select>
          </label>
        } @else { <p role="status">Eco category options are unavailable.</p> }
        <label><input type="checkbox" #badge [checked]="badgeOnly()" (change)="setBadge(badge.checked)"> Verified eco badge</label>
        <form class="eco-range-filters" [formGroup]="rangeForm" (ngSubmit)="applyRanges()">
          <label>District <input type="text" formControlName="district" maxlength="100"></label>
          <label>Minimum price <input type="number" formControlName="minPrice" min="0" step="any"></label>
          <label>Maximum price <input type="number" formControlName="maxPrice" min="0" step="any"></label>
          <label>Minimum hours <input type="number" formControlName="minDuration" min="0" step="any"></label>
          <label>Maximum hours <input type="number" formControlName="maxDuration" min="0" step="any"></label>
          <button class="outline-control">Apply ranges</button>
          @if (rangeError()) { <p class="form-error" role="alert">Enter nonnegative prices and positive durations. Minimum values must be at or below the maximum.</p> }
        </form>
        <button type="button" class="outline-control" (click)="reset()">Reset filters</button>
      </fieldset>
      @if (results(); as state) {
        @if (state.status === 'loading') {
          <div class="empty-results" role="status">Loading experiences…</div>
        } @else if (state.status === 'error') {
          <div class="empty-results" role="alert"><p>Could not load experiences.</p>
            <button type="button" class="outline-control" (click)="retry()">Retry</button>
          </div>
        } @else if (state.status === 'ready') {
          @if (state.items.length) {
            <div class="experience-grid">
              @for (experience of state.items; track experience.id) {
                <app-experience-card [experience]="experience" [favorite]="false" [detailLink]="true" [liveFavorite]="true" />
              }
            </div>
            <app-experience-pagination [page]="page()" [totalPages]="state.pages" (change)="changePage($event, resultsHeading)" />
          } @else {
            <div class="empty-results"><h3>No experiences match your search</h3>
              <button type="button" class="outline-control" (click)="reset()">Reset filters</button>
            </div>
          }
        }
      }
    </section>
  `,
})
export class LiveCatalog {
  private readonly view = inject(DiscoverViewState);
  private readonly viewport = inject(ViewportScroller);
  private readonly api = inject(EcoApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly wishlist = inject(WishlistState);
  readonly searchInput = new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) });
  readonly search = signal('');
  readonly category = signal<Category>('all');
  readonly ecoCategory = signal('');
  readonly badgeOnly = signal(false);
  readonly page = signal(1);
  readonly filtersOpen = signal(false);
  readonly rangeForm = new FormGroup({
    district: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    minPrice: new FormControl<number | null>(null, Validators.min(0)),
    maxPrice: new FormControl<number | null>(null, Validators.min(0)),
    minDuration: new FormControl<number | null>(null),
    maxDuration: new FormControl<number | null>(null),
  });
  readonly rangeError = signal(false);
  private readonly ranges = signal(this.rangeForm.getRawValue());
  private readonly refresh = signal(0);
  private readonly query = computed(() => ({
    search: this.search(), category: this.ecoCategory(), badgeOnly: this.badgeOnly(),
    page: this.page(), refresh: this.refresh(), ...this.ranges(),
  }));

  readonly categories = toSignal(toObservable(this.refresh).pipe(
    switchMap(() => this.api.categories().pipe(catchError(() => of(null)))),
  ), { initialValue: [] });

  readonly results = toSignal(toObservable(this.query).pipe(
    distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
    switchMap(query => this.api.browse(query).pipe(
      map(data => ({ ...data, status: 'ready' }) as Results),
      startWith({ status: 'loading' } as Results),
      catchError(() => of({ status: 'error' } as Results)),
    )),
  ), { initialValue: { status: 'loading' } as Results });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const catParam = params.get('category') as Category | null;
        if (catParam && categories.some((c) => c.id === catParam)) {
          this.category.set(catParam);
          if (catParam !== 'eco') {
            this.ecoCategory.set('');
          }
          this.page.set(1);
        } else if (params.has('category') && (!catParam || catParam === 'all')) {
          this.category.set('all');
          this.ecoCategory.set('');
          this.page.set(1);
        }
      });

    const view = this.view;
    const lastScroll = view.captureScroll();
    const saved = view.live;
    if (saved) {
      this.searchInput.setValue(saved.search);
      this.search.set(saved.search);
      if (!this.route.snapshot.queryParamMap.has('category')) {
        this.category.set(saved.category);
        this.ecoCategory.set(saved.ecoCategory);
      }
      this.badgeOnly.set(saved.badgeOnly);
      this.page.set(saved.page);
      this.filtersOpen.set(saved.filtersOpen);
      this.rangeForm.setValue(saved.ranges);
      this.ranges.set(saved.ranges);
      let restore = saved.scroll[1] > 0;
      afterRenderEffect(() => {
        const status = this.results().status;
        if (restore && status === 'ready') {
          restore = false;
          this.viewport.scrollToPosition(saved.scroll, {behavior: 'instant'});
        }
      });
    }
    this.destroyRef.onDestroy(() => view.live = {
      scroll: lastScroll(), search: this.search(), category: this.category(), ecoCategory: this.ecoCategory(), badgeOnly: this.badgeOnly(),
      page: this.page(), filtersOpen: this.filtersOpen(), ranges: this.ranges(),
    });
  }

  selectCategory(category: Category): void {
    if (this.category() === category) return;
    this.category.set(category);
    this.setCategory('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === 'all' ? null : category },
      queryParamsHandling: 'merge',
    });
  }

  changePage(page: number, heading: HTMLElement): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.view.revealResults(heading);
  }

  submit(): void {
    if (this.searchInput.invalid) return;
    this.search.set(this.searchInput.value.trim());
    this.page.set(1);
  }

  setCategory(value: string): void {
    this.ecoCategory.set(value);
    if (value) this.category.set('eco');
    this.page.set(1);
  }
  setBadge(value: boolean): void { this.badgeOnly.set(value); this.page.set(1); }
  retry(): void { this.refresh.update(value => value + 1); }

  applyRanges(): void {
    const ranges = this.rangeForm.getRawValue();
    const { minPrice, maxPrice, minDuration, maxDuration } = ranges;
    const invalid = this.rangeForm.invalid ||
      (minDuration != null && minDuration <= 0) ||
      (maxDuration != null && maxDuration <= 0) ||
      (minDuration != null && maxDuration != null && minDuration > maxDuration) ||
      (minPrice != null && maxPrice != null && minPrice > maxPrice);
    this.rangeError.set(invalid);
    if (invalid) return;
    this.ranges.set({ ...ranges, district: ranges.district.trim() });
    this.page.set(1);
  }

  reset(): void {
    this.rangeForm.reset();
    this.applyRanges();
    this.searchInput.reset();
    this.submit();
    this.category.set('all');
    this.setCategory('');
    this.setBadge(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null },
      queryParamsHandling: 'merge',
    });
  }
}
