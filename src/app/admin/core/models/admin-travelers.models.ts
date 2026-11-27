import { AdminPaginationParams } from './admin-pagination.models';

/**
 * Status values for traveler accounts in backend (app/models/user.py: is_active boolean).
 */
export type TravelerAccountStatus = 'active' | 'suspended';

/**
 * Valid reason codes enforced by backend (app/schemas/admin_travelers.py: TravelerStatusUpdate).
 */
export type TravelerDeactivationReasonCode =
  | 'policy_violation'
  | 'fraud_suspected'
  | 'security_risk'
  | 'user_requested'
  | 'administrative_action';

export type TravelerReactivationReasonCode =
  | 'appeal_approved'
  | 'security_cleared'
  | 'issue_resolved'
  | 'administrative_review';

export type TravelerStatusReasonCode =
  | TravelerDeactivationReasonCode
  | TravelerReactivationReasonCode;

export const DEACTIVATION_REASON_CODES: readonly TravelerDeactivationReasonCode[] = [
  'policy_violation',
  'fraud_suspected',
  'security_risk',
  'user_requested',
  'administrative_action',
] as const;

export const REACTIVATION_REASON_CODES: readonly TravelerReactivationReasonCode[] = [
  'appeal_approved',
  'security_cleared',
  'issue_resolved',
  'administrative_review',
] as const;

/**
 * Human-readable display descriptions for status reason codes.
 */
export const TRAVELER_REASON_CODE_LABELS: Record<TravelerStatusReasonCode, string> = {
  policy_violation: 'Terms of Service / Policy Violation',
  fraud_suspected: 'Suspected Fraudulent Activity',
  security_risk: 'Security Risk / Suspicious Behavior',
  user_requested: 'Voluntary Account Deactivation Request',
  administrative_action: 'General Administrative Action',
  appeal_approved: 'Account Appeal Approved',
  security_cleared: 'Security Investigation Cleared',
  issue_resolved: 'Dispute / Issue Fully Resolved',
  administrative_review: 'Routine Administrative Review Passed',
};

/**
 * Validates that reason_code is compliant with the target is_active state.
 * Directly mirrors backend validator check_reason_for_status in app/schemas/admin_travelers.py.
 */
export function isValidTravelerStatusReason(
  isActive: boolean,
  reasonCode: string
): boolean {
  if (isActive) {
    return (REACTIVATION_REASON_CODES as readonly string[]).includes(reasonCode);
  }
  return (DEACTIVATION_REASON_CODES as readonly string[]).includes(reasonCode);
}

/**
 * Traveler account model matching backend TravelerAccount (app/schemas/admin_travelers.py).
 */
export interface TravelerAccount {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Query parameters for GET /api/v1/admin/travelers
 */
export interface TravelerQueryParams extends AdminPaginationParams {
  is_active?: boolean | null;
  search?: string;
  page_size?: number; // Backend supports page_size alias for limit
}

/**
 * Paginated directory response matching backend TravelerDirectory (app/schemas/admin_travelers.py).
 */
export interface TravelerDirectory {
  items: TravelerAccount[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Request payload for PATCH /api/v1/admin/travelers/{traveler_id}/status
 * (app/schemas/admin_travelers.py: TravelerStatusUpdate)
 */
export interface TravelerStatusUpdate {
  is_active: boolean;
  reason_code: TravelerStatusReasonCode;
  note: string; // min_length: 1, max_length: 500
}

/**
 * Audit history event matching backend TravelerStatusEvent
 * GET /api/v1/admin/travelers/{traveler_id}/history
 */
export interface TravelerStatusEvent {
  admin_user_id: number;
  created_at: string;
  previous_is_active: boolean;
  is_active: boolean;
  reason_code: TravelerStatusReasonCode;
  note: string;
}
