export const categories = [
  { id: 'all', label: 'All Experiences', icon: 'grid', image: null },
  { id: 'hiking', label: 'Hiking & Trekking', icon: 'hiking', image: '/images/experience-categories/hiking.jpg' },
  { id: 'wildlife', label: 'Wildlife Safari', icon: 'wildlife', image: '/images/experience-categories/wildlife.webp' },
  { id: 'water', label: 'Water Activities', icon: 'water', image: '/images/experience-categories/water-activities.webp' },
  { id: 'adventure', label: 'Adventure Sports', icon: 'mountain', image: '/images/experience-categories/adventures.webp' },
  { id: 'cycling', label: 'Cycling', icon: 'cycling', image: '/images/experience-categories/cycling.webp' },
  { id: 'culture', label: 'Cultural & Village', icon: 'culture', image: '/images/experience-categories/cultural-village.webp' },
  { id: 'food', label: 'Food & Cooking', icon: 'food', image: '/images/experience-categories/cooking.webp' },
  { id: 'eco', label: 'Nature & Eco', icon: 'leaf', image: '/images/experience-categories/eco.webp' },
] as const;

export type Category = (typeof categories)[number]['id'];
export type Sort = 'popular' | 'rating' | 'price-low' | 'price-high';

export interface Experience {
  id: string;
  title: string;
  location: string;
  category: Exclude<Category, 'all'>;
  rating?: number;
  reviews?: number;
  price: number;
  unit?: 'person' | 'group';
  currency?: string;
  categoryLabel?: string;
  image?: string;
  imageAlt?: string;
  duration?: string;
  maxParticipants?: number;
}

export interface Catalog {
  preview: boolean;
  experiences: readonly Experience[];
}
