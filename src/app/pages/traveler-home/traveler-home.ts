import { Recommendations } from '../../recommendations/recommendations';
import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AiPlannerService } from '../../features/ai-planner/services/ai-planner.service';
import { ArtisanListingSummary } from '../../features/artisan/models/artisan.models';
import { ArtisanService } from '../../features/artisan/services/artisan.service';

export interface ExperienceCategory {
  id: string;
  title: string;
  image: string;
  alt: string;
  region: string;
  filterParam: string;
  targetCategory?: string;
  route?: string;
}

export interface PopularDestination {
  id: string;
  name: string;
  province: string;
  image: string;
  tag?: string;
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

@Component({
  selector: 'app-traveler-home',
  standalone: true,
  imports: [Recommendations, CommonModule, RouterLink],
  templateUrl: './traveler-home.html',
  styleUrls: ['./traveler-home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerHome implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  private readonly aiPlannerService = inject(AiPlannerService);
  private readonly artisanService = inject(ArtisanService);

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
      route: '/artisans/discover',
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
  // SECTION 04: POPULAR DESTINATIONS (9 DESTINATIONS PRIORITIZING NORTH & EAST)
  // =========================================================================
  @ViewChild('destinationsTrack') destinationsTrack?: ElementRef<HTMLDivElement>;
  readonly destinationScrollPosition = signal<number>(0);

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
  // SECTION 06: STAY, DISCOVER & RIDE (3 SERVICE CARDS)
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
  // SECTION 07: MEET OUR LOCAL ARTISANS (REAL API DATA ONLY)
  // =========================================================================
  readonly artisanListings = signal<ArtisanListingSummary[]>([]);
  readonly failedArtisanImages = signal<ReadonlySet<number>>(new Set());

  // =========================================================================
  // SECTION 09: WHY CEYLONGO? (5 UNIQUE SELLING POINTS)
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

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['destination'] && this.destinations.includes(params['destination'])) {
          this.selectedDestination.set(params['destination']);
        }
        if (params['duration'] && this.durations.includes(params['duration'])) {
          this.selectedDuration.set(params['duration']);
        }
      });

    this.loadLocalArtisans();
  }

  private loadLocalArtisans(): void {
    this.artisanService
      .getListings({ page: 1, page_size: 4 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const eligible = (page?.items ?? []).filter(
            (item) =>
              item.is_active !== false &&
              (!item.approval_status || item.approval_status.toLowerCase() === 'approved'),
          );
          this.artisanListings.set(eligible.slice(0, 4));
        },
        error: () => {
          this.artisanListings.set([]);
        },
      });
  }

  onArtisanImageError(listingId: number): void {
    this.failedArtisanImages.update((prev) => {
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });
  }

  artisanLocation(item: ArtisanListingSummary): string {
    const parts = [item.city, item.district]
      .map((v) => v?.trim())
      .filter((v): v is string => Boolean(v));
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      return parts[0];
    }
    return parts.join(', ') || 'Sri Lanka';
  }

  artisanShortDescription(item: ArtisanListingSummary): string {
    const raw = (item.description ?? '').trim();
    if (!raw) return '';
    return raw.split('\n')[0].trim();
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

    const msg = `Preparing custom AI itinerary for ${dest} (${dur})...`;
    this.showToast(msg);
    this.aiPlannerService.setPendingQuickDraft({
      destination: dest,
      duration: dur,
    });

    this.router
      .navigate(['/ai-planner'], {
        queryParams: { destination: dest, duration: dur },
      })
      .finally(() => {
        this.isGenerating.set(false);
      });
  }

  onPlanTripWithAI(): void {
    this.showToast('Opening CeylonGo AI Trip Planner...');
    this.router.navigate(['/ai-planner']);
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
    if (cat.route) {
      this.router.navigate([cat.route]);
    } else if (cat.targetCategory) {
      this.router.navigate(['/experiences'], {
        queryParams: { category: cat.targetCategory },
      });
    } else {
      this.router.navigate(['/experiences']);
    }
  }

  onExploreCardClick(card: ExploreMoreCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
    }
  }

  onExploreCommunity(): void {
    this.router.navigate(['/community']);
  }

  onDestinationsScroll(): void {
    if (this.destinationsTrack?.nativeElement) {
      this.destinationScrollPosition.set(this.destinationsTrack.nativeElement.scrollLeft);
    }
  }

  scrollDestinations(direction: number): void {
    if (this.destinationsTrack?.nativeElement) {
      const scrollAmount = 360 * direction;
      const el = this.destinationsTrack.nativeElement;
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        el.scrollLeft += scrollAmount;
      }
      setTimeout(() => {
        this.onDestinationsScroll();
      }, 350);
    }
  }

  onDestinationClick(dest: PopularDestination): void {
    this.selectedDestination.set(dest.name);
    this.router.navigate(['/homestays'], {
      queryParams: { location: dest.name },
    });
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
