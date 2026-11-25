import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  HomestayCategory,
  HomestayCategoryFilter,
  HomestaySearchParams,
  HomestaySummary,
} from '../../core/models/homestay.models';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import {
  HomestayService,
  NEUTRAL_HOMESTAY_PLACEHOLDER,
} from '../../core/services/homestay.service';
import { Footer } from '../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { TravelerNavbar } from '../../shared/components/traveler-navbar/traveler-navbar';
import { HomestayMapComponent } from './components/homestay-map/homestay-map.component';

@Component({
  selector: 'app-homestay-discovery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TravelerNavbar,
    Footer,
    TravelerAuthModal,
    HomestayMapComponent,
  ],
  templateUrl: './homestay-discovery.html',
  styleUrl: './homestay-discovery.scss',
})
export class HomestayDiscovery implements OnInit {
  private readonly homestayService = inject(HomestayService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('scrollRegion') scrollRegion?: ElementRef<HTMLElement>;

  readonly neutralPlaceholder = NEUTRAL_HOMESTAY_PLACEHOLDER;

  // Data Signals
  readonly homestays = signal<HomestaySummary[]>([]);
  readonly totalCount = signal<number>(0);
  readonly resultsCount = computed(() => this.homestays().length);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);
  readonly totalPages = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly categories = signal<HomestayCategoryFilter[]>([]);

  // Cursor Pagination Signals
  readonly nextBeforeId = signal<number | null>(null);
  readonly currentBeforeId = signal<number | null>(null);
  readonly beforeIdHistory = signal<(number | null)[]>([]);

  // Filter & Search Signals
  readonly selectedCategory = signal<HomestayCategory>('all');
  readonly locationQuery = signal<string>('');
  readonly checkInDate = signal<string>('');
  readonly checkOutDate = signal<string>('');
  readonly adultsCount = signal<number>(2);
  readonly childrenCount = signal<number>(0);
  readonly guestDropdownOpen = signal<boolean>(false);
  readonly userMenuOpen = signal<boolean>(false);
  readonly notificationCount = signal<number>(2);

  readonly sortBy = signal<'popular' | 'price_low' | 'price_high' | 'rating' | 'reviews'>('popular');
  readonly filterModalOpen = signal<boolean>(false);

  // Extended Filter Signals
  readonly minPrice = signal<number>(3000);
  readonly maxPrice = signal<number>(15000);
  readonly verifiedOnly = signal<boolean>(false);
  readonly selectedAmenities = signal<string[]>([]);

  // Interactive Map & Selection Signals
  readonly hoveredHomestayId = signal<number | null>(null);
  readonly selectedHomestayId = signal<number | null>(1);
  readonly mobileViewMode = signal<'list' | 'map'>('list');

  // Navigation & UI States
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Computed total guests
  readonly totalGuests = computed(() => this.adultsCount() + this.childrenCount());

  // Available Amenities list for filter drawer
  readonly availableAmenities: string[] = [
    'Wi-Fi',
    'Air Conditioning',
    'Home-Cooked Meals',
    'Mountain View',
    'Private Bathroom',
    'Free Breakfast',
    'Kitchenette',
    'Free Bicycles',
    'Fireplace',
    'Waterfront Deck',
  ];

  // Popular locations for quick suggestion pills
  readonly popularLocations: string[] = [
    'Ella',
    'Kandy',
    'Galle',
    'Mirissa',
    'Nuwara Eliya',
    'Sigiriya',
    'Bentota',
    'Haputale',
  ];

  ngOnInit(): void {
    this.categories.set(this.homestayService.getCategories());
    if (this.authService.isAuthenticated()) {
      this.homestayService.loadWishlist().subscribe();
    }
    const qLocation =
      this.route.snapshot.queryParamMap.get('location') ||
      this.route.snapshot.queryParamMap.get('query');
    if (qLocation) {
      this.locationQuery.set(qLocation);
    }
    const qCheckIn = this.route.snapshot.queryParamMap.get('check_in');
    if (qCheckIn) {
      this.checkInDate.set(qCheckIn);
    }
    const qCheckOut = this.route.snapshot.queryParamMap.get('check_out');
    if (qCheckOut) {
      this.checkOutDate.set(qCheckOut);
    }
    const qAdults = this.route.snapshot.queryParamMap.get('adults');
    if (qAdults && !isNaN(Number(qAdults))) {
      this.adultsCount.set(Math.max(1, Number(qAdults)));
    }
    const qChildren = this.route.snapshot.queryParamMap.get('children');
    if (qChildren && !isNaN(Number(qChildren))) {
      this.childrenCount.set(Math.max(0, Number(qChildren)));
    }
    const qCategory = this.route.snapshot.queryParamMap.get('category');
    if (qCategory) {
      this.selectedCategory.set(qCategory as HomestayCategory);
    }
    this.fetchHomestays();
  }

  fetchHomestays(beforeId?: number | null): void {
    this.isLoading.set(true);

    const params: HomestaySearchParams = {
      destination: this.locationQuery().trim() || undefined,
      check_in: this.checkInDate() || undefined,
      check_out: this.checkOutDate() || undefined,
      guests: this.totalGuests(),
      min_price: this.minPrice(),
      max_price: this.maxPrice(),
      amenities: this.selectedAmenities(),
      limit: 20,
      before_id: beforeId ?? undefined,
    };

    this.homestayService.getHomestays(params).subscribe({
      next: (response) => {
        this.homestays.set(response.items);
        this.totalCount.set(response.items.length);
        this.nextBeforeId.set(response.next_before_id ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.homestays.set([]);
        this.totalCount.set(0);
        this.nextBeforeId.set(null);
        this.isLoading.set(false);
      },
    });
  }

  onNextPage(): void {
    const nextId = this.nextBeforeId();
    if (nextId == null) return;
    this.beforeIdHistory.update((h) => [...h, this.currentBeforeId()]);
    this.currentBeforeId.set(nextId);
    this.fetchHomestays(nextId);
    this.scrollToTop();
  }

  onPrevPage(): void {
    const history = [...this.beforeIdHistory()];
    if (history.length === 0) return;
    const prevId = history.pop() ?? null;
    this.beforeIdHistory.set(history);
    this.currentBeforeId.set(prevId);
    this.fetchHomestays(prevId);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    if (this.scrollRegion?.nativeElement) {
      if (typeof this.scrollRegion.nativeElement.scrollTo === 'function') {
        this.scrollRegion.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.scrollRegion.nativeElement.scrollTop = 0;
      }
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(): void {
    this.beforeIdHistory.set([]);
    this.currentBeforeId.set(null);
    this.guestDropdownOpen.set(false);
    this.fetchHomestays();
  }

  selectLocation(city: string): void {
    this.locationQuery.set(city);
    this.currentPage.set(1);
    this.fetchHomestays();
  }

  selectCategory(categoryId: HomestayCategory): void {
    this.selectedCategory.set(categoryId);
    this.currentPage.set(1);
    this.fetchHomestays();
  }

  onSortChange(newSort: any): void {
    this.sortBy.set(newSort);
    this.currentPage.set(1);
    this.fetchHomestays();
  }

  toggleGuestDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.guestDropdownOpen.update((open) => !open);
    if (this.guestDropdownOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  closeGuestDropdown(): void {
    this.guestDropdownOpen.set(false);
    this.userMenuOpen.set(false);
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.userMenuOpen.update((open) => !open);
    if (this.userMenuOpen()) {
      this.guestDropdownOpen.set(false);
    }
  }

  updateAdults(delta: number): void {
    const updated = Math.max(1, Math.min(10, this.adultsCount() + delta));
    this.adultsCount.set(updated);
  }

  updateChildren(delta: number): void {
    const updated = Math.max(0, Math.min(6, this.childrenCount() + delta));
    this.childrenCount.set(updated);
  }

  toggleAmenity(amenity: string): void {
    const current = this.selectedAmenities();
    if (current.includes(amenity)) {
      this.selectedAmenities.set(current.filter((a) => a !== amenity));
    } else {
      this.selectedAmenities.set([...current, amenity]);
    }
  }

  isAmenitySelected(amenity: string): boolean {
    return this.selectedAmenities().includes(amenity);
  }

  openFilterModal(): void {
    this.filterModalOpen.set(true);
  }

  closeFilterModal(): void {
    this.filterModalOpen.set(false);
  }

  applyModalFilters(): void {
    this.filterModalOpen.set(false);
    this.currentPage.set(1);
    this.fetchHomestays();
  }

  resetFilters(): void {
    this.locationQuery.set('');
    this.checkInDate.set('');
    this.checkOutDate.set('');
    this.adultsCount.set(2);
    this.childrenCount.set(0);
    this.selectedCategory.set('all');
    this.minPrice.set(3000);
    this.maxPrice.set(15000);
    this.verifiedOnly.set(false);
    this.selectedAmenities.set([]);
    this.sortBy.set('popular');
    this.currentPage.set(1);
    this.filterModalOpen.set(false);
    this.fetchHomestays();
    this.showToast('All filters have been reset');
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.fetchHomestays();
      if (this.scrollRegion?.nativeElement) {
        if (typeof this.scrollRegion.nativeElement.scrollTo === 'function') {
          this.scrollRegion.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          this.scrollRegion.nativeElement.scrollTop = 0;
        }
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  toggleWishlist(homestay: HomestaySummary, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.isAuthenticated()) {
      this.showToast('Please sign in to save homestays to your wishlist');
      this.authModalService.open('login', undefined, {
        type: 'wishlist',
        resumeCallback: () => {
          this.toggleWishlist(homestay, event);
        },
      });
      return;
    }

    this.homestayService.toggleWishlist(homestay.id).subscribe({
      next: (added) => {
        homestay.is_wishlisted = added;
        this.showToast(
          added
            ? `Saved "${homestay.name}" to wishlist`
            : `Removed "${homestay.name}" from wishlist`
        );
      },
      error: () => {
        this.showToast('Failed to update wishlist on server');
      },
    });
  }

  isWishlisted(id: number): boolean {
    return this.homestayService.isWishlisted(id);
  }

  getWishlistCount(): number {
    return this.homestayService.wishlistIds().length;
  }

  getBookingQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (this.checkInDate()) params['check_in'] = this.checkInDate();
    if (this.checkOutDate()) params['check_out'] = this.checkOutDate();
    if (this.adultsCount()) params['adults'] = this.adultsCount();
    if (this.childrenCount()) params['children'] = this.childrenCount();
    return params;
  }

  bookHomestay(homestay: HomestaySummary, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const queryParams = this.getBookingQueryParams();
    this.router.navigate(['/homestays', homestay.id], { queryParams });
  }

  onCardHover(id: number | null): void {
    this.hoveredHomestayId.set(id);
  }

  onMarkerClick(homestay: HomestaySummary): void {
    this.selectedHomestayId.set(homestay.id);
    if (typeof document !== 'undefined') {
      const card = document.getElementById(`homestay-card-${homestay.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  setMobileView(mode: 'list' | 'map'): void {
    this.mobileViewMode.set(mode);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
