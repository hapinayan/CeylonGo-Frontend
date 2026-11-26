/**
 * Module 16 — Admin Management & Invitations Models
 * Super Admin restricted administrative user governance.
 */

import { AdminRole, AdminUser } from './admin-auth.models';

export interface AdminAccountItem extends AdminUser {
  department?: string;
  last_active?: string;
  created_by?: string;
  status: 'active' | 'inactive' | 'invited';
}

export interface AdminInvitationRequest {
  email: string;
  full_name: string;
  role: AdminRole;
  department?: string;
  invitation_note?: string;
}

export interface AdminManagementQueryParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
