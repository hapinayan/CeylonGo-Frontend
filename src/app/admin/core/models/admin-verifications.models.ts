import { ProviderApprovalStatus } from './admin-providers.models';

/**
 * Valid verification document types accepted by the backend streaming endpoint
 * GET /api/v1/admin/providers/{provider_id}/documents/{document_type}
 * (app/routers/admin_providers.py: ALLOWED_DOCUMENT_TYPES = {"selfie", "nic_front", "nic_back"})
 */
export type VerificationDocumentType = 'selfie' | 'nic_front' | 'nic_back';

/**
 * Display names for identity documents.
 */
export const VERIFICATION_DOCUMENT_TITLES: Record<VerificationDocumentType, string> = {
  selfie: 'Live Selfie / Photo',
  nic_front: 'National ID / Passport (Front)',
  nic_back: 'National ID (Back)',
};

/**
 * Document representation for UI inspection.
 */
export interface VerificationDocument {
  type: VerificationDocumentType;
  title: string;
  isAvailable: boolean;
  mimeType?: string;
  previewUrl?: string;
  fileSizeBytes?: number;
}

/**
 * Lightweight verification queue item for Module 05.
 */
export interface ProviderVerificationItem {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  business_name: string;
  provider_type: string;
  district: string;
  approval_status: ProviderApprovalStatus;
  created_at: string;
  documents: VerificationDocument[];
}

/**
 * Query parameters for filtering verification queue requests
 */
export interface VerificationQueryParams {
  status?: ProviderApprovalStatus | 'all';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated envelope for verification queue
 */
export interface VerificationQueueResponse {
  items: ProviderVerificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Request payload for provider rejection
 * POST /api/v1/admin/providers/{provider_id}/reject
 * (app/schemas/admin_providers.py: RejectProviderRequest)
 */
export interface RejectProviderRequest {
  reason: string; // min_length: 5, max_length: 500
}

/**
 * Response model for approval/rejection actions
 * (app/schemas/admin_providers.py: ProviderReviewActionResponse)
 */
export interface ProviderReviewActionResponse {
  success: boolean;
  provider_id: number;
  approval_status: ProviderApprovalStatus;
  rejection_reason?: string | null;
  message: string;
  email_sent: boolean;
}
