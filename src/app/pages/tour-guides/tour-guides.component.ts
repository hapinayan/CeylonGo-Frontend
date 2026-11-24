import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TourGuideService } from '../../core/services/tour-guide.service';
import {
  TourCategory,
  TourGuide,
  TourGuideFilter,
  TourGuideSortBy
} from '../../core/models/tour-guide.models';
import { TravelerHeaderComponent } from '../../shared/components/traveler-header/traveler-header.component';
import { TravelerFooterComponent } from '../../shared/components/traveler-footer/traveler-footer.component';

@Component({
  selector: 'app-tour-guides',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TravelerHeaderComponent,
    TravelerFooterComponent
  ],
  templateUrl: './tour-guides.component.html',
  styleUrl: './tour-guides.component.scss'
})
export class TourGuidesComponent implements OnInit {
  readonly guideService = inject(TourGuideService);
  private readonly route = inject(ActivatedRoute);

  // SERVICE SIGNALS
  readonly categories = this.guideService.categories;
  readonly popularLocations = this.guideService.popularLocations;
  readonly availableLanguages = this.guideService.availableLanguages;
  readonly filter = this.guideService.filter;
  readonly paginatedGuides = this.guideService.paginatedGuides;
  readonly totalCount = this.guideService.totalCount;
  readonly totalPages = this.guideService.totalPages;
  readonly currentPage = this.guideService.currentPage;
  readonly selectedGuide = this.guideService.selectedGuide;
  readonly isLoading = this.guideService.isLoading;
  readonly errorMessage = this.guideService.errorMessage;

  // LOCAL UI POPUPS & MODALS STATE
  readonly isLocationDropdownOpen = signal<boolean>(false);
  readonly isDatePickerOpen = signal<boolean>(false);
  readonly isTravelersOpen = signal<boolean>(false);
  readonly isSortDropdownOpen = signal<boolean>(false);
  readonly isFilterModalOpen = signal<boolean>(false);
  readonly isBookingModalOpen = signal<boolean>(false);

  // SEARCH BAR INPUT SIGNALS
  readonly searchLocationInput = signal<string>('');
  readonly selectedDateInput = signal<string>('');
  readonly travelersCount = signal<number>(1);

  // FILTER MODAL TEMPORARY FORM STATE
  tempMinPrice = signal<number | null>(null);
  tempMaxPrice = signal<number | null>(null);
  tempLanguages = signal<string[]>([]);
  tempVerifiedOnly = signal<boolean>(false);
  tempSortBy = signal<TourGuideSortBy>('top_rated');

  // BOOKING MODAL STATE
  readonly bookingStep = signal<'form' | 'success'>('form');
  readonly bookingDate = signal<string>('2026-12-05');
  readonly bookingDays = signal<number>(1);
  readonly bookingTravelers = signal<number>(2);
  readonly bookingNotes = signal<string>('');

  ngOnInit(): void {
    // Read optional query params (e.g. ?location=Kandy&category=nature-hiking)
    this.route.queryParams.subscribe(params => {
      if (params['location']) {
        this.guideService.setLocation(params['location']);
        this.searchLocationInput.set(params['location']);
      }
      if (params['category']) {
        this.guideService.setCategory(params['category']);
      }
    });

    // Sync search input
    this.searchLocationInput.set(this.filter().location);

    // Initial load through service
    this.guideService.loadGuides();
  }

  retryLoadGuides(): void {
    this.guideService.loadGuides();
  }

  // CATEGORY SELECTION
  selectCategory(categoryId: string): void {
    this.guideService.setCategory(categoryId);
  }

  // SEARCH BAR ACTIONS
  toggleLocationDropdown(event: Event): void {
    event.stopPropagation();
    this.isLocationDropdownOpen.update(v => !v);
    this.isDatePickerOpen.set(false);
    this.isTravelersOpen.set(false);
  }

  selectLocation(loc: string, event: Event): void {
    event.stopPropagation();
    const cleanLoc = loc === 'All Locations' ? '' : loc;
    this.searchLocationInput.set(cleanLoc);
    this.guideService.setLocation(cleanLoc);
    this.isLocationDropdownOpen.set(false);
  }

  toggleDatePicker(event: Event): void {
    event.stopPropagation();
    this.isDatePickerOpen.update(v => !v);
    this.isLocationDropdownOpen.set(false);
    this.isTravelersOpen.set(false);
  }

  selectDate(dateStr: string, event: Event): void {
    event.stopPropagation();
    this.selectedDateInput.set(dateStr);
    this.guideService.setDate(dateStr);
    this.isDatePickerOpen.set(false);
  }

  toggleTravelersPicker(event: Event): void {
    event.stopPropagation();
    this.isTravelersOpen.update(v => !v);
    this.isLocationDropdownOpen.set(false);
    this.isDatePickerOpen.set(false);
  }

  changeTravelers(delta: number, event: Event): void {
    event.stopPropagation();
    const updated = Math.max(1, Math.min(20, this.travelersCount() + delta));
    this.travelersCount.set(updated);
    this.guideService.setTravelers(updated);
  }

  executeSearch(): void {
    this.guideService.setLocation(this.searchLocationInput().trim());
    this.closePopups();
  }

  // SORT ACTIONS
  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.isSortDropdownOpen.update(v => !v);
  }

  setSortOption(option: TourGuideSortBy, event: Event): void {
    event.stopPropagation();
    this.guideService.setSortBy(option);
    this.isSortDropdownOpen.set(false);
  }

  getSortLabel(option: TourGuideSortBy): string {
    switch (option) {
      case 'top_rated':
        return 'Top Rated';
      case 'price_asc':
        return 'Price: Low to High';
      case 'price_desc':
        return 'Price: High to Low';
      case 'experience':
        return 'Most Experienced';
      default:
        return 'Top Rated';
    }
  }

  // FILTER MODAL ACTIONS
  openFilterModal(): void {
    const f = this.filter();
    this.tempMinPrice.set(f.minPrice);
    this.tempMaxPrice.set(f.maxPrice);
    this.tempLanguages.set([...f.languages]);
    this.tempVerifiedOnly.set(f.verifiedOnly);
    this.tempSortBy.set(f.sortBy);
    this.isFilterModalOpen.set(true);
  }

  closeFilterModal(): void {
    this.isFilterModalOpen.set(false);
  }

  toggleLanguageFilter(lang: string): void {
    const current = this.tempLanguages();
    if (current.includes(lang)) {
      this.tempLanguages.set(current.filter(l => l !== lang));
    } else {
      this.tempLanguages.set([...current, lang]);
    }
  }

  applyModalFilters(): void {
    this.guideService.updateFilter({
      minPrice: this.tempMinPrice(),
      maxPrice: this.tempMaxPrice(),
      languages: this.tempLanguages(),
      verifiedOnly: this.tempVerifiedOnly(),
      sortBy: this.tempSortBy()
    });
    this.closeFilterModal();
  }

  resetAllFilters(): void {
    this.guideService.resetFilters();
    this.searchLocationInput.set('');
    this.selectedDateInput.set('');
    this.travelersCount.set(1);
    this.closeFilterModal();
  }

  // FAVORITES
  toggleFavorite(guide: TourGuide, event: Event): void {
    event.stopPropagation();
    this.guideService.toggleFavorite(guide.id);
  }

  // GUIDE DETAILS & BOOKING
  openGuideDetail(guide: TourGuide): void {
    this.guideService.selectGuide(guide);
  }

  closeGuideDetail(): void {
    this.guideService.selectGuide(null);
  }

  openBookingModal(guide: TourGuide, event: Event): void {
    event.stopPropagation();
    this.guideService.selectGuide(guide);
    this.bookingStep.set('form');
    this.isBookingModalOpen.set(true);
  }

  closeBookingModal(): void {
    this.isBookingModalOpen.set(false);
  }

  submitBooking(): void {
    this.bookingStep.set('success');
  }

  // PAGINATION NUMBERS GENERATOR (e.g. 1, 2, 3, 4, 5, ..., 13)
  getVisiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }

    return pages;
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number') {
      this.guideService.setPage(page);
      window.scrollTo({ top: 320, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    this.guideService.nextPage();
    window.scrollTo({ top: 320, behavior: 'smooth' });
  }

  prevPage(): void {
    this.guideService.prevPage();
    window.scrollTo({ top: 320, behavior: 'smooth' });
  }

  // IMAGE FALLBACK HANDLER
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/images/sigiriya.jpg';
  }

  // GLOBAL CLICK LISTENER
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closePopups();
  }

  private closePopups(): void {
    this.isLocationDropdownOpen.set(false);
    this.isDatePickerOpen.set(false);
    this.isTravelersOpen.set(false);
    this.isSortDropdownOpen.set(false);
  }
}
