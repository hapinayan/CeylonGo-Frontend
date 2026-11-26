export type ArtisanApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ArtisanCraftCategory =
  | 'handicrafts'
  | 'textiles'
  | 'pottery'
  | 'woodwork'
  | 'jewelry'
  | 'tea_spices'
  | 'leather'
  | 'other';

export interface AdminArtisanListingItem {
  id: number;
  provider_profile_id: number;
  title: string;
  craft_category: string;
  district: string;
  province?: string;
  city: string;
  is_active: boolean;
  is_verified: boolean;
  is_featured: boolean;
  approval_status: ArtisanApprovalStatus;
  verification_status: string;
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  provider_business_name?: string | null;
  phone?: string;
  email?: string;
  description?: string;
  products_count?: number;
}

export interface AdminArtisanProductItem {
  id: number;
  artisan_listing_id: number;
  title: string;
  item_type: string;
  price: number;
  currency: string;
  stock_quantity: number;
  sku?: string | null;
  is_available: boolean;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  listing_title?: string | null;
  image_url?: string;
}

export interface AdminArtisanReviewItem {
  id: number;
  listing_id: number;
  listing_title: string;
  user_id: number;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_booking: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminArtisanBusinessKPIs {
  total_businesses: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  suspended_count: number;
  verified_count: number;
  featured_count: number;
}

export interface ArtisanQueryParams {
  status?: string;
  search?: string;
  craft_category?: string;
  district?: string;
  province?: string;
  page?: number;
  limit?: number;
}

export interface ArtisanRejectionPayload {
  reason: string;
}

export interface ArtisanSuspendPayload {
  reason?: string;
}

export interface ArtisanReviewModerationPayload {
  is_published: boolean;
  moderation_reason?: string;
}
