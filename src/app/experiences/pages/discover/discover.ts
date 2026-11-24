import { Component, computed, DestroyRef, inject, signal, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, Sort } from '../../models/catalog';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { TravelerHeader } from '../../components/traveler-header';
import { CategoryNav } from '../../components/category-nav';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { WishlistState } from '../../services/wishlist-state';
import { DiscoverViewState } from '../../services/discover-view-state';
import { LiveCatalog } from './live-catalog';
import { Pagination } from '../../components/pagination';

@Component({
  imports: [ReactiveFormsModule, TravelerHeader, CategoryNav, ExperienceCard, ExperienceIcon, Pagination, LiveCatalog],
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
  private readonly wishlist = inject(WishlistState);
  readonly favoriteIds = this.wishlist.previewIds;
  readonly page = signal(1);
  readonly filtersOpen = signal(false);
  readonly searched = signal(false);
  readonly pageSize = 8;

  readonly searchForm = new FormGroup({
    location: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    date: new FormControl('', { nonNullable: true }),
    travelers: new FormControl<number | null>(1, [
      Validators.required, Validators.min(1), Validators.max(20), Validators.pattern(/^\d+$/),
    ]),
  });

  readonly results = computed(() => {
    const term = this.location();
    const category = this.category();
    const rating = this.minimumRating();
    const results = this.catalog.experiences.filter(experience =>
      (!term || experience.location.toLowerCase().includes(term)) &&
      (category === 'all' || experience.category === category) &&
      (experience.rating ?? 0) >= rating,
    );

    switch (this.sort()) {
      case 'rating': return results.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
      case 'price-low': return results.sort((left, right) => left.price - right.price);
      case 'price-high': return results.sort((left, right) => right.price - left.price);
      default: return results;
    }
  });

  readonly totalPages = computed(() => Math.ceil(this.results().length / this.pageSize));
  readonly visibleResults = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.results().slice(start, start + this.pageSize);
  });

  constructor() {
    if (!this.catalog.preview) return;
    const view = inject(DiscoverViewState);
    const saved = view.preview;
    if (saved) {
      this.category.set(saved.category);
      this.location.set(saved.location);
      this.sort.set(saved.sort);
      this.minimumRating.set(saved.rating);
      this.page.set(saved.page);
      this.filtersOpen.set(saved.filtersOpen);
      this.searched.set(saved.searched);
      this.searchForm.setValue(saved.form);
    }
    inject(DestroyRef).onDestroy(() => view.preview = {
      category: this.category(), location: this.location(), sort: this.sort(), rating: this.minimumRating(),
      page: this.page(), filtersOpen: this.filtersOpen(), searched: this.searched(), form: this.searchForm.getRawValue(),
    });
  }

  search(): void {
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;
    this.location.set(this.searchForm.controls.location.value.trim().toLowerCase());
    this.searched.set(true);
    this.page.set(1);
  }

  selectCategory(category: Category): void {
    this.category.set(category);
    this.page.set(1);
  }

  changeSort(sort: string): void {
    if (sort !== 'popular' && sort !== 'rating' && sort !== 'price-low' && sort !== 'price-high') return;
    this.sort.set(sort);
    this.page.set(1);
  }

  changeRating(rating: string): void {
    this.minimumRating.set(Number(rating));
    this.page.set(1);
  }

  toggleFavorite(id: string): void {
    this.wishlist.togglePreview(id);
  }

  reset(): void {
    this.searchForm.reset({ location: '', date: '', travelers: 1 });
    this.location.set('');
    this.searched.set(false);
    this.minimumRating.set(0);
    this.changeSort('popular');
    this.selectCategory('all');
  }
}
