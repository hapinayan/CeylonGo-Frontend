/**
 * Module 13 — Community Management Models
 * Matches backend `community.py` and review moderation contracts.
 */

export type CommunityReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type CommunityEntityType = 'post' | 'comment' | 'profile' | 'hashtag';

export interface AdminCommunityReportItem {
  id: number;
  entity_type: CommunityEntityType;
  entity_id: number;
  reporter_id: number;
  reporter_name: string;
  reported_user_id: number;
  reported_user_name: string;
  reason: string;
  details?: string;
  status: CommunityReportStatus;
  action_taken?: string;
  moderator_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface AdminCommunityReportListResponse {
  items: AdminCommunityReportItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CommunityQueryParams {
  status?: string;
  entity_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ModerateContentPayload {
  action: 'approve' | 'hide' | 'remove' | 'suspend_author';
  reason: string;
  notes?: string;
}
