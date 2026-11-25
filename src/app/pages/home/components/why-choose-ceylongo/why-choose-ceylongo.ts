import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WhyUsFeature {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: 'community' | 'artisan' | 'direct' | 'ai' | 'platform';
}

@Component({
  selector: 'app-why-choose-ceylongo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './why-choose-ceylongo.html',
  styleUrls: ['./why-choose-ceylongo.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhyChooseCeylongo {
  readonly features: readonly WhyUsFeature[] = [
    {
      id: 'community-tourism',
      title: 'Community-Based Tourism',
      description: 'Supporting sustainable, community-led initiatives across all Sri Lankan districts.',
      icon: 'community',
    },
    {
      id: 'artisan-promotion',
      title: 'Local Business & Artisan Promotion',
      description: 'Direct showcase and economic empowerment for local craftspeople and homestay families.',
      icon: 'artisan',
    },
    {
      id: 'direct-connections',
      title: 'Direct Local Connections',
      description: 'Transparent communication directly with verified hosts without hidden middleman fees.',
      icon: 'direct',
    },
    {
      id: 'ai-trip-planning',
      title: 'AI-Powered Travel Planning',
      description: 'Smart personalized daily itineraries tailored to your unique interests and travel style.',
      icon: 'ai',
    },
    {
      id: 'all-in-one-platform',
      title: 'All-in-One Local Tourism Platform',
      description: 'Seamless booking for homestays, local experiences, tour guides, and bike rentals in one place.',
      icon: 'platform',
    },
  ];
}
