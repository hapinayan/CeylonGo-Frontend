export interface TourGuide {
  id: string;
  name: string;
  avatarUrl: string;
  coverImageUrl: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  languages: string[];
  pricePerDay: number;
  currency: string;
  location: string;
  categoryIds: string[];
  headline?: string;
  about?: string;
  specialties?: string[];
  isFavorite?: boolean;
  featuredRank?: number;
  phone?: string;
  email?: string;
}

export interface TourCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  count?: number;
}

export type TourGuideSortBy = 'top_rated' | 'price_asc' | 'price_desc' | 'experience';

export interface TourGuideFilter {
  query: string;
  location: string;
  date: string | null;
  travelers: number;
  categoryId: string;
  sortBy: TourGuideSortBy;
  languages: string[];
  minPrice: number | null;
  maxPrice: number | null;
  verifiedOnly: boolean;
}

export interface TourGuidePagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TravelerNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'system' | 'message';
}

/**
 * Proposed Backend API Contracts
 * [UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]
 */
export interface BackendTourGuideItem {
  id: number;
  provider_profile_id?: number;
  full_name: string;
  avatar_url?: string;
  cover_image_url?: string;
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  experience_years: number;
  languages: string[];
  price_per_day: number;
  currency: string;
  district: string;
  city?: string;
  category_ids: string[];
  headline?: string;
  about?: string;
  specialties?: string[];
  phone?: string;
  email?: string;
  is_favorite?: boolean;
}

export interface BackendTourGuidePaginationResponse {
  items: BackendTourGuideItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TourGuideBookingRequest {
  guide_id: string | number;
  tour_date: string;
  duration_days: number;
  travelers_count: number;
  notes?: string;
}
