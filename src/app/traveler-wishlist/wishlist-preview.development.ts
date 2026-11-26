import { SavedListing } from './wishlist-model';

export const wishlistPreviewEnabled = true;
export const wishlistExamples: readonly SavedListing[] = [
  { kind: 'homestay', id: 1, title: 'Sample Ella Garden Stay', location: 'Ella', image: '/images/traveler-home/find-homestays.webp', price: 9500, currency: 'LKR', unit: 'night', savedAt: '2026-01-05' },
  { kind: 'eco', id: 1, title: 'Sample Bentota Mangrove Tour', location: 'Bentota', image: '/images/experiences/bentota-mangroves.webp', savedAt: '2026-01-04' },
  { kind: 'rental', id: 1, title: 'Sample Coastal Bicycle', location: 'Galle', image: '/assets/rental-preview/mountain-bicycle.webp', price: 2500, currency: 'LKR', unit: 'day', savedAt: '2026-01-03' },
  { kind: 'artisan-business', id: 1, title: 'Sample Ruhunu Pottery Studio', location: 'Matara', image: '/images/artisan/ruhunu_pottery.jpg', savedAt: '2026-01-02' },
  { kind: 'artisan-product', id: 1, title: 'Sample Handmade Clay Pot', location: 'Matara', image: '/images/artisan/product_clay_pot.jpg', savedAt: '2026-01-01' },
];
