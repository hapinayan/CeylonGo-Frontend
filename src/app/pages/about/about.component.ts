import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface EcosystemCard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly route: string;
  readonly image: string;
  readonly badge: string;
}

export interface ValueProposition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: 'community' | 'artisan' | 'direct' | 'ai' | 'platform';
}

export interface ImpactPillar {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly iconName: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  readonly ecosystemCards: readonly EcosystemCard[] = [
    {
      id: 'homestays',
      title: 'Authentic Homestays',
      description: 'Stay with welcoming Sri Lankan families, from misty tea hills in Ella to coastal retreats in Mirissa.',
      route: '/homestays',
      image: '/images/homestays/ella-hill-view-homestay.jpg',
      badge: 'Stays & Hospitality',
    },
    {
      id: 'tour-guides',
      title: 'Local Tour Guides',
      description: 'Explore ancient ruins, hidden trails, and wildlife sanctuaries with SLTDA-certified local guides.',
      route: '/tour-guides',
      image: '/images/traveler-home/find-tour-guide.webp',
      badge: 'Certified Experts',
    },
    {
      id: 'experiences',
      title: 'Curated Experiences',
      description: 'Participate in authentic village life, cooking classes, wildlife safaris, and nature excursions.',
      route: '/experiences',
      image: '/images/experience-categories/cultural-village.webp',
      badge: 'Culture & Nature',
    },
    {
      id: 'artisans',
      title: 'Local Artisans & Crafts',
      description: 'Discover traditional brass workers, handloom weavers, mask carvers, and herbal spice growers.',
      route: '/artisans/discover',
      image: '/images/experience-categories/artisan.webp',
      badge: 'Handmade Heritage',
    },
    {
      id: 'bicycles',
      title: 'Bike & Scooter Rentals',
      description: 'Rent mountain bicycles, scooters, and eco-friendly rides to explore rural lanes at your own pace.',
      route: '/bicycles',
      image: '/images/traveler-home/rent-bicycle.webp',
      badge: 'Eco Transport',
    },
    {
      id: 'ai-planner',
      title: 'AI Smart Trip Planner',
      description: 'Generate tailored day-by-day itineraries matched to your destination, budget, pace, and interests.',
      route: '/ai-planner',
      image: '/images/banners/ai-trip-planner.webp',
      badge: 'Smart Discovery',
    },
  ];

  readonly valuePropositions: readonly ValueProposition[] = [
    {
      id: 'community-based',
      title: 'Community-Based Tourism',
      description: 'Support local families directly and experience authentic hospitality across all 25 districts of Sri Lanka.',
      icon: 'community',
    },
    {
      id: 'local-artisans',
      title: 'Local Business & Artisan Promotion',
      description: 'Showcase handmade crafts and traditional skills, providing direct market access for local entrepreneurs.',
      icon: 'artisan',
    },
    {
      id: 'direct-connections',
      title: 'Direct Local Connections',
      description: 'Connect directly with certified guides and hosts without hidden middleman fees or complicated booking chains.',
      icon: 'direct',
    },
    {
      id: 'ai-planning',
      title: 'AI-Powered Travel Planning',
      description: 'Receive personalized travel suggestions and balanced daily itineraries structured around your preferences.',
      icon: 'ai',
    },
    {
      id: 'all-in-one',
      title: 'All-in-One Local Tourism Platform',
      description: 'Discover stays, excursions, transport rentals, and artisan showcases in one unified, cohesive web platform.',
      icon: 'platform',
    },
  ];

  readonly impactPillars: readonly ImpactPillar[] = [
    {
      id: 'empowering-artisans',
      title: 'Empowering Local Artisans',
      description: 'Connecting traditional craftspeople with travelers preserves generational heritage and boosts micro-economies.',
      iconName: 'hammer',
    },
    {
      id: 'supporting-families',
      title: 'Supporting Homestay Families',
      description: 'Tourism earnings flow directly to family-run accommodations, promoting financial independence.',
      iconName: 'heart',
    },
    {
      id: 'promoting-rural',
      title: 'Promoting Rural Tourism',
      description: 'Encouraging journeys beyond saturated hotspots distributes economic benefits to regional communities.',
      iconName: 'compass',
    },
    {
      id: 'preserving-culture',
      title: 'Preserving Cultural Heritage',
      description: 'Respectful immersion in local traditions keeps cultural arts, folklore, and culinary heritage thriving.',
      iconName: 'shield',
    },
    {
      id: 'responsible-travel',
      title: 'Encouraging Responsible Travel',
      description: 'Fostering conscious interactions that respect fragile ecosystems, historic landmarks, and community customs.',
      iconName: 'feather',
    },
  ];
}
