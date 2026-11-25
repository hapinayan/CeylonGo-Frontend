import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ArtisanFilterParams,
  ArtisanListingSummary,
} from '../../models/artisan.models';
import { ArtisanService } from '../../services/artisan.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import {
  ALL_SRI_LANKAN_DISTRICTS,
  VERIFIED_ARTISAN_SUMMARIES,
} from '../../fixtures/artisan-test-fixtures';
import { ArtisanCardComponent } from '../../../../shared/components/artisan-card/artisan-card.component';
import { CategoryBarComponent } from '../../../../shared/components/category-bar/category-bar.component';
import { TravelerNavbarComponent } from '../../../../shared/components/traveler-navbar/traveler-navbar.component';

@Component({
  selector: 'app-artisan-discovery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TravelerNavbarComponent,
    CategoryBarComponent,
    ArtisanCardComponent,
  ],
  templateUrl: './artisan-discovery.component.html',
  styleUrl: './artisan-discovery.component.scss',
})
export class ArtisanDiscoveryComponent implements OnInit {
  private readonly artisanService = inject(ArtisanService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navService = inject(ArtisanNavigationService);

  // Filter & Search state
  readonly searchLocation = signal<string>('');
  readonly selectedCategory = signal<string | null>(null);
  readonly selectedDistrict = signal<string | null>(null);
  readonly selectedSort = signal<string>('popular'); // 'popular' | 'rating' | 'newest'
  readonly showFiltersDrawer = signal<boolean>(false);
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly districtSearch = signal<string>('');

  // Pagination state
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(12);
  readonly totalItems = signal<number>(0);

  // Data & loading state
  readonly listings = signal<ArtisanListingSummary[]>([]);
  // Category options matching the approved canonical backend categories
  readonly categories = signal<string[]>([
    'Handicrafts',
    'Pottery & Ceramics',
    'Batik & Textiles',
    'Woodcarving & Masks',
    'Jewelry & Gem Craft',
    'Brass & Metalware',
    'Handmade & Weaving',
    'Spices & Herbal Products',
    'Local Products',
  ]);
  // All 25 official Sri Lankan districts
  readonly districts = signal<string[]>(ALL_SRI_LANKAN_DISTRICTS);
  readonly isLoading = signal<boolean>(true);
  readonly isFixtureMode = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly filteredDistricts = computed(() => {
    const q = this.districtSearch().trim().toLowerCase();
    if (!q) return this.districts();
    return this.districts().filter((d) => d.toLowerCase().includes(q));
  });

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedDistrict()) count++;
    if (this.selectedCategory()) count++;
    if (this.selectedSort() !== 'popular') count++;
    return count;
  });

  readonly hasActiveFilters = computed(() => {
    return (
      this.selectedDistrict() !== null ||
      this.selectedCategory() !== null ||
      this.selectedSort() !== 'popular'
    );
  });

  readonly queryParams = computed(() => {
    return this.isFixtureMode() ? { demo: 'true' } : {};
  });

  /**
   * Computed canonical dropdown value that keeps the <select> in lockstep with the active tab.
   * Prevents blank dropdown selection when tabs like Pottery, Handmade, or Jewellery are clicked.
   */
  readonly selectedCategoryDropdown = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return null;
    const lower = cat.trim().toLowerCase();
    if (lower === 'pottery' || lower === 'pottery & ceramics') return 'Pottery & Ceramics';
    if (lower === 'handmade' || lower === 'handmade & weaving' || lower === 'handloom & weaving') return 'Handmade & Weaving';
    if (lower === 'jewellery' || lower === 'jewelry' || lower === 'jewelry & gem craft' || lower === 'jewellery & gem craft') return 'Jewelry & Gem Craft';
    if (lower === 'woodcarving & masks') return 'Woodcarving & Masks';
    if (lower === 'brass & metalware') return 'Brass & Metalware';
    if (lower === 'spices & herbal products') return 'Spices & Herbal Products';
    if (lower === 'local products') return 'Local Products';
    if (lower === 'batik & textiles' || lower === 'batik') return 'Batik & Textiles';
    if (lower === 'handicrafts') return 'Handicrafts';
    return cat;
  });

  readonly displayedCount = computed(() => {
    if (this.isFixtureMode()) {
      return this.filteredListings().length;
    }
    return this.totalItems();
  });

  readonly totalPages = computed(() => {
    const total = this.isFixtureMode() ? this.filteredListings().length : this.totalItems();
    return Math.ceil(total / this.pageSize()) || 1;
  });

  readonly paginatedListings = computed(() => {
    if (!this.isFixtureMode()) {
      // Live mode is paginated by backend
      return this.filteredListings();
    }
    const filtered = this.filteredListings();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  readonly filteredListings = computed(() => {
    let list = [...this.listings()];
    const search = this.searchLocation().trim().toLowerCase();
    const cat = this.selectedCategory()?.trim().toLowerCase();
    const dist = this.selectedDistrict();
    const sort = this.selectedSort();

    if (search) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.city.toLowerCase().includes(search) ||
          item.district.toLowerCase().includes(search) ||
          item.craft_category.toLowerCase().includes(search)
      );
    }

    if (cat) {
      list = list.filter((item) => {
        const itemCat = item.craft_category.toLowerCase();
        if (cat === 'handicrafts') {
          return (
            itemCat.includes('handicraft') ||
            itemCat.includes('woodcarv') ||
            itemCat.includes('brass') ||
            itemCat.includes('mask')
          );
        }
        if (cat === 'pottery' || cat === 'pottery & ceramics') {
          return itemCat.includes('pottery') || itemCat.includes('ceramic');
        }
        if (cat === 'batik & textiles' || cat === 'batik') {
          return itemCat.includes('batik') || itemCat.includes('textile');
        }
        if (
          cat === 'handmade' ||
          cat === 'handmade & weaving' ||
          cat === 'handloom & weaving'
        ) {
          return (
            itemCat.includes('handmade') ||
            itemCat.includes('weaving') ||
            itemCat.includes('handloom')
          );
        }
        if (
          cat === 'jewellery' ||
          cat === 'jewelry' ||
          cat === 'jewelry & gem craft' ||
          cat === 'jewellery & gem craft'
        ) {
          return itemCat.includes('jewel') || itemCat.includes('gem');
        }
        if (cat === 'woodcarving & masks') {
          return itemCat.includes('wood') || itemCat.includes('mask');
        }
        if (cat === 'brass & metalware') {
          return itemCat.includes('brass') || itemCat.includes('metal');
        }
        if (cat === 'spices & herbal products') {
          return itemCat.includes('spice') || itemCat.includes('herbal');
        }
        if (cat === 'local products') {
          return (
            itemCat.includes('local') ||
            itemCat.includes('spice') ||
            itemCat.includes('herbal')
          );
        }
        return itemCat === cat || itemCat.includes(cat);
      });
    }

    if (dist) {
      list = list.filter((item) => item.district.toLowerCase() === dist.toLowerCase());
    }

    if (sort === 'rating') {
      return list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }
    if (sort === 'newest') {
      return list.sort((a, b) => b.id - a.id);
    }
    // 'popular' defaults to featured first then review count
    return list.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (b.total_reviews || 0) - (a.total_reviews || 0);
    });
  });

  ngOnInit(): void {
    this.loadFilterOptions();

    // Sync from query params on load
    this.route.queryParams.subscribe((params) => {
      if (params['search']) this.searchLocation.set(params['search']);
      if (params['category']) this.selectedCategory.set(params['category']);
      if (params['district']) this.selectedDistrict.set(params['district']);
      if (params['sort']) this.selectedSort.set(params['sort']);
      if (params['view'] === 'list') this.viewMode.set('list');
      if (params['filters'] === 'true') this.showFiltersDrawer.set(true);
      if (params['page']) this.currentPage.set(parseInt(params['page'], 10) || 1);
      
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      this.navService.recordDiscoveryState(params, scrollY);
      this.fetchListings();

      const lastScrollY = this.navService.getLastDiscoveryScrollY();
      if (lastScrollY > 0 && typeof window !== 'undefined') {
        setTimeout(() => {
          window.scrollTo({ top: lastScrollY, behavior: 'instant' });
        }, 50);
      }
    });
  }

  loadFilterOptions(): void {
    this.artisanService.getCategories().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) this.categories.set(cats);
      },
      error: () => {},
    });
    // All 25 districts are permanent in the UI filter
    this.districts.set(ALL_SRI_LANKAN_DISTRICTS);
  }

  onDistrictDropdownChange(dist: string | null): void {
    this.selectedDistrict.set(dist);
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  private normalizeCategoryForApi(cat: string | null): string | null {
    if (!cat) return null;
    const lower = cat.trim().toLowerCase();
    if (lower === 'pottery') return 'Pottery & Ceramics';
    if (lower === 'handmade') return 'Handmade & Weaving';
    if (lower === 'jewellery' || lower === 'jewelry') return 'Jewelry & Gem Craft';
    if (lower === 'batik') return 'Batik & Textiles';
    return cat;
  }

  fetchListings(): void {
    const isDemoParam =
      this.isFixtureMode() ||
      this.route.snapshot?.queryParamMap?.get('demo') === 'true' ||
      this.route.snapshot?.queryParamMap?.get('preview') === 'true';

    if (isDemoParam) {
      this.loadVerifiedFixtures();
      this.isLoading.set(false);
      return;
    }

    // Explicit live mode when demo=true is absent
    this.isFixtureMode.set(false);
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    const filters: ArtisanFilterParams = {
      search: this.searchLocation(),
      category: this.normalizeCategoryForApi(this.selectedCategory()),
      district: this.selectedDistrict(),
      page: this.currentPage(),
      page_size: this.pageSize(),
    };

    this.artisanService.getListings(filters).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.listings.set(res.items);
          this.totalItems.set(res.total);
          this.isFixtureMode.set(false);
        } else {
          this.listings.set([]);
          this.totalItems.set(0);
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Strict Fixture Isolation: Never silently show sample data on real production API failures
        this.hasError.set(true);
        this.errorMessage.set(
          'Unable to connect to the Artisan service. Please ensure the backend is running.'
        );
        this.isFixtureMode.set(false);
        this.listings.set([]);
        this.isLoading.set(false);
      },
    });
  }

  private loadVerifiedFixtures(): void {
    this.listings.set(VERIFIED_ARTISAN_SUMMARIES);
    this.isFixtureMode.set(true);
    this.hasError.set(false);
  }

  exitDemoMode(): void {
    this.isFixtureMode.set(false);
    const qp: Record<string, string | number | null> = {};
    if (this.searchLocation()) qp['search'] = this.searchLocation();
    if (this.selectedCategory()) qp['category'] = this.selectedCategory();
    if (this.selectedDistrict()) qp['district'] = this.selectedDistrict();
    qp['demo'] = null;
    qp['preview'] = null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
    }).then(() => {
      this.fetchListings();
    });
  }

  onSearchSubmit(): void {
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  onCategoryDropdownChange(category: string | null): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  onCategoryPillSelected(pillCategory: string | null): void {
    if (!pillCategory) {
      this.selectedCategory.set(null);
    } else {
      const lower = pillCategory.trim().toLowerCase();
      if (lower === 'pottery') this.selectedCategory.set('Pottery & Ceramics');
      else if (lower === 'handmade') this.selectedCategory.set('Handmade & Weaving');
      else if (lower === 'jewellery') this.selectedCategory.set('Jewelry & Gem Craft');
      else if (lower === 'local products') this.selectedCategory.set('Local Products');
      else if (lower === 'handicrafts') this.selectedCategory.set('Handicrafts');
      else if (lower === 'batik & textiles') this.selectedCategory.set('Batik & Textiles');
      else this.selectedCategory.set(pillCategory);
    }
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  toggleDistrict(dist: string): void {
    if (this.selectedDistrict() === dist) {
      this.selectedDistrict.set(null);
    } else {
      this.selectedDistrict.set(dist);
    }
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  clearDistrict(): void {
    this.selectedDistrict.set(null);
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSort.set(val);
    this.currentPage.set(1);
    this.syncQueryParams();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.syncQueryParams();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  }

  toggleFiltersDrawer(): void {
    this.showFiltersDrawer.update((v) => !v);
  }

  clearAllFilters(): void {
    this.searchLocation.set('');
    this.selectedCategory.set(null);
    this.selectedDistrict.set(null);
    this.selectedSort.set('popular');
    this.districtSearch.set('');
    this.currentPage.set(1);
    this.showFiltersDrawer.set(false);
    this.syncQueryParams();
  }

  private syncQueryParams(): void {
    const qp: Record<string, string | number | null> = {};
    if (this.searchLocation()) qp['search'] = this.searchLocation();
    if (this.selectedCategory()) qp['category'] = this.selectedCategory();
    if (this.selectedDistrict()) qp['district'] = this.selectedDistrict();
    if (this.selectedSort() !== 'popular') qp['sort'] = this.selectedSort();
    if (this.viewMode() !== 'grid') qp['view'] = this.viewMode();
    if (this.currentPage() > 1) qp['page'] = this.currentPage();

    // Preserve demo flag across search & filter changes
    if (this.route.snapshot?.queryParamMap?.get('demo') === 'true' || this.isFixtureMode()) {
      qp['demo'] = 'true';
    }

    this.navService.recordDiscoveryState(qp, typeof window !== 'undefined' ? window.scrollY : 0);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
    });
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
}
