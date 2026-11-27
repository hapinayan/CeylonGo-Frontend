import { RecommendationService } from '../../../../recommendations/recommendation.service';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ArtisanFilterParams,
  ArtisanListingSummary,
} from '../../models/artisan.models';
import { ArtisanService, CANONICAL_ARTISAN_CATEGORIES } from '../../services/artisan.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import { ALL_SRI_LANKAN_DISTRICTS } from '../../fixtures/artisan-test-fixtures';
import { ArtisanCardComponent } from '../../../../shared/components/artisan-card/artisan-card.component';
import { CategoryBarComponent } from '../../../../shared/components/category-bar/category-bar.component';

@Component({
  selector: 'app-artisan-discovery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoryBarComponent,
    ArtisanCardComponent,
  ],
  templateUrl: './artisan-discovery.component.html',
  styleUrl: './artisan-discovery.component.scss',
})
export class ArtisanDiscoveryComponent implements OnInit {
  private readonly recommendations = inject(RecommendationService);
  private readonly artisanService = inject(ArtisanService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navService = inject(ArtisanNavigationService);

  // Filter & Search state
  readonly searchLocation = signal<string>('');
  readonly selectedCategory = signal<string | null>(null);
  readonly selectedDistrict = signal<string | null>(null);
  readonly selectedSort = signal<string>('newest');
  readonly maxPrice = signal<number | null>(null);
  readonly showFiltersModal = signal<boolean>(false);

  // Draft values inside filters modal
  draftCategory: string | null = null;
  draftDistrict: string | null = null;
  draftMaxPrice: number | null = null;

  // Pagination state
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(12);
  readonly totalItems = signal<number>(0);

  // Data & loading state
  readonly listings = signal<ArtisanListingSummary[]>([]);
  readonly categories = signal<string[]>([...CANONICAL_ARTISAN_CATEGORIES]);
  readonly districts = signal<string[]>(ALL_SRI_LANKAN_DISTRICTS);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedDistrict()) count++;
    if (this.selectedCategory()) count++;
    if (this.maxPrice() != null) count++;
    if (this.selectedSort() !== 'newest') count++;
    return count;
  });

  readonly hasActiveFilters = computed(() => {
    return (
      this.searchLocation().trim().length > 0 ||
      this.selectedDistrict() !== null ||
      this.selectedCategory() !== null ||
      this.maxPrice() !== null ||
      this.selectedSort() !== 'newest'
    );
  });

  readonly displayedCount = computed(() => this.totalItems());

  readonly totalPages = computed(() => {
    const total = this.totalItems();
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  ngOnInit(): void {
    this.loadFilterMetadata();
    this.route.queryParams.subscribe((params) => {
      this.searchLocation.set(params['search'] ?? '');
      this.selectedCategory.set(params['category'] ?? null);
      this.selectedDistrict.set(params['district'] ?? null);
      this.selectedSort.set(params['sort'] || 'newest');
      const parsedPrice = params['max_price'] ? Number(params['max_price']) : null;
      this.maxPrice.set(parsedPrice && Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null);
      this.currentPage.set(Math.max(1, parseInt(params['page'], 10) || 1));

      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      this.navService.recordDiscoveryState(params, scrollY);
      this.fetchListings();
    });
  }

  private loadFilterMetadata(): void {
    this.artisanService.getCategories?.().subscribe({
      next: (cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          this.categories.set([...new Set([...CANONICAL_ARTISAN_CATEGORIES, ...cats])]);
        }
      },
      error: () => {},
    });

    this.artisanService.getDistricts?.().subscribe({
      next: (dists) => {
        if (Array.isArray(dists) && dists.length > 0) {
          this.districts.set([...new Set([...ALL_SRI_LANKAN_DISTRICTS, ...dists])]);
        }
      },
      error: () => {},
    });
  }

  fetchListings(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    const filters: ArtisanFilterParams = {
      search: this.searchLocation(),
      category: this.selectedCategory(),
      district: this.selectedDistrict(),
      sort_by: this.selectedSort(),
      max_price: this.maxPrice(),
      page: this.currentPage(),
      page_size: this.pageSize(),
    };

    this.artisanService.getListings(filters).subscribe({
      next: (res) => {
        if (res && Array.isArray(res.items)) {
          this.listings.set(res.items);
          this.totalItems.set(res.total);
        } else {
          this.listings.set([]);
          this.totalItems.set(0);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.errorMessage.set(
          'Unable to connect to the Artisan service. Check your connection and try again.'
        );
        this.listings.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
      },
    });
  }

  onSearchSubmit(): void {
    this.recommendations.search({ category: 'artisan', search_query: this.searchLocation(),
      district: this.selectedDistrict() ?? undefined });
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  onCategorySelected(category: string | null): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSort.set(val || 'newest');
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  openFiltersModal(): void {
    this.draftCategory = this.selectedCategory();
    this.draftDistrict = this.selectedDistrict();
    this.draftMaxPrice = this.maxPrice();
    this.showFiltersModal.set(true);
  }

  closeFiltersModal(): void {
    this.showFiltersModal.set(false);
  }

  applyModalFilters(): void {
    this.recommendations.search({ category: 'artisan', search_query: this.searchLocation(),
      district: this.draftDistrict ?? undefined });
    this.selectedCategory.set(this.draftCategory);
    this.selectedDistrict.set(this.draftDistrict);
    this.maxPrice.set(
      this.draftMaxPrice != null && Number(this.draftMaxPrice) > 0
        ? Number(this.draftMaxPrice)
        : null
    );
    this.currentPage.set(1);
    this.showFiltersModal.set(false);
    this.syncQueryParams();
  }

  clearAllFilters(): void {
    this.searchLocation.set('');
    this.selectedCategory.set(null);
    this.selectedDistrict.set(null);
    this.selectedSort.set('newest');
    this.maxPrice.set(null);
    this.draftCategory = null;
    this.draftDistrict = null;
    this.draftMaxPrice = null;
    this.currentPage.set(1);
    this.showFiltersModal.set(false);
    this.syncQueryParams();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.syncQueryParams();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      if (!pages.includes(total)) pages.push(total);
    }
    return pages;
  }

  private syncQueryParams(): void {
    const qp: Record<string, string | number> = {};
    if (this.searchLocation().trim()) qp['search'] = this.searchLocation().trim();
    if (this.selectedCategory()) qp['category'] = this.selectedCategory()!;
    if (this.selectedDistrict()) qp['district'] = this.selectedDistrict()!;
    if (this.selectedSort() !== 'newest') qp['sort'] = this.selectedSort();
    if (this.maxPrice() != null) qp['max_price'] = this.maxPrice()!;
    if (this.currentPage() > 1) qp['page'] = this.currentPage();

    this.navService.recordDiscoveryState(qp, typeof window !== 'undefined' ? window.scrollY : 0);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
    });
  }
}
