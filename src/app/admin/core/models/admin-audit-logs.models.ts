/**
 * Module 17 — Audit Logs Models
 * Matches backend `admin_audit_logs.py` and `AdminAuditLogListResponse`.
 */

export interface AuditActorSummary {
  id: number;
  full_name: string;
  email: string;
  role: string;
  admin_role: string;
}

export interface AdminAuditLogItem {
  id: number;
  admin_user_id: number;
  action_type: string;
  entity_type: string;
  entity_id?: string | number | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  actor?: AuditActorSummary | null;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogQueryParams {
  admin_user_id?: number;
  action_type?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
