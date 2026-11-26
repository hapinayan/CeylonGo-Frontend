/**
 * Module 08 — Bike and Bicycle Rental Management API Models & Contracts.
 * Strictly aligned with FastAPI router app/routers/admin_rentals.py and app/schemas/admin_rentals.py.
 * Accurately distinguishes motorized vehicles (requiring revenue license and insurance)
 * from bicycles (which have zero motor vehicle licensing requirements).
 */

export type RentalVehicleType = 'bike' | 'bicycle' | 'tuk_tuk';
export type RentalApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RentalVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type RentalVehicleStatus = 'available' | 'rented' | 'maintenance' | 'reserved' | 'retired';

export type RentalDocumentType =
  | 'revenue_license'
  | 'insurance_certificate'
  | 'registration_book'
  | 'fitness_certificate'
  | 'other';

export interface AdminVehicleListItem {
  id: number;
  provider_id: number;
  provider_business_name: string;
  vehicle_name: string;
  vehicle_type: RentalVehicleType;
  license_plate?: string;
  price_per_day: number;
  district: string;
  province?: string;
  status: RentalVehicleStatus;
  approval_status: RentalApprovalStatus;
  verification_status: RentalVerificationStatus;
  primary_image_url?: string;
  created_at: string;
}

export interface AdminVehicleListResponse {
  items: AdminVehicleListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminVehicleDetailResponse {
  id: number;
  provider_id: number;
  provider_business_name: string;
  provider_name?: string;
  provider_phone?: string;
  provider_approval_status?: string;
  vehicle_name: string;
  vehicle_type: RentalVehicleType;
  model_year?: number;
  license_plate?: string;
  seating_capacity?: number;
  transmission?: string;
  fuel_type?: string;
  price_per_day: number;
  district: string;
  province?: string;
  city?: string;
  location_name?: string;
  status: RentalVehicleStatus;
  approval_status: RentalApprovalStatus;
  verification_status: RentalVerificationStatus;
  reviewed_at?: string;
  reviewed_by?: number;
  rejection_reason?: string;
  cancellation_policy?: string;
  free_cancellation_hours?: number;
  images_count: number;
  primary_image_url?: string;
  documents_count: number;
  verified_documents_count: number;
  rate_plans_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminVehicleReviewRequest {
  decision: 'approved' | 'rejected' | 'suspended';
  reason?: string;
  notes?: string;
}

export interface AdminVehicleReviewResponse {
  success: boolean;
  vehicle_id: number;
  approval_status: RentalApprovalStatus;
  message: string;
  reviewed_at?: string;
}

export interface AdminVehicleDocumentItem {
  id: number;
  vehicle_id: number;
  document_type: RentalDocumentType;
  document_url: string;
  is_verified: boolean;
  verification_notes?: string;
  expiry_date?: string;
  verified_at?: string;
  created_at?: string;
}

export interface AdminVehicleVerifyStatusRequest {
  verification_status: 'verified' | 'unverified' | 'rejected';
  notes?: string;
}

export interface AdminVehicleVerifyStatusResponse {
  success: boolean;
  vehicle_id: number;
  verification_status: RentalVerificationStatus;
  message: string;
}

export interface AdminRentalFleetSummaryResponse {
  total_vehicles: number;
  pending_approval: number;
  approved_vehicles: number;
  verified_vehicles: number;
  rejected_vehicles: number;
  total_providers: number;
}

export interface RentalQueryParams {
  page?: number;
  page_size?: number;
  approval_status?: string;
  verification_status?: string;
  vehicle_type?: string;
  provider_id?: number;
  province?: string;
  district?: string;
  search?: string;
}
