/**
 * Module 07 — Adventure Management API Models & Contracts.
 * Strictly aligned with FastAPI router app/routers/admin_activities.py and app/schemas/activity*.py.
 * Strictly maintains separation from Eco-Tourism (EcoExperience) domain.
 */

export type ActivityApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'draft';

export type ActivityCategory =
  | 'hiking'
  | 'surfing'
  | 'rafting'
  | 'rock_climbing'
  | 'scuba_diving'
  | 'wildlife_safari'
  | 'cultural_tour'
  | 'cycling'
  | 'other';

export type ActivityDifficulty = 'easy' | 'moderate' | 'challenging' | 'extreme';

export interface ActivityResponse {
  id: number;
  provider_id?: number;
  provider_business_name?: string;
  title: string;
  description: string;
  category: ActivityCategory | string;
  location: string;
  city: string;
  district: string;
  province?: string;
  price_per_person: number;
  duration_hours: number;
  difficulty_level: ActivityDifficulty | string;
  max_participants: number;
  min_participants: number;
  included_items?: string[];
  requirements?: string[];
  safety_guidelines?: string[];
  license_required?: boolean;
  certification_details?: string;
  meeting_point?: string;
  is_active: boolean;
  approval_status: ActivityApprovalStatus;
  reviewed_by?: number;
  reviewed_at?: string;
  rejection_reason?: string;
  primary_image_url?: string;
  images?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ActivityApprovalRequest {
  notes?: string;
}

export interface ActivityRejectionRequest {
  reason: string;
}

export interface ActivityAdminSummary {
  total: number;
  pending_approval: number;
  approved: number;
  rejected: number;
}

export interface ActivityQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  province?: string;
  district?: string;
  search?: string;
}

export interface ActivityListResponse {
  items: ActivityResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
