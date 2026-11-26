import { AdminPaginationParams } from './admin-pagination.models';

/**
 * Valid provider types supported by CeylonGo backend (app/schemas/provider_registration.py: VALID_PROVIDER_TYPES).
 * Perfectly maps to Academic MVP and assignment categories:
 * - 'homestay' -> Homestay
 * - 'tour_guide' -> Tour Guide
 * - 'activity' -> Adventure and Activities
 * - 'eco_tourism' -> Eco Tourism
 * - 'artisan' -> Local Artisan and Small Business
 * - 'rental' -> Bike and Bicycle Rentals
 */
export type ProviderType =
  | 'homestay'
  | 'tour_guide'
  | 'activity'
  | 'eco_tourism'
  | 'artisan'
  | 'rental';

export type ProviderCategory = ProviderType;

/**
 * Backend approval status values (app/routers/admin_providers.py).
 */
export type ProviderApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Human-readable category labels for UI presentation.
 */
export const PROVIDER_CATEGORY_DISPLAY_NAMES: Record<ProviderCategory, string> = {
  homestay: 'Homestay',
  tour_guide: 'Tour Guide',
  activity: 'Adventure & Activities',
  eco_tourism: 'Eco Tourism',
  artisan: 'Local Artisan & Small Business',
  rental: 'Bike & Bicycle Rentals',
};

/**
 * Summary item for provider directory listing (ProviderListItemResponse in backend).
 */
export interface ProviderListItem {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  business_name: string;
  provider_type: ProviderType;
  district: string;
  approval_status: ProviderApprovalStatus;
  created_at: string;
}

/**
 * Deep inspection model for provider application (ProviderDetailResponse in backend).
 */
export interface ProviderDetailResponse {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;

  // Personal details
  phone: string;
  identity_document_type: string;
  nic_number?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  permanent_province?: string | null;
  permanent_district?: string | null;
  permanent_city?: string | null;
  permanent_landmark?: string | null;
  permanent_postal_code?: string | null;

  // Business details
  business_name: string;
  provider_type: ProviderType;
  secondary_phone?: string | null;
  district: string;
  business_province?: string | null;
  business_district?: string | null;
  business_city?: string | null;
  business_landmark?: string | null;
  business_postal_code?: string | null;
  business_registration_number?: string | null;
  description?: string | null;

  // Approval workflow
  approval_status: ProviderApprovalStatus;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  reviewer_name?: string | null;
  rejection_reason?: string | null;

  // Document availability flags (safe boolean indicators, never raw file paths)
  selfie_uploaded: boolean;
  nic_front_uploaded: boolean;
  nic_back_uploaded: boolean;
}

/**
 * Query parameters for GET /api/v1/admin/providers
 */
export interface ProviderQueryParams extends AdminPaginationParams {
  status?: ProviderApprovalStatus;
  search?: string;
  category?: ProviderCategory;
}

/**
 * Paginated response envelope from backend (ProviderListResponse).
 */
export interface ProviderListResponse {
  items: ProviderListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
