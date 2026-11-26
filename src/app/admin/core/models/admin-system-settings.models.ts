/**
 * Module 18 — System Settings Models
 * Super Admin configuration interface with partitioned settings.
 */

export interface GeneralPlatformSettings {
  platform_name: string;
  support_email: string;
  contact_hotline: string;
  maintenance_mode: boolean;
  default_currency: string;
  operating_timezone: string;
}

export interface SecurityPlatformSettings {
  session_timeout_minutes: number;
  max_failed_login_attempts: number;
  password_expiry_days: number;
  enforce_2fa_for_admins: boolean;
  allowed_admin_ip_ranges: string;
}

export interface ServiceFeeSettings {
  homestay_commission_rate: number;
  tour_guide_commission_rate: number;
  rental_commission_rate: number;
  artisan_marketplace_fee: number;
  cancellation_grace_period_hours: number;
}

export interface NotificationPlatformSettings {
  send_email_on_new_provider: boolean;
  send_email_on_verification_request: boolean;
  daily_digest_to_finance: boolean;
  system_alert_webhook_url?: string;
}

export interface SystemSettingsBundle {
  general: GeneralPlatformSettings;
  security: SecurityPlatformSettings;
  service_fees: ServiceFeeSettings;
  notifications: NotificationPlatformSettings;
  last_updated_at: string;
  updated_by_admin: string;
}
