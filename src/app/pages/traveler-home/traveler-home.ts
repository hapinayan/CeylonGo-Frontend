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
import { TravelerAuthModal } from '../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';

export interface ExperienceCategory {
  id: string;
  title: string;
  image: string;
  alt: string;
  region: string;
  filterParam: string;
  targetCategory?: string;
}

export interface PopularDestination {
  id: string;
  name: string;
  province: string;
  image: string;
  tag?: string;
}

export interface SpecialOfferItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  discount: string;
  location: string;
  description: string;
  image: string;
  isDemo?: boolean;
}

export interface WhyCeylonGoPoint {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ExploreMoreCard {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  ctaText: string;
  route: string;
  icon?: string;
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
  imports: [CommonModule, TravelerNavbar, Footer, TravelerAuthModal],
  templateUrl: './traveler-home.html',
  styleUrls: ['./traveler-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerHome implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

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
      targetCategory: 'culture',
    },
    {
      id: 'wildlife',
      title: 'Wildlife',
      image: '/images/experience-categories/wildlife.webp',
      alt: 'Wild Asian elephant herd gathering at Minneriya National Park, Sri Lanka',
      region: 'North Central Province',
      filterParam: 'wildlife',
      targetCategory: 'wildlife',
    },
    {
      id: 'cooking',
      title: 'Cooking',
      image: '/images/experience-categories/cooking.webp',
      alt: 'Traditional Sri Lankan village cooking in clay pots over open hearth in Northern Sri Lanka',
      region: 'Northern Province',
      filterParam: 'cooking',
      targetCategory: 'food',
    },
    {
      id: 'adventures',
      title: 'Adventures',
      image: '/images/experience-categories/adventures.webp',
      alt: 'Mountain hiking and outdoor adventure across Knuckles Mountain Range, Sri Lanka',
      region: 'Central Highlands',
      filterParam: 'adventures',
      targetCategory: 'adventure',
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
      targetCategory: 'water',
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
      description: 'Stay local. Feel at home.',
      image: '/images/traveler-home/find-homestays.webp',
      alt: 'Beautiful traditional Sri Lankan homestay with tropical garden and welcoming veranda',
      ctaText: 'Explore Stays →',
      route: '/homestays',
      icon: 'homestay',
    },
    {
      id: 'tour-guides',
      title: 'Find Your Tour Guide',
      description: 'Discover Sri Lanka through local eyes.',
      image: '/images/traveler-home/find-tour-guide.webp',
      alt: 'Friendly Sri Lankan local tour guide interacting with international tourists at heritage site',
      ctaText: 'Find a Guide →',
      route: '/tour-guides',
      icon: 'guide',
    },
    {
      id: 'bicycles',
      title: 'Rent a Bike or Bicycle',
      description: 'Your journey. Your pace.',
      image: '/images/traveler-home/rent-bicycle.webp',
      alt: 'Bicycles and scooter parked in beautiful Sri Lankan coastal setting',
      ctaText: 'Explore Rentals →',
      route: '/bicycles',
      icon: 'rental',
    },
  ];

  // =========================================================================
  // SECTION 06: SPECIAL OFFERS & PROMOTIONS (3 CATEGORIES + HONEST EMPTY STATE)
  // =========================================================================

  // =========================================================================
  // SECTION 04: POPULAR DESTINATIONS (PRIORITIZING NORTH & EAST)
  // =========================================================================
  @ViewChild('destinationsTrack') destinationsTrack?: ElementRef<HTMLDivElement>;

  readonly popularDestinations: readonly PopularDestination[] = [
    {
      id: 'jaffna',
      name: 'Jaffna',
      province: 'Northern Province',
      image: '/images/destinations/jaffna.webp',
      tag: 'Cultural Heritage',
    },
    {
      id: 'trincomalee',
      name: 'Trincomalee',
      province: 'Eastern Province',
      image: '/images/destinations/trincomalee.webp',
      tag: 'Coastal Haven',
    },
    {
      id: 'batticaloa',
      name: 'Batticaloa',
      province: 'Eastern Province',
      image: '/images/destinations/batticaloa.webp',
      tag: 'Lagoon Adventures',
    },
    {
      id: 'mannar',
      name: 'Mannar',
      province: 'Northern Province',
      image: '/images/destinations/mannar.webp',
      tag: 'Historic Island',
    },
    {
      id: 'arugam-bay',
      name: 'Arugam Bay',
      province: 'Eastern Province',
      image: '/images/destinations/arugam-bay.webp',
      tag: 'World Surf Point',
    },
    {
      id: 'delft-island',
      name: 'Delft Island',
      province: 'Northern Province',
      image: '/images/destinations/delft-island.webp',
      tag: 'Wild Horses & Coral',
    },
    {
      id: 'ella',
      name: 'Ella',
      province: 'Uva Province',
      image: '/images/destinations/ella.webp',
      tag: 'Highland Escapes',
    },
    {
      id: 'sigiriya',
      name: 'Sigiriya',
      province: 'Central Province',
      image: '/images/destinations/sigiriya.webp',
      tag: 'Ancient Fortress',
    },
    {
      id: 'galle',
      name: 'Galle',
      province: 'Southern Province',
      image: '/images/destinations/galle.webp',
      tag: 'Historic Fort',
    },
  ];

  // =========================================================================
  // SECTION 07: SAMPLE DEMO OFFERS (FALLBACK WHEN NO LIVE PROMOTIONS)
  // =========================================================================
  readonly demoOffers: readonly SpecialOfferItem[] = [
    {
      id: 'demo-offer-1',
      title: 'Jaffna Homestay Escape',
      category: 'homestays',
      categoryLabel: 'Homestay Offer',
      discount: '20% OFF',
      location: 'Jaffna',
      description: 'Experience authentic northern hospitality.',
      image: '/images/destinations/jaffna.webp',
      isDemo: true,
    },
    {
      id: 'demo-offer-2',
      title: 'Trincomalee Bike Adventure',
      category: 'rentals',
      categoryLabel: 'Rental Offer',
      discount: '15% OFF',
      location: 'Trincomalee',
      description: 'Explore the beautiful eastern coastline.',
      image: '/images/traveler-home/rent-bicycle.webp',
      isDemo: true,
    },
    {
      id: 'demo-offer-3',
      title: 'Batticaloa Lagoon Experience',
      category: 'experiences',
      categoryLabel: 'Experience Offer',
      discount: '25% OFF',
      location: 'Batticaloa',
      description: 'Discover scenic lagoons and local adventures.',
      image: '/images/destinations/batticaloa.webp',
      isDemo: true,
    },
  ];

  get displayedOffers(): readonly SpecialOfferItem[] {
    const realOffers: SpecialOfferItem[] = this.promotions().map(p => ({
      id: String(p.id),
      title: p.title,
      category: p.category,
      categoryLabel: p.category === 'homestays' ? 'Homestay Offer' : (p.category === 'rentals' ? 'Rental Offer' : 'Experience Offer'),
      discount: p.discountPercent ? `${p.discountPercent}% OFF` : 'Special Deal',
      location: p.location,
      description: p.providerName,
      image: p.image,
      isDemo: false,
    }));

    const source = realOffers.length > 0 ? realOffers : this.demoOffers;
    const cat = this.selectedPromotionCategory();
    if (cat === 'all') {
      return source;
    }
    return source.filter(o => o.category === cat);
  }

  // =========================================================================
  // SECTION 08: WHY CEYLONGO? (5 UNIQUE SELLING POINTS)
  // =========================================================================
  readonly whyCeylonGoPoints: readonly WhyCeylonGoPoint[] = [
    {
      id: 'community-based',
      title: 'Community-Based Tourism',
      description: 'Support local families and experience authentic Sri Lankan hospitality.',
      icon: 'community',
    },
    {
      id: 'local-artisans',
      title: 'Local Business & Artisan Promotion',
      description: 'Discover handmade treasures and support local entrepreneurs.',
      icon: 'store',
    },
    {
      id: 'direct-connections',
      title: 'Direct Local Connections',
      description: 'Connect directly with local hosts, guides and communities.',
      icon: 'handshake',
    },
    {
      id: 'ai-planning',
      title: 'AI-Powered Travel Planning',
      description: 'Plan personalized journeys based on your interests.',
      icon: 'ai',
    },
    {
      id: 'all-in-one',
      title: 'All-in-One Local Tourism Platform',
      description: 'Discover stays, experiences, guides and rentals in one place.',
      icon: 'globe',
    },
  ];

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

    // If traveler is not authenticated, prompt login contextually and resume on success
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'generate-trip',
        data: { destination: dest, duration: dur },
        resumeCallback: () => {
          this.showToast(`Resuming trip generation for ${dest} (${dur})...`);
          this.onGenerateMyTrip();
        },
      });
      this.showToast('Please log in or create an account to generate your AI itinerary.');
      return;
    }

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
    if (cat.targetCategory) {
      // Connect to existing Experiences discovery page with selected category filter
      this.router.navigate(['/experiences'], {
        queryParams: { category: cat.targetCategory },
      });
    } else {
      // Verified: Artisan & Handicrafts, Heritage & Landmarks, Village Experiences
      // do not have dedicated categories in the existing Experiences catalog.
      // Do not create misleading category mappings. Navigate to all experiences.
      this.router.navigate(['/experiences']);
    }
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

    scrollDestinations(direction: number): void {
    if (this.destinationsTrack?.nativeElement) {
      const scrollAmount = 340 * direction;
      const el = this.destinationsTrack.nativeElement;
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        el.scrollLeft += scrollAmount;
      }
    }
  }

  onDestinationClick(dest: PopularDestination): void {
    this.selectedDestination.set(dest.name);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { destination: dest.name },
      queryParamsHandling: 'merge',
    });
    this.showToast(`Discovering ${dest.name} in ${dest.province}. Local experiences & stays coming soon!`);
  }

  selectPromotionCategory(catId: string): void {
    this.selectedPromotionCategory.set(catId);
  }

  onViewOffer(promo: PromotionCard | SpecialOfferItem): void {
    if ('isDemo' in promo && promo.isDemo) {
      this.showToast(`Demo Offer: Special discount preview for ${promo.title} (${promo.location}). Live booking coming soon!`);
    } else {
      this.showToast(`Viewing offer: ${promo.title}`);
    }
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
