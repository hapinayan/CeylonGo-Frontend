import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ProviderPreviewService } from '../provider-preview.service';

interface ServiceOption {
  id: string;
  category: string;
  title: string;
  description: string;
  route: string;
  statusBadge: string;
  isAvailable: boolean;
  features: string[];
}

@Component({
  selector: 'app-services-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './services-catalog.html',
  styleUrl: './services-catalog.scss',
})
export class ServicesCatalog {
  private readonly previewService = inject(ProviderPreviewService);
  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly services: ServiceOption[] = [
    {
      id: 'homestay',
      category: 'Accommodation',
      title: 'Homestay & Traditional Stay',
      description:
        'List your private home, heritage bungalow, eco-lodge, or villa for global travelers seeking authentic Sri Lankan hospitality.',
      route: '/provider/homestays/new',
      statusBadge: 'Ready to List',
      isAvailable: true,
      features: [
        '6-Step Guided Creation Wizard',
        'Leaflet Interactive Location Picker',
        'Room-level Inventory & Pricing',
        'Direct Service Verification',
      ],
    },
    {
      id: 'adventure',
      category: 'Activities',
      title: 'Adventure & Experiences',
      description:
        'Offer guided hikes, surfing camps, wildlife safaris, scuba diving, and cultural workshops.',
      route: '/provider/activities/new',
      statusBadge: 'Ready to List',
      isAvailable: true,
      features: [
        'Guided Tour Packages',
        'Difficulty & Equipment Specifications',
        'Flexible Time Slot Allocation',
      ],
    },
    {
      id: 'guide',
      category: 'Guiding',
      title: 'Licensed Tour Guide',
      description:
        'Offer your personal guiding services, multi-lingual expertise, and scheduled tour packages.',
      route: '/provider/guides/new',
      statusBadge: 'Ready to List',
      isAvailable: true,
      features: [
        '6-Step Guided Setup & Draft Sync',
        'SLTDA License & Credentials Verification',
        'Multi-Language & Package Pricing',
        'Time-Slot Availability Management',
      ],
    },
    {
      id: 'rentals',
      category: 'Transport',
      title: 'Bike & Bicycle Rental',
      description:
        'List scooters, motorbikes, and touring or city bicycles for travelers with fleet unit tracking and daily availability.',
      route: '/provider/rentals/new',
      statusBadge: 'Ready to List',
      isAvailable: true,
      features: [
        '6-Step Fleet & Listing Wizard',
        'Scooters, Motorbikes & Bicycles',
        'Individual Fleet Units & Date Blocking',
        'Service Verification & Daily LKR Pricing',
      ],
    },
    {
      id: 'artisan',
      category: 'Local Business',
      title: 'Artisan & Local Business',
      description:
        'Promote authentic Sri Lankan handicrafts, handloom textiles, spice gardens, and culinary workshops.',
      route: '/artisans',
      statusBadge: 'Explore Category',
      isAvailable: true,
      features: [
        'Showcase Handcrafted Products',
        'Workshop & Masterclass Bookings',
        'Support Sustainable Communities',
      ],
    },
  ];
}
