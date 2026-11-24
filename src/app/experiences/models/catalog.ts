export const categories = [
  { id: 'all', label: 'All Experiences', icon: 'grid' },
  { id: 'culture', label: 'Local Culture', icon: 'culture' },
  { id: 'adventure', label: 'Adventure', icon: 'mountain' },
  { id: 'eco', label: 'Eco-Tourism', icon: 'leaf' },
  { id: 'wildlife', label: 'Wildlife Safari', icon: 'wildlife' },
  { id: 'water', label: 'Water Activities', icon: 'water' },
  { id: 'food', label: 'Food & Cooking', icon: 'food' },
  { id: 'hiking', label: 'Hiking & Trekking', icon: 'hiking' },
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
}

export interface Catalog {
  preview: boolean;
  experiences: readonly Experience[];
}
