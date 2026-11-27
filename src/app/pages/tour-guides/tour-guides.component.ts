import { RecommendationService } from '../../recommendations/recommendation.service';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  TourGuide,
  TourGuideSortBy,
} from '../../core/models/tour-guide.models';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { TourGuideService } from '../../core/services/tour-guide.service';

@Component({
  selector: 'app-tour-guides',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './tour-guides.component.html',
  styleUrl: './tour-guides.component.scss',
})
export class TourGuidesComponent implements OnInit {
  private readonly recommendations = inject(RecommendationService);
  readonly guideService = inject(TourGuideService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // SERVICE SIGNALS
  readonly categories = this.guideService.categories;
  readonly popularLocations = this.guideService.popularLocations;
  readonly availableLanguages = this.guideService.availableLanguages;
  readonly filter = this.guideService.filter;
  readonly paginatedGuides = this.guideService.paginatedGuides;
  readonly totalCount = this.guideService.totalCount;
  readonly totalPages = this.guideService.totalPages;
  readonly currentPage = this.guideService.currentPage;
  readonly isLoading = this.guideService.isLoading;
  readonly errorMessage = this.guideService.errorMessage;
  readonly isDemoMode = this.guideService.isDemoMode;

  // SEARCH POPUPS & FILTER MODAL
  readonly isLocationDropdownOpen = signal<boolean>(false);
  readonly isDatePickerOpen = signal<boolean>(false);
  readonly isTravelersOpen = signal<boolean>(false);
  readonly isLanguageDropdownOpen = signal<boolean>(false);
  readonly isSortDropdownOpen = signal<boolean>(false);
  readonly isFilterModalOpen = signal<boolean>(false);

  // SEARCH BAR INPUT SIGNALS
  readonly searchLocationInput = signal<string>('');
  readonly selectedDateInput = signal<string>('');
  readonly travelersCount = signal<number>(1);
  readonly searchLanguageInput = signal<string>('');

  // FILTER MODAL TEMPORARY FORM STATE
  tempLocation = signal<string>('');
  tempSpecialization = signal<string>('');
  tempMinPrice = signal<number | null>(null);
  tempMaxPrice = signal<number | null>(null);
  tempLanguages = signal<string[]>([]);
  tempMinExperience = signal<number | null>(null);
  tempMinRating = signal<number | null>(null);
  tempVerifiedOnly = signal<boolean>(false);
  tempSortBy = signal<TourGuideSortBy>('top_rated');

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['location']) {
        this.guideService.setLocation(params['location']);
        this.searchLocationInput.set(params['location']);
      }
      if (params['category']) {
        this.guideService.setCategory(params['category']);
      }
      if (params['language']) {
        this.guideService.setLanguage(params['language']);
        this.searchLanguageInput.set(params['language']);
      }
      if (params['travelers'] && +params['travelers'] >= 1) {
        const count = +params['travelers'];
        this.travelersCount.set(count);
        this.guideService.setTravelers(count);
      }
    });

    this.searchLocationInput.set(this.filter().location);
    this.searchLanguageInput.set(this.filter().language);
    this.travelersCount.set(this.filter().travelers || 1);
    this.guideService.loadGuides(this.filter().location || undefined);
  }

  retryLoadGuides(): void {
    this.guideService.loadGuides(this.searchLocationInput().trim() || undefined);
  }

  selectCategory(categoryId: string): void {
    this.guideService.setCategory(categoryId);
  }

  toggleLocationDropdown(event: Event): void {
    event.stopPropagation();
    this.isLocationDropdownOpen.update((v) => !v);
    this.isDatePickerOpen.set(false);
    this.isTravelersOpen.set(false);
    this.isLanguageDropdownOpen.set(false);
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
    this.isDatePickerOpen.update((v) => !v);
    this.isLocationDropdownOpen.set(false);
    this.isTravelersOpen.set(false);
    this.isLanguageDropdownOpen.set(false);
  }

  selectDate(dateStr: string, event: Event): void {
    event.stopPropagation();
    this.selectedDateInput.set(dateStr);
    this.guideService.setDate(dateStr || null);
    this.isDatePickerOpen.set(false);
  }

  toggleTravelersPicker(event: Event): void {
    event.stopPropagation();
    this.isTravelersOpen.update((v) => !v);
    this.isLocationDropdownOpen.set(false);
    this.isDatePickerOpen.set(false);
    this.isLanguageDropdownOpen.set(false);
  }

  changeTravelers(delta: number, event: Event): void {
    event.stopPropagation();
    const updated = Math.max(1, Math.min(20, this.travelersCount() + delta));
    this.travelersCount.set(updated);
    this.guideService.setTravelers(updated);
  }

  toggleLanguageDropdown(event: Event): void {
    event.stopPropagation();
    this.isLanguageDropdownOpen.update((v) => !v);
    this.isLocationDropdownOpen.set(false);
    this.isDatePickerOpen.set(false);
    this.isTravelersOpen.set(false);
  }

  selectSearchLanguage(lang: string, event: Event): void {
    event.stopPropagation();
    this.searchLanguageInput.set(lang);
    this.guideService.setLanguage(lang);
    this.isLanguageDropdownOpen.set(false);
  }

  executeSearch(): void {
    const destination = this.searchLocationInput().trim();
    this.recommendations.search({ category: 'guide', destination });
    this.guideService.updateFilter({
      location: destination,
      date: this.selectedDateInput() || null,
      travelers: this.travelersCount(),
      language: this.searchLanguageInput().trim(),
    });
    this.guideService.loadGuides(destination || undefined);
    this.closePopups();
  }

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.isSortDropdownOpen.update((v) => !v);
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

  activeFilterCount(): number {
    const f = this.filter();
    let count = 0;
    if (f.languages.length > 0) count++;
    if (f.location) count++;
    if (f.specialization) count++;
    if (f.minPrice !== null || f.maxPrice !== null) count++;
    if (f.minExperience !== null) count++;
    if (f.minRating !== null) count++;
    if (f.verifiedOnly) count++;
    return count;
  }

  openFilterModal(): void {
    const f = this.filter();
    this.tempLocation.set(f.location);
    this.tempSpecialization.set(f.specialization);
    this.tempMinPrice.set(f.minPrice);
    this.tempMaxPrice.set(f.maxPrice);
    this.tempLanguages.set([...f.languages]);
    this.tempMinExperience.set(f.minExperience);
    this.tempMinRating.set(f.minRating);
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
      this.tempLanguages.set(current.filter((l) => l !== lang));
    } else {
      this.tempLanguages.set([...current, lang]);
    }
  }

  applyModalFilters(): void {
    const loc = this.tempLocation().trim();
    this.recommendations.search({ category: 'guide', destination: loc });
    this.searchLocationInput.set(loc);
    this.guideService.updateFilter({
      location: loc,
      specialization: this.tempSpecialization().trim(),
      minPrice: this.tempMinPrice(),
      maxPrice: this.tempMaxPrice(),
      languages: this.tempLanguages(),
      minExperience: this.tempMinExperience(),
      minRating: this.tempMinRating(),
      verifiedOnly: this.tempVerifiedOnly(),
      sortBy: this.tempSortBy(),
    });
    this.closeFilterModal();
  }

  resetAllFilters(): void {
    this.guideService.resetFilters();
    this.searchLocationInput.set('');
    this.selectedDateInput.set('');
    this.travelersCount.set(1);
    this.searchLanguageInput.set('');
    this.guideService.loadGuides();
    this.closeFilterModal();
  }

  toggleFavorite(guide: TourGuide, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', event.currentTarget as HTMLElement, {
        type: 'wishlist',
        resumeCallback: () => this.guideService.toggleFavorite(guide.id),
      });
      return;
    }
    this.guideService.toggleFavorite(guide.id);
  }

  guideLinkQueryParams(): Record<string, string | number> {
    const queryParams: Record<string, string | number> = {};
    if (this.selectedDateInput()) {
      queryParams['date'] = this.selectedDateInput();
    }
    if (this.travelersCount() > 1) {
      queryParams['travelers'] = this.travelersCount();
    }
    return queryParams;
  }

  onViewProfileClick(guide: TourGuide, event: Event): void {
    event.stopPropagation();
    this.guideService.selectGuide(guide);
  }

  viewGuideProfile(guide: TourGuide, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.guideService.selectGuide(guide);
    void this.router.navigate(['/tour-guides', guide.id], {
      queryParams: this.guideLinkQueryParams(),
    });
  }

  pricingUnitLabel(guide: TourGuide): string {
    return this.guideService.formatPricingUnitLabel(guide.pricingUnit);
  }

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
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  nextPage(): void {
    this.guideService.nextPage();
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    this.guideService.prevPage();
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.guideService.neutralPlaceholder) {
      img.src = this.guideService.neutralPlaceholder;
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closePopups();
  }

  private closePopups(): void {
    this.isLocationDropdownOpen.set(false);
    this.isDatePickerOpen.set(false);
    this.isTravelersOpen.set(false);
    this.isLanguageDropdownOpen.set(false);
    this.isSortDropdownOpen.set(false);
  }
}
