import { ActivityCategorySlug, ActivitySort } from './activity';

export const categories = [
  { id: 'all', label: 'All Experiences', icon: 'grid', image: null },
  { id: 'hiking-trekking', label: 'Hiking & Trekking', icon: 'hiking', image: '/images/experience-categories/hiking.jpg' },
  { id: 'wildlife-safari', label: 'Wildlife Safari', icon: 'wildlife', image: '/images/experience-categories/wildlife.webp' },
  { id: 'water-activities', label: 'Water Activities', icon: 'water', image: '/images/experience-categories/water-activities.webp' },
  { id: 'adventure-sports', label: 'Adventure Sports', icon: 'mountain', image: '/images/experience-categories/adventures.webp' },
  { id: 'cycling', label: 'Cycling', icon: 'cycling', image: '/images/experience-categories/cycling.webp' },
  { id: 'cultural-village', label: 'Cultural & Village', icon: 'culture', image: '/images/experience-categories/cultural-village.webp' },
  { id: 'food-cooking', label: 'Food & Cooking', icon: 'food', image: '/images/experience-categories/cooking.webp' },
  { id: 'nature-eco', label: 'Nature & Eco', icon: 'leaf', image: '/images/experience-categories/eco.webp' },
] as const;

export type Category = (typeof categories)[number]['id'];
export type Sort = ActivitySort;

const LEGACY_CATEGORY_ALIASES: Record<string, ActivityCategorySlug> = {
  hiking: 'hiking-trekking',
  wildlife: 'wildlife-safari',
  water: 'water-activities',
  adventure: 'adventure-sports',
  adventures: 'adventure-sports',
  cycling: 'cycling',
  culture: 'cultural-village',
  village: 'cultural-village',
  food: 'food-cooking',
  cooking: 'food-cooking',
  eco: 'nature-eco',
};

export function normalizeCategory(value: string | null | undefined): Category {
  if (!value || value === 'all') return 'all';
  const exact = categories.find((item) => item.id === value);
  if (exact) return exact.id;
  return LEGACY_CATEGORY_ALIASES[value] ?? 'all';
}

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return 'Adventure Activity';
  return categories.find((item) => item.id === slug)?.label ?? 'Adventure Activity';
}

export interface Experience {
  id: string;
  title: string;
  location: string;
  category: Exclude<Category, 'all'> | 'unknown';
  rating?: number | null;
  reviews?: number | null;
  price: number;
  unit?: 'person' | 'group';
  currency?: string;
  categoryLabel?: string;
  image?: string;
  imageAlt?: string;
  duration?: string;
  durationMinutes?: number;
  minParticipants?: number;
  maxParticipants?: number;
}

export interface Catalog {
  preview: boolean;
  experiences: readonly Experience[];
}
