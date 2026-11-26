export type TourGuideApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type TourGuideVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';
export type CredentialType = 'sltda_license' | 'first_aid' | 'degree' | 'wildlife_permit' | 'driving_license' | 'other';
export type LicenseType = 'national' | 'chauffeur' | 'site' | 'area';
export type ProficiencyLevel = 'basic' | 'conversational' | 'fluent' | 'native';

export interface TourGuideLanguage {
  id: number;
  tour_guide_id: number;
  language_code: string;
  proficiency_level: ProficiencyLevel;
}

export interface TourGuideServiceArea {
  id: number;
  tour_guide_id: number;
  area_name: string;
  district?: string;
  is_primary: boolean;
}

export interface TourGuideImage {
  id: number;
  tour_guide_id: number;
  image_url: string;
  caption?: string;
  is_primary: boolean;
}

export interface TourGuidePackage {
  id: number;
  tour_guide_id: number;
  title: string;
  description: string;
  duration_hours: number;
  price: number;
  pricing_type: 'per_person' | 'per_group';
  max_participants: number;
  is_active: boolean;
}

export interface TourGuideCredential {
  id: number;
  tour_guide_id: number;
  credential_type: CredentialType;
  title: string;
  issuing_authority: string;
  license_number?: string;
  expiry_date?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  document_url?: string;
  created_at: string;
}

export interface TourGuideVerificationRecord {
  id: number;
  tour_guide_id: number;
  credential_id?: number;
  reviewed_by: number;
  verification_type: string;
  status: string;
  notes?: string;
  rejection_reason?: string;
  verified_at: string;
}

export interface AdminTourGuideListItem {
  id: number;
  provider_profile_id: number;
  business_name: string;
  provider_name: string;
  email: string;
  base_city: string;
  base_district: string;
  province?: string;
  daily_rate: number;
  currency: string;
  approval_status: TourGuideApprovalStatus;
  verification_status: TourGuideVerificationStatus;
  is_active: boolean;
  is_available: boolean;
  years_of_experience: number;
  rating_average?: number;
  review_count: number;
  pending_credentials_count: number;
  approved_credentials_count: number;
  created_at: string;
}

export interface AdminTourGuideListResponse {
  items: AdminTourGuideListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminTourGuideDetailResponse {
  guide: {
    id: number;
    provider_profile_id: number;
    bio: string;
    years_of_experience: number;
    specialties?: string;
    license_number?: string;
    license_type?: LicenseType;
    license_expiry_date?: string;
    hourly_rate?: number;
    daily_rate: number;
    currency: string;
    base_city: string;
    base_district: string;
    province?: string;
    is_available: boolean;
    approval_status: TourGuideApprovalStatus;
    verification_status: TourGuideVerificationStatus;
    is_active: boolean;
    rating_average?: number;
    review_count: number;
    cancellation_policy?: string;
    max_group_size: number;
    created_at: string;
  };
  business_name: string;
  provider_name: string;
  email: string;
  phone?: string;
  secondary_phone?: string;
  provider_approval_status: string;
  languages: TourGuideLanguage[];
  service_areas: TourGuideServiceArea[];
  images: TourGuideImage[];
  packages: TourGuidePackage[];
  credentials: TourGuideCredential[];
  verification_history: TourGuideVerificationRecord[];
}

export interface TourGuideQueryParams {
  approval_status?: string;
  verification_status?: string;
  district?: string;
  province?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TourGuideKPIs {
  total_guides: number;
  active_guides: number;
  pending_approval: number;
  verified_guides: number;
}

export interface TourGuideDecisionPayload {
  reason: string;
}

export interface TourGuideBadgePayload {
  action: 'grant' | 'revoke';
  notes?: string;
  audit_evidence_summary?: string;
}

export interface CredentialVerifyPayload {
  status: 'approved' | 'rejected' | 'pending';
  verification_type: string;
  notes?: string;
  rejection_reason?: string;
}
