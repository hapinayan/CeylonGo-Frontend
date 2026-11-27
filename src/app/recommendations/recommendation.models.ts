export type Category = 'homestay' | 'adventure' | 'guide' | 'bike' | 'bicycle' | 'artisan';
export type Kind =
  | 'recommended_for_you'
  | 'because_you_viewed'
  | 'based_on_your_interests'
  | 'favorite_destinations'
  | 'popular_experiences'
  | 'discover_something_new';
export type Unit = 'per_night' | 'per_day' | 'per_participant' | 'per_person' | 'per_group';
export type ActivityCategory =
  | 'hiking-trekking'
  | 'wildlife-safari'
  | 'water-activities'
  | 'adventure-sports'
  | 'cycling'
  | 'cultural-village'
  | 'food-cooking'
  | 'nature-eco';
export type RentalSubtype = 'motorcycle' | 'scooter' | 'city' | 'mountain' | 'road' | 'hybrid';

export interface Card {
  listing_id: number;
  category: Category;
  title: string;
  short_description: string;
  district: string;
  location: string;
  cover_image_url: string | null;
  starting_price: string | null;
  currency: string | null;
  pricing_unit: Unit | null;
  rating: number | null;
  recommendation_score: number;
  recommendation_reason: string;
  detail_route: string;
  bookable: boolean;
}

export interface Group {
  recommendation_type: Kind | 'similar_services';
  items: Card[];
}
export interface Home {
  sections: Group[];
}
export interface Filters {
  category?: Category;
  district?: string;
  limit?: number;
}
export interface Settings {
  behavioral_personalization: boolean;
}
export interface Search {
  event_type: 'search';
  category?: Category;
  search_query?: string;
  district?: string;
  destination?: string;
  filters?: {
    activity_category?: ActivityCategory;
    rental_subtype?: RentalSubtype;
    min_price?: number;
    max_price?: number;
    pricing_unit?: Unit;
  };
}
export interface View {
  event_type: 'view';
  listing_id: number;
  category: Category;
}
export interface ActivityResult {
  recorded: boolean;
  reason: 'recorded' | 'duplicate' | 'personalization_disabled';
}
export const DETAIL_PATH: Record<Category, string> = {
  homestay: '/homestays',
  adventure: '/experiences',
  guide: '/tour-guides',
  bike: '/bicycles',
  bicycle: '/bicycles',
  artisan: '/artisans',
};
