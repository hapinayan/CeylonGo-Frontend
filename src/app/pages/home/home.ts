import { Component, signal } from '@angular/core';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { CategoryShortcut, CategoryShortcutItem } from './components/category-shortcut/category-shortcut';
import { WhyChooseCeylongo } from './components/why-choose-ceylongo/why-choose-ceylongo';
import { HomestayCard, HomestayItem } from './components/homestay-card/homestay-card';
import { ExperienceCard, ExperienceItem } from './components/experience-card/experience-card';
import { AiPlannerBanner } from './components/ai-planner-banner/ai-planner-banner';
import { CommunityBanner } from './components/community-banner/community-banner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    Footer,
    CategoryShortcut,
    WhyChooseCeylongo,
    HomestayCard,
    ExperienceCard,
    AiPlannerBanner,
    CommunityBanner,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly searchFeedback = signal<{ message: string; type: 'info' | 'success' } | null>(null);

  readonly categories: readonly CategoryShortcutItem[] = [
    {
      id: 'homestays',
      name: 'Homestays',
      icon: 'homestays',
      targetId: 'homestays',
    },
    {
      id: 'experiences',
      name: 'Experiences',
      icon: 'experiences',
      targetId: 'experiences',
    },
    {
      id: 'tour-guides',
      name: 'Tour Guides',
      icon: 'tour-guides',
      targetId: 'tour-guides',
    },
    {
      id: 'bike-rentals',
      name: 'Bike Rentals',
      icon: 'bike-rentals',
      targetId: 'bike-rentals',
    },
    {
      id: 'community',
      name: 'Community',
      icon: 'community',
      targetId: 'community',
    },
    {
      id: 'ai-planner',
      name: 'AI Trip Planner',
      icon: 'ai-planner',
      targetId: 'ai-planner',
    },
  ];

  readonly featuredHomestays: readonly HomestayItem[] = [
    {
      id: 'sigiriya-village-homestay',
      name: 'Sigiriya Village Homestay',
      location: 'Sigiriya, Matale',
      rating: 4.9,
      reviewCount: 128,
      price: 8000,
      image: '/images/homestays/sigiriya-village-homestay.jpg',
      isDemo: true,
    },
    {
      id: 'mirissa-beach-homestay',
      name: 'Mirissa Beach Homestay',
      location: 'Mirissa, Matara',
      rating: 4.8,
      reviewCount: 96,
      price: 9500,
      image: '/images/homestays/mirissa-beach-homestay.jpg',
      isDemo: true,
    },
    {
      id: 'ella-hill-view-homestay',
      name: 'Ella Hill View Homestay',
      location: 'Ella, Badulla',
      rating: 4.9,
      reviewCount: 210,
      price: 7500,
      image: '/images/homestays/ella-hill-view-homestay.jpg',
      isDemo: true,
    },
    {
      id: 'kandy-heritage-homestay',
      name: 'Kandy Heritage Homestay',
      location: 'Kandy, Central',
      rating: 4.8,
      reviewCount: 152,
      price: 10000,
      image: '/images/homestays/kandy-heritage-homestay.jpg',
      isDemo: true,
    },
  ];

  readonly featuredExperiences: readonly ExperienceItem[] = [
    {
      id: 'wildlife-safari',
      name: 'Wildlife Safari',
      location: 'Yala National Park',
      rating: 4.9,
      reviewCount: 156,
      image: '/images/experiences/wildlife-safari.webp',
      isDemo: true,
    },
    {
      id: 'tea-plantation',
      name: 'Tea Plantation Experience',
      location: 'Nuwara Eliya',
      rating: 4.8,
      reviewCount: 112,
      image: '/images/experiences/tea-plantation.webp',
      isDemo: true,
    },
    {
      id: 'cultural-village',
      name: 'Cultural Village Tour',
      location: 'Habarana',
      rating: 4.9,
      reviewCount: 98,
      image: '/images/experiences/cultural-village.webp',
      isDemo: true,
    },
    {
      id: 'trincomalee-snorkeling',
      name: 'Snorkeling in Trincomalee',
      location: 'Trincomalee',
      rating: 4.8,
      reviewCount: 124,
      image: '/images/experiences/trincomalee-snorkeling.webp',
      isDemo: true,
    },
  ];

  onExploreNow(event: Event): void {
    event.preventDefault();
    const el = document.getElementById('categories');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onViewAllHomestays(event: Event): void {
    event.preventDefault();
    const el = document.getElementById('homestays');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onViewAllExperiences(event: Event): void {
    event.preventDefault();
    this.searchFeedback.set({
      message: 'The full Experiences catalog is coming soon. Showing featured demonstration experiences below.',
      type: 'info',
    });
    const el = document.getElementById('experiences');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.searchFeedback.set(null);
      }, 4000);
    }
  }

  onTryAiPlanner(): void {
    this.searchFeedback.set({
      message: 'AI Trip Planner is launching soon! Our intelligent itinerary generator will be available in the upcoming release.',
      type: 'info',
    });
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.searchFeedback.set(null);
      }, 4000);
    }
  }

  onJoinCommunity(): void {
    this.searchFeedback.set({
      message: 'CeylonGo Community is launching soon! Connect with fellow travelers and local hosts in the upcoming release.',
      type: 'info',
    });
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.searchFeedback.set(null);
      }, 4000);
    }
  }
}
