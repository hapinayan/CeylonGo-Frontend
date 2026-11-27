/**
 * Module 15 — Profile & Settings Models
 * Matches backend `admin_auth.py` and session preferences.
 */

import { AdminRole, AdminUser } from './admin-auth.models';

export interface AdminProfileDetails extends AdminUser {
  phone?: string;
  department?: string;
  last_login?: string;
  assigned_provinces?: string[];
  notification_preferences: {
    email_alerts: boolean;
    verification_notifications: boolean;
    financial_summaries: boolean;
    security_alerts: boolean;
  };
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  notification_preferences?: {
    email_alerts: boolean;
    verification_notifications: boolean;
    financial_summaries: boolean;
    security_alerts: boolean;
  };
}
