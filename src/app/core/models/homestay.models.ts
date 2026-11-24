export type HomestayCategory =
  | 'all'
  | 'mountain'
  | 'beach'
  | 'nature'
  | 'cultural'
  | 'eco'
  | 'family'
  | 'budget'
  // Backward-compatible category aliases
  | 'beachfront'
  | 'hill-country'
  | 'heritage'
  | 'village'
  | 'eco-nature'
  | 'lakeside'
  | 'city';

export interface HomestayCategoryFilter {
  id: HomestayCategory;
  name: string;
  icon: string;
  count: number;
}

export interface HomestayImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

export interface HomestayAmenity {
  id: number;
  name: string;
  icon?: string;
}

export interface HomestaySummary {
  id: number;
  name: string;
  description: string;
  location: string;
  city: string;
  district: string;
  province?: string;
  category: HomestayCategory;
  category_name: string;
  price_per_night: number;
  original_price_per_night?: number;
  discount_percent?: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_superhost?: boolean;
  image_url: string;
  images: string[];
  amenities: string[];
  cancellation_policy: string;
  free_cancellation_hours?: number;
  host_name?: string;
  host_avatar?: string;
  is_wishlisted?: boolean;
}

export interface HomestaySearchParams {
  query?: string;
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  category?: HomestayCategory;
  min_price?: number;
  max_price?: number;
  sort_by?: 'popular' | 'recommended' | 'price_low' | 'price_high' | 'rating' | 'reviews';
  amenities?: string[];
  is_verified?: boolean;
  page?: number;
  page_size?: number;
}

export interface HomestayListResponse {
  items: HomestaySummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
