import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { TravelerNavbar } from '../../shared/components/traveler-navbar/traveler-navbar';
import { Footer } from '../../shared/components/footer/footer';
import { AuthService } from '../../core/services/auth.service';

export interface ExperienceCategory {
  id: string;
  title: string;
  image: string;
  alt: string;
  region: string;
  filterParam: string;
}

export interface ExploreMoreCard {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  ctaText: string;
  route: string;
}

export interface PromotionCategory {
  id: string;
  title: string;
}

export interface PromotionCard {
  id: string;
  title: string;
  providerName: string;
  location: string;
  image: string;
  originalPrice?: number;
  discountedPrice?: number;
  discountPercent?: number;
  validityPeriod?: string;
  category: string;
}

@Component({
  selector: 'app-traveler-home',
  standalone: true,
  imports: [CommonModule, TravelerNavbar, Footer],
  templateUrl: './traveler-home.html',
  styleUrls: ['./traveler-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerHome implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef);
  readonly authService = inject(AuthService);

  readonly toastMessage = signal<string | null>(null);

  // =========================================================================
  // AI QUICK PLANNER STATE
  // =========================================================================
  readonly selectedDestination = signal<string | null>(null);
  readonly selectedDuration = signal<string | null>(null);
  readonly isDestinationDropdownOpen = signal(false);
  readonly isDurationDropdownOpen = signal(false);
  readonly quickPlannerError = signal<string | null>(null);
  readonly isGenerating = signal(false);

  readonly destinations: readonly string[] = [
    'Colombo',
    'Kandy',
    'Ella',
    'Nuwara Eliya',
    'Galle',
    'Mirissa',
    'Jaffna',
    'Trincomalee',
    'Sigiriya',
    'Anuradhapura',
    'Explore All Sri Lanka',
  ];

  readonly durations: readonly string[] = [
    '1 Day',
    '2 Days',
    '3 Days',
    '4 Days',
    '5 Days',
    '6 Days',
    '7 Days',
    '10 Days',
    '14 Days',
  ];

  // =========================================================================
  // SECTION 03: EXACTLY 8 REAL-PHOTO EXPERIENCE CATEGORIES
  // =========================================================================
  readonly experienceCategories: readonly ExperienceCategory[] = [
    {
      id: 'local-culture',
      title: 'Local Culture',
      image: '/images/experience-categories/local-culture.webp',
      alt: 'Traditional Tamil Kavadi dance and Hindu festival procession at Nallur, Jaffna, Northern Sri Lanka',
      region: 'Northern Province (Jaffna)',
      filterParam: 'culture',
    },
    {
      id: 'wildlife',
      title: 'Wildlife',
      image: '/images/experience-categories/wildlife.webp',
      alt: 'Wild Asian elephant herd gathering at Minneriya National Park, Sri Lanka',
      region: 'North Central Province',
      filterParam: 'wildlife',
    },
    {
      id: 'cooking',
      title: 'Cooking',
      image: '/images/experience-categories/cooking.webp',
      alt: 'Traditional Sri Lankan village cooking in clay pots over open hearth in Northern Sri Lanka',
      region: 'Northern Province',
      filterParam: 'cooking',
    },
    {
      id: 'adventures',
      title: 'Adventures',
      image: '/images/experience-categories/adventures.webp',
      alt: 'Mountain hiking and outdoor adventure across Knuckles Mountain Range, Sri Lanka',
      region: 'Central Highlands',
      filterParam: 'adventures',
    },
    {
      id: 'artisan',
      title: 'Artisan & Handicrafts',
      image: '/images/experience-categories/artisan.webp',
      alt: 'Traditional Northern Sri Lankan palmyra leaf weaving and handicraft creation in Jaffna',
      region: 'Northern Province (Jaffna)',
      filterParam: 'artisan',
    },
    {
      id: 'heritage',
      title: 'Heritage & Landmarks',
      image: '/images/experience-categories/heritage.webp',
      alt: 'Iconic golden gopuram entrance of historic Nallur Kandaswamy Temple, Jaffna, Sri Lanka',
      region: 'Northern Province (Jaffna)',
      filterParam: 'heritage',
    },
    {
      id: 'village-experiences',
      title: 'Village Experiences',
      image: '/images/experience-categories/village-experiences.webp',
      alt: 'Traditional wooden lagoon fishing boats and serene village life in Batticaloa, Eastern Sri Lanka',
      region: 'Eastern Province (Batticaloa)',
      filterParam: 'village',
    },
    {
      id: 'water-activities',
      title: 'Water Activities',
      image: '/images/experience-categories/water-activities.webp',
      alt: 'Surfing point-break waves at Whiskey Point, Arugam Bay, Eastern Sri Lanka',
      region: 'Eastern Province (Arugam Bay)',
      filterParam: 'water',
    },
  ];

  @ViewChild('categoryTrack') categoryTrack?: ElementRef<HTMLDivElement>;
  readonly categoryScrollPosition = signal<number>(0);

  // =========================================================================
  // SECTION 04: EXPLORE MORE WITH CEYLONGO (EXACTLY 3 LARGE 16:9 PHOTO CARDS)
  // =========================================================================
  readonly exploreCards: readonly ExploreMoreCard[] = [
    {
      id: 'homestays',
      title: 'Find Homestays',
      description: 'Stay with local hosts and feel at home.',
      image: '/images/traveler-home/find-homestays.webp',
      alt: 'Authentic Sri Lankan hillside homestay surrounded by tea plantations in Ella',
      ctaText: 'Explore Homestays →',
      route: '/homestays',
    },
    {
      id: 'tour-guides',
      title: 'Find Your Tour Guide',
      description: 'Discover Sri Lanka with trusted local experts.',
      image: '/images/traveler-home/find-tour-guide.webp',
      alt: 'Sri Lankan local tour guide introducing ancient Sigiriya inscriptions',
      ctaText: 'Find a Guide →',
      route: '/tour-guides',
    },
    {
      id: 'bicycles',
      title: 'Rent a Bicycle',
      description: 'Explore Sri Lanka freely on two wheels.',
      image: '/images/traveler-home/rent-bicycle.webp',
      alt: 'Traveler cycling along scenic coastal road in Batticaloa, Sri Lanka',
      ctaText: 'Explore Rentals →',
      route: '/bicycles',
    },
  ];

  // =========================================================================
  // SECTION 06: SPECIAL OFFERS & PROMOTIONS (3 CATEGORIES + HONEST EMPTY STATE)
  // =========================================================================
  readonly promotionCategories: readonly PromotionCategory[] = [
    { id: 'all', title: 'All Offers' },
    { id: 'homestays', title: 'Homestay Offers' },
    { id: 'rentals', title: 'Rental Offers' },
    { id: 'experiences', title: 'Experience Offers' },
  ];

  readonly selectedPromotionCategory = signal<string>('all');
  readonly promotions = signal<PromotionCard[]>([]);

  ngOnInit(): void {
    // Check if query params have initial destination/duration for quick planner
    this.route.queryParams.subscribe((params) => {
      if (params['destination'] && this.destinations.includes(params['destination'])) {
        this.selectedDestination.set(params['destination']);
      }
      if (params['duration'] && this.durations.includes(params['duration'])) {
        this.selectedDuration.set(params['duration']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isInsideSelector = target.closest('.custom-select-wrapper');
    if (!isInsideSelector) {
      this.isDestinationDropdownOpen.set(false);
      this.isDurationDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isDestinationDropdownOpen() || this.isDurationDropdownOpen()) {
      this.isDestinationDropdownOpen.set(false);
      this.isDurationDropdownOpen.set(false);
    }
  }

  toggleDestinationDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isDurationDropdownOpen.set(false);
    this.isDestinationDropdownOpen.update((open) => !open);
  }

  selectDestination(dest: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedDestination.set(dest);
    this.isDestinationDropdownOpen.set(false);
    this.quickPlannerError.set(null);
  }

  toggleDurationDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isDestinationDropdownOpen.set(false);
    this.isDurationDropdownOpen.update((open) => !open);
  }

  selectDuration(dur: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedDuration.set(dur);
    this.isDurationDropdownOpen.set(false);
    this.quickPlannerError.set(null);
  }

  onGenerateMyTrip(): void {
    this.isDestinationDropdownOpen.set(false);
    this.isDurationDropdownOpen.set(false);

    const dest = this.selectedDestination();
    const dur = this.selectedDuration();

    if (!dest && !dur) {
      this.quickPlannerError.set('Please choose a destination and trip duration to generate your trip.');
      return;
    }
    if (!dest) {
      this.quickPlannerError.set('Please choose a destination for your adventure.');
      return;
    }
    if (!dur) {
      this.quickPlannerError.set('Please select the number of days for your trip.');
      return;
    }

    this.quickPlannerError.set(null);
    this.isGenerating.set(true);

    const msg = `Generating custom AI itinerary for ${dest} (${dur})...`;
    this.showToast(msg);

    // Transfer selected destination and duration to query params / state
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { destination: dest, duration: dur, planner: 'quick' },
      queryParamsHandling: 'merge',
    }).then(() => {
      setTimeout(() => {
        this.isGenerating.set(false);
        this.showToast(`Itinerary parameters ready for ${dest} (${dur})! Connecting with CeylonGo AI Itinerary engine.`);
      }, 700);
    });
  }

  onPlanTripWithAI(): void {
    this.showToast('Launching CeylonGo AI Trip Planner...');
    const plannerSection = document.getElementById('ai-planner');
    if (plannerSection && typeof plannerSection.scrollIntoView === 'function') {
      plannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onCategoryScroll(): void {
    if (this.categoryTrack?.nativeElement) {
      this.categoryScrollPosition.set(this.categoryTrack.nativeElement.scrollLeft);
    }
  }

  scrollCategories(direction: number): void {
    if (this.categoryTrack?.nativeElement) {
      const scrollAmount = 340 * direction;
      const el = this.categoryTrack.nativeElement;
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        el.scrollLeft += scrollAmount;
      }
      setTimeout(() => {
        this.onCategoryScroll();
      }, 350);
    }
  }

  onCategoryClick(cat: ExperienceCategory): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { experience_category: cat.filterParam },
      queryParamsHandling: 'merge',
    }).then(() => {
      this.showToast(`Exploring "${cat.title}" experiences in ${cat.region}. Full discovery directory coming soon!`);
    });
  }

  onExploreCardClick(card: ExploreMoreCard): void {
    this.showToast(`${card.title} discovery is coming soon in the next release!`);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { service: card.id },
      queryParamsHandling: 'merge',
    });
  }

  onExploreCommunity(): void {
    this.showToast('Travel Community features are coming soon in the next release!');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: 'community' },
      queryParamsHandling: 'merge',
    });
  }

  selectPromotionCategory(catId: string): void {
    this.selectedPromotionCategory.set(catId);
  }

  onViewOffer(promo: PromotionCard): void {
    this.showToast(`Viewing offer: ${promo.title}`);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.toastMessage.set(null);
      }, 3500);
    }
  }
}
