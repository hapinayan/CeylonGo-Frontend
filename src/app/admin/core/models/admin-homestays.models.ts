/**
 * Module 06 — Homestay Management API Models & Contracts.
 * Strictly aligned with FastAPI router app/routers/admin_homestays.py and app/schemas/homestay*.py.
 */

export type HomestayApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'draft';
export type HomestayVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface HomestayAmenity {
  id: number;
  homestay_id: number;
  amenity_name: string;
  icon_name?: string;
  is_featured?: boolean;
}

export interface HomestayImage {
  id: number;
  homestay_id: number;
  image_url: string;
  is_primary: boolean;
  caption?: string;
  display_order?: number;
}

export interface HomestayResponse {
  id: number;
  provider_profile_id?: number;
  owner_id?: number;
  name: string;
  description: string;
  address?: string;
  location: string;
  city: string;
  district: string;
  province: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  price_per_night: number;
  cleaning_fee?: number;
  max_guests: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  property_type?: string;
  room_type?: string;
  cancellation_policy?: string;
  check_in_time?: string;
  check_out_time?: string;
  house_rules?: string[];
  is_active: boolean;
  approval_status: HomestayApprovalStatus;
  verification_status: HomestayVerificationStatus;
  reviewed_by?: number;
  reviewed_at?: string;
  rejection_reason?: string;
  images?: HomestayImage[];
  amenities?: HomestayAmenity[];
  is_sponsored?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HomestayReviewRequest {
  decision: 'approved' | 'rejected' | 'suspended';
  reason?: string;
}

export interface HomestayVerificationRequest {
  verification_status: 'verified' | 'unverified' | 'rejected';
  notes?: string;
}

export interface HomestayAdminListingSummary {
  total: number;
  approved: number;
  pending_approval: number;
  draft: number;
  rejected: number;
  suspended: number;
}

export interface HomestayAdminBookingSummary {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
}

export interface HomestayAdminPaymentSummary {
  total_online_payments_count: number;
  total_online_payments_volume: number;
  pending_refunds_count: number;
  pending_refunds_volume: number;
  currency: string;
}

export interface HomestayAdminCampaignSummary {
  total_campaigns: number;
  active_campaigns: number;
  pending_approval_campaigns: number;
  total_campaign_budget: number;
  currency: string;
}

export interface HomestayAdminReviewSummary {
  total_reviews: number;
  pending_moderation: number;
  approved_reviews: number;
  rejected_reviews: number;
}

export interface HomestayAdminDashboardResponse {
  listings: HomestayAdminListingSummary;
  bookings: HomestayAdminBookingSummary;
  payments: HomestayAdminPaymentSummary;
  settlements?: { currency: string };
  campaigns: HomestayAdminCampaignSummary;
  reviews: HomestayAdminReviewSummary;
}

export interface HomestayQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  province?: string;
  district?: string;
  search?: string;
  verification_status?: string;
}

export interface HomestayListResponse {
  items: HomestayResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
