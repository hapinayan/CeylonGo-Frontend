/**
 * TypeScript Data Models for CeylonGo Artisan Traveler Frontend.
 * Aligned with verified Python FastAPI backend schemas:
 * - ArtisanListingSummary, ArtisanListingResponse, ArtisanListingPagination
 * - ShowcaseItemSummary, ShowcaseItemResponse, ShowcaseItemPagination
 * - ArtisanReviewResponse, ArtisanReviewSummaryResponse, ArtisanReviewPaginationResponse
 * - ArtisanFavoriteResponse, ArtisanFavoritePage
 * - ArtisanWishlistItemResponse, ArtisanWishlistPagination, ArtisanWishlistCheckResponse
 */

export interface ArtisanListingSummary {
  id: number;
  provider_profile_id: number;
  title: string;
  craft_category: string;
  district: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_featured: boolean;
  is_sponsored?: boolean;
  approval_status: string;
  average_rating: number | null;
  total_reviews: number;
  distance_km?: number | null;
}

export type str = string;

export interface ArtisanBusinessImage {
  id: number;
  artisan_listing_id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface ArtisanBusinessHours {
  id?: number;
  artisan_listing_id?: number;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  day_name?: string;
  is_closed: boolean;
  open_time: string | null; // "09:00"
  close_time: string | null; // "17:00"
}

export interface ArtisanListingResponse {
  id: number;
  provider_profile_id: number;
  title: string;
  craft_category: string;
  description: string | null;
  district: string;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  opening_hours: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_featured: boolean;
  approval_status: string;
  verification_status?: string;
  provider_business_name?: string | null;
  average_rating: number | null;
  total_reviews: number;
  distance_km?: number | null;
  whatsapp_link?: string | null;
  images: ArtisanBusinessImage[];
  business_images: ArtisanBusinessImage[];
  business_hours: ArtisanBusinessHours[];
  created_at: string;
  updated_at: string;
}

export interface ArtisanListingPagination {
  items: ArtisanListingSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export interface ArtisanProductImage {
  id: number;
  showcase_item_id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ShowcaseItemSummary {
  id: number;
  artisan_listing_id: number;
  title: string;
  item_type: 'product' | 'service';
  price: number | null;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  stock_quantity: number;
  sku: string | null;
  is_custom_order_available: boolean;
  approval_status: string;
}

export interface ShowcaseItemResponse {
  id: number;
  artisan_listing_id: number;
  title: string;
  item_type: 'product' | 'service';
  description: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  materials: string | null;
  duration_minutes: number | null;
  is_available: boolean;
  stock_quantity: number;
  sku: string | null;
  is_custom_order_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  approval_status: string;
  listing_title?: string | null;
  images: ArtisanProductImage[];
  product_images: ArtisanProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ShowcaseItemPagination {
  items: ShowcaseItemSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ArtisanReviewResponse {
  id: number;
  listing_reference_id: number;
  booking_reference_id: number | null;
  user_id: number;
  user_name: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_booking: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string | null;
  artisan_listing_id?: number | null;
  artisan_listing_title?: string | null;
}

export interface ArtisanReviewSummaryResponse {
  listing_id: number;
  listing_title: string;
  average_rating: number;
  total_reviews: number;
  rating_breakdown: Record<string, number>;
  verified_reviews_count: number;
}

export interface ArtisanReviewPaginationResponse {
  items: ArtisanReviewResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  average_rating: number;
  total_reviews: number;
}

export interface ArtisanFavoriteResponse {
  product_id: number;
  created_at: string;
  product: ShowcaseItemSummary;
}

export interface ArtisanFavoritePage {
  items: ArtisanFavoriteResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArtisanWishlistSavedListingSummary {
  id: number;
  provider_profile_id: number;
  title: string;
  craft_category: string;
  district: string;
  city: string;
  cover_image_url: string | null;
  approval_status: string;
  is_active: boolean;
  average_rating: number | null;
  total_reviews: number;
}

export interface ArtisanWishlistItemResponse {
  id: number;
  user_id: number;
  listing_reference_id: number;
  artisan_listing_id: number;
  notes: string | null;
  created_at: string;
  is_available: boolean;
  listing: ArtisanWishlistSavedListingSummary | null;
}

export interface ArtisanWishlistPagination {
  items: ArtisanWishlistItemResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ArtisanWishlistCheckResponse {
  listing_id: number;
  is_saved: boolean;
  wishlist_id: number | null;
}

export interface ArtisanFilterParams {
  search?: string | null;
  district?: string | null;
  category?: string | null;
  is_featured?: boolean | null;
  page?: number;
  page_size?: number;
}
