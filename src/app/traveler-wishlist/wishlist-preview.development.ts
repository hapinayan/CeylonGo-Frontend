import { SavedListing } from './wishlist-model';

export const wishlistPreviewEnabled = true;
export const wishlistExamples: readonly SavedListing[] = [
  { kind: 'homestay', id: 1, title: 'Sample Ella Garden Stay', location: 'Ella', image: '/images/traveler-home/find-homestays.webp', price: 9500, currency: 'LKR', unit: 'night', savedAt: '2026-01-05' },
  { kind: 'eco', id: 1, title: 'Sample Yala Wildlife Safari', location: 'Yala', image: '/images/experiences/wildlife-safari.webp', price: 12000, currency: 'LKR', unit: 'person', savedAt: '2026-01-04' },
  { kind: 'guide', id: 1, title: 'Sample Kandy Cultural Guide', location: 'Kandy', image: '/images/traveler-home/find-tour-guide.webp', price: 7500, currency: 'LKR', unit: 'day', savedAt: '2026-01-03' },
  { kind: 'rental', id: 1, title: 'Sample Coastal Bicycle', location: 'Galle', image: '/images/traveler-home/rent-bicycle.webp', price: 2500, currency: 'LKR', unit: 'day', savedAt: '2026-01-02' },
];
