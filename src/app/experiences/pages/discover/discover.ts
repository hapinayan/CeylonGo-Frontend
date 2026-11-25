import { ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { categories, Category, Sort } from '../../models/catalog';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { TravelerHeader } from '../../components/traveler-header';
import { CategoryNav } from '../../components/category-nav';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { WishlistState } from '../../services/wishlist-state';
import { DiscoverViewState } from '../../services/discover-view-state';
import { LiveCatalog } from './live-catalog';
import { Pagination } from '../../components/pagination';
import { Footer } from '../../../shared/components/footer/footer';

@Component({
  imports: [
    ReactiveFormsModule,
    TravelerHeader,
    CategoryNav,
    ExperienceCard,
    ExperienceIcon,
    Pagination,
    LiveCatalog,
    Footer,
  ],
  templateUrl: './discover.html',
  styleUrl: './discover.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Discover {
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly category = signal<Category>('all');
  readonly location = signal('');
  readonly sort = signal<Sort>('popular');
  readonly minimumRating = signal(0);
  private readonly view = inject(DiscoverViewState);
  private readonly viewport = inject(ViewportScroller);
  private readonly wishlist = inject(WishlistState);
  readonly favoriteIds = this.wishlist.previewIds;
  readonly page = signal(1);
  readonly filtersOpen = signal(false);
  readonly searched = signal(false);
  readonly pageSize = 8;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchForm = new FormGroup({
    location: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    date: new FormControl('', { nonNullable: true }),
    travelers: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(20),
      Validators.pattern(/^\d+$/),
    ]),
  });

  readonly results = computed(() => {
    const term = this.location();
    const category = this.category();
    const rating = this.minimumRating();
    const results = this.catalog.experiences.filter(
      (experience) =>
        (!term || experience.location.toLowerCase().includes(term)) &&
        (category === 'all' || experience.category === category) &&
        (experience.rating ?? 0) >= rating
    );

    switch (this.sort()) {
      case 'rating':
        return results.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
      case 'price-low':
        return results.sort((left, right) => left.price - right.price);
      case 'price-high':
        return results.sort((left, right) => right.price - left.price);
      default:
        return results;
    }
  });

  readonly totalPages = computed(() => Math.ceil(this.results().length / this.pageSize));
  readonly visibleResults = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.results().slice(start, start + this.pageSize);
  });

  constructor() {
    // Listen to query parameters for category selection (supports direct links, back navigation, refresh)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const catParam = params.get('category') as Category | null;
        if (catParam && categories.some((c) => c.id === catParam)) {
          this.category.set(catParam);
          this.page.set(1);
        } else if (params.has('category') && (!catParam || catParam === 'all')) {
          this.category.set('all');
          this.page.set(1);
        }
      });

    if (!this.catalog.preview) return;
    const view = this.view;
    const lastScroll = view.captureScroll();
    const saved = view.preview;
    if (saved) {
      if (!this.route.snapshot.queryParamMap.has('category')) {
        this.category.set(saved.category);
      }
      this.location.set(saved.location);
      this.sort.set(saved.sort);
      this.minimumRating.set(saved.rating);
      this.page.set(saved.page);
      this.filtersOpen.set(saved.filtersOpen);
      this.searched.set(saved.searched);
      this.searchForm.setValue(saved.form);
      if (saved.scroll[1]) {
        afterNextRender(() =>
          this.viewport.scrollToPosition(saved.scroll, { behavior: 'instant' })
        );
      }
    }
    this.destroyRef.onDestroy(() => {
      view.preview = {
        scroll: lastScroll(),
        category: this.category(),
        location: this.location(),
        sort: this.sort(),
        rating: this.minimumRating(),
        page: this.page(),
        filtersOpen: this.filtersOpen(),
        searched: this.searched(),
        form: this.searchForm.getRawValue(),
      };
    });
  }

  changePage(page: number, heading: HTMLElement): void {
    if (page === this.page()) return;
    this.page.set(page);
    this.view.revealResults(heading);
  }

  search(): void {
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;
    this.location.set(this.searchForm.controls.location.value.trim().toLowerCase());
    this.page.set(1);
    this.searched.set(true);
  }

  selectCategory(category: Category): void {
    this.category.set(category);
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === 'all' ? null : category },
      queryParamsHandling: 'merge',
    });
  }

  changeSort(value: string): void {
    if (value === 'popular' || value === 'rating' || value === 'price-low' || value === 'price-high') {
      this.sort.set(value);
      this.page.set(1);
    }
  }

  changeRating(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      this.minimumRating.set(parsed);
      this.page.set(1);
    }
  }

  reset(): void {
    this.searchForm.reset({ location: '', date: '', travelers: 1 });
    this.location.set('');
    this.category.set('all');
    this.sort.set('popular');
    this.minimumRating.set(0);
    this.page.set(1);
    this.filtersOpen.set(false);
    this.searched.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleFavorite(id: string): void {
    this.wishlist.togglePreview(id);
  }
}
