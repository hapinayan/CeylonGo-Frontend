import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AVAILABLE_LANGUAGES,
  MOCK_TOUR_GUIDES,
  POPULAR_LOCATIONS,
  TOUR_GUIDE_CATEGORIES
} from '../mock/tour-guides.mock';
import {
  BackendTourGuideItem,
  BackendTourGuidePaginationResponse,
  TourCategory,
  TourGuide,
  TourGuideFilter,
  TourGuideSortBy,
  TravelerNotification
} from '../models/tour-guide.models';

const FAVORITES_STORAGE_KEY = 'ceylongo_favorite_guides';

@Injectable({
  providedIn: 'root'
})
export class TourGuideService {
  private readonly http = inject(HttpClient);

  // CONFIGURATION & MODE
  readonly apiMode = signal<'mock' | 'live'>(
    environment.features?.tourGuidesApiMode || 'mock'
  );
  readonly isDemoMode = computed(() => this.apiMode() === 'mock');

  // ASYNC & ERROR STATE SIGNALS
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // PRE-DEFINED CATEGORIES, LOCATIONS & LANGUAGES
  readonly categories: TourCategory[] = TOUR_GUIDE_CATEGORIES;
  readonly popularLocations: string[] = POPULAR_LOCATIONS;
  readonly availableLanguages: string[] = AVAILABLE_LANGUAGES;

  // RAW DATASET SIGNAL (Separated from mock file)
  readonly allGuides = signal<TourGuide[]>(MOCK_TOUR_GUIDES);
  readonly selectedGuide = signal<TourGuide | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8); // 8 cards per page as displayed in design

  readonly filter = signal<TourGuideFilter>({
    query: '',
    location: '',
    date: null,
    travelers: 1,
    categoryId: 'all',
    sortBy: 'top_rated',
    languages: [],
    minPrice: null,
    maxPrice: null,
    verifiedOnly: false
  });

  // WISHLIST SIGNALS WITH LOCALSTORAGE PERSISTENCE
  private readonly favoritesSignal = signal<Set<string>>(this.loadFavoritesFromStorage());
  readonly favorites = this.favoritesSignal.asReadonly();

  readonly notifications = signal<TravelerNotification[]>([
    {
      id: 'n1',
      title: 'Booking Confirmed',
      message: 'Chaminda Perera accepted your Kandy Cultural Tour request.',
      time: '10 min ago',
      read: false,
      type: 'booking'
    },
    {
      id: 'n2',
      title: 'Guide Available',
      message: 'New verified guide added for Ella & Horton Plains.',
      time: '2 hours ago',
      read: false,
      type: 'system'
    },
    {
      id: 'n3',
      title: 'Special Promo',
      message: 'Enjoy 10% off Nature & Hiking guided tours this weekend.',
      time: 'Yesterday',
      read: true,
      type: 'message'
    }
  ]);

  // COMPUTED PROPERTIES
  readonly filteredGuides = computed(() => {
    const list = this.allGuides();
    const f = this.filter();
    const favs = this.favoritesSignal();

    return list
      .map(guide => ({
        ...guide,
        isFavorite: favs.has(guide.id)
      }))
      .filter(guide => {
        // Category Filter
        if (f.categoryId && f.categoryId !== 'all') {
          if (!guide.categoryIds.includes(f.categoryId)) {
            return false;
          }
        }

        // Location Filter
        if (f.location && f.location !== 'All Locations') {
          const locLower = f.location.toLowerCase();
          const guideLocLower = guide.location.toLowerCase();
          if (!guideLocLower.includes(locLower) && !locLower.includes(guideLocLower)) {
            return false;
          }
        }

        // Text Search Query
        if (f.query && f.query.trim().length > 0) {
          const q = f.query.toLowerCase().trim();
          const matchName = guide.name.toLowerCase().includes(q);
          const matchLoc = guide.location.toLowerCase().includes(q);
          const matchLangs = guide.languages.some(l => l.toLowerCase().includes(q));
          const matchHeadline = guide.headline?.toLowerCase().includes(q) ?? false;
          if (!matchName && !matchLoc && !matchLangs && !matchHeadline) {
            return false;
          }
        }

        // Languages Filter
        if (f.languages.length > 0) {
          const hasLang = f.languages.some(reqLang => guide.languages.includes(reqLang));
          if (!hasLang) {
            return false;
          }
        }

        // Price Filter
        if (f.minPrice !== null && guide.pricePerDay < f.minPrice) {
          return false;
        }
        if (f.maxPrice !== null && guide.pricePerDay > f.maxPrice) {
          return false;
        }

        // Verified Only Filter
        if (f.verifiedOnly && !guide.verified) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (f.sortBy) {
          case 'top_rated':
            if (a.featuredRank && b.featuredRank) {
              return a.featuredRank - b.featuredRank;
            }
            if (a.featuredRank) return -1;
            if (b.featuredRank) return 1;
            return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
          case 'price_asc':
            return a.pricePerDay - b.pricePerDay;
          case 'price_desc':
            return b.pricePerDay - a.pricePerDay;
          case 'experience':
            return b.experienceYears - a.experienceYears;
          default:
            return 0;
        }
      });
  });

  readonly totalCount = computed(() => this.filteredGuides().length);

  readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  readonly paginatedGuides = computed(() => {
    const guides = this.filteredGuides();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return guides.slice(start, start + size);
  });

  readonly favoritesCount = computed(() => this.favoritesSignal().size);

  readonly unreadNotificationsCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  /**
   * Loads guides based on explicit mode configuration.
   * If 'live' mode is configured, calls backend API. If the call fails,
   * surfaces the error message explicitly — NEVER silently masks failures with mock data.
   */
  loadGuides(simulateAsync = false): void {
    this.errorMessage.set(null);

    if (this.apiMode() === 'live') {
      this.isLoading.set(true);
      // Future live API integration path
      this.http
        .get<BackendTourGuidePaginationResponse>(`${environment.apiBaseUrl}/tour-guides`)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            const msg =
              error.status === 404
                ? 'Tour Guide API endpoint is currently unavailable on the backend (404 Not Found).'
                : error.message || 'Failed to load tour guides from backend.';
            this.errorMessage.set(msg);
            this.isLoading.set(false);
            return of(null);
          })
        )
        .subscribe(response => {
          this.isLoading.set(false);
          if (response && response.items) {
            this.allGuides.set(response.items.map(this.mapBackendItemToTourGuide));
          }
        });
    } else {
      // Explicit Mock/Demo Mode
      if (simulateAsync) {
        this.isLoading.set(true);
        setTimeout(() => {
          this.allGuides.set(MOCK_TOUR_GUIDES);
          this.isLoading.set(false);
        }, 150);
      } else {
        this.allGuides.set(MOCK_TOUR_GUIDES);
        this.isLoading.set(false);
      }
    }
  }

  // ACTIONS
  setCategory(categoryId: string): void {
    this.filter.update(f => ({ ...f, categoryId }));
    this.currentPage.set(1);
  }

  setSearchQuery(query: string): void {
    this.filter.update(f => ({ ...f, query }));
    this.currentPage.set(1);
  }

  setLocation(location: string): void {
    this.filter.update(f => ({ ...f, location }));
    this.currentPage.set(1);
  }

  setDate(date: string | null): void {
    this.filter.update(f => ({ ...f, date }));
  }

  setTravelers(travelers: number): void {
    this.filter.update(f => ({ ...f, travelers: Math.max(1, travelers) }));
  }

  setSortBy(sortBy: TourGuideSortBy): void {
    this.filter.update(f => ({ ...f, sortBy }));
    this.currentPage.set(1);
  }

  updateFilter(partial: Partial<TourGuideFilter>): void {
    this.filter.update(f => ({ ...f, ...partial }));
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.filter.set({
      query: '',
      location: '',
      date: null,
      travelers: 1,
      categoryId: 'all',
      sortBy: 'top_rated',
      languages: [],
      minPrice: null,
      maxPrice: null,
      verifiedOnly: false
    });
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  toggleFavorite(guideId: string): void {
    this.favoritesSignal.update(set => {
      const next = new Set(set);
      if (next.has(guideId)) {
        next.delete(guideId);
      } else {
        next.add(guideId);
      }
      this.saveFavoritesToStorage(next);
      return next;
    });
  }

  isFavorite(guideId: string): boolean {
    return this.favoritesSignal().has(guideId);
  }

  selectGuide(guide: TourGuide | null): void {
    this.selectedGuide.set(guide);
  }

  markNotificationAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllNotificationsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  private loadFavoritesFromStorage(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set(['guide-1', 'guide-4']);
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // Fallback
    }
    return new Set(['guide-1', 'guide-4']);
  }

  private saveFavoritesToStorage(favs: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favs)));
    } catch {
      // Ignore
    }
  }

  /**
   * Data Normalization Adapter
   * Converts proposed snake_case backend items into frontend TourGuide domain model.
   */
  private mapBackendItemToTourGuide(item: BackendTourGuideItem): TourGuide {
    return {
      id: String(item.id),
      name: item.full_name,
      avatarUrl: item.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: item.cover_image_url || '/images/sigiriya.jpg',
      verified: item.is_verified,
      rating: item.rating,
      reviewsCount: item.reviews_count,
      experienceYears: item.experience_years,
      languages: item.languages || ['English'],
      pricePerDay: item.price_per_day,
      currency: item.currency || 'LKR',
      location: item.city ? `${item.city}, ${item.district}` : item.district,
      categoryIds: item.category_ids || [],
      headline: item.headline,
      about: item.about,
      specialties: item.specialties,
      phone: item.phone,
      email: item.email
    };
  }
}
