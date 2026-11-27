import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  GeneralPlatformSettings,
  NotificationPlatformSettings,
  SecurityPlatformSettings,
  ServiceFeeSettings,
  SystemSettingsBundle,
} from '../../core/models/admin-system-settings.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminSystemSettingsService } from '../../core/services/admin-system-settings.service';

@Component({
  selector: 'app-admin-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-system-settings.component.html',
  styleUrls: ['./admin-system-settings.component.scss'],
})
export class AdminSystemSettingsComponent implements OnInit {
  private readonly settingsService = inject(AdminSystemSettingsService);
  private readonly authService = inject(AdminAuthService);

  readonly canManageSettings = this.settingsService.canManageSettings;
  readonly currentUser = this.authService.currentUser;

  activeTab: 'general' | 'security' | 'service_fees' | 'notifications' = 'general';
  settings: SystemSettingsBundle | null = null;
  isLoading = false;
  isSaving = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Local editable copies
  generalForm: GeneralPlatformSettings = {
    platform_name: '',
    support_email: '',
    contact_hotline: '',
    maintenance_mode: false,
    default_currency: 'LKR',
    operating_timezone: 'Asia/Colombo',
  };

  securityForm: SecurityPlatformSettings = {
    session_timeout_minutes: 60,
    max_failed_login_attempts: 5,
    password_expiry_days: 90,
    enforce_2fa_for_admins: false,
    allowed_admin_ip_ranges: '',
  };

  feesForm: ServiceFeeSettings = {
    homestay_commission_rate: 10,
    tour_guide_commission_rate: 12,
    rental_commission_rate: 8,
    artisan_marketplace_fee: 5,
    cancellation_grace_period_hours: 24,
  };

  notificationsForm: NotificationPlatformSettings = {
    send_email_on_new_provider: true,
    send_email_on_verification_request: true,
    daily_digest_to_finance: true,
    system_alert_webhook_url: '',
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  setTab(tab: 'general' | 'security' | 'service_fees' | 'notifications'): void {
    this.activeTab = tab;
    this.successMessage = null;
    this.errorMessage = null;
  }

  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getSettings().subscribe({
      next: (bundle) => {
        this.settings = bundle;
        this.generalForm = { ...bundle.general };
        this.securityForm = { ...bundle.security };
        this.feesForm = { ...bundle.service_fees };
        this.notificationsForm = { ...bundle.notifications };
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to load system settings.';
      },
    });
  }

  saveSection(section: 'general' | 'security' | 'service_fees' | 'notifications'): void {
    if (!this.canManageSettings()) {
      this.errorMessage = 'Super Admin authorization required to modify system configuration.';
      return;
    }

    this.isSaving = true;
    this.successMessage = null;
    this.errorMessage = null;

    let payload: Record<string, unknown> = {};
    if (section === 'general') payload = { ...this.generalForm };
    if (section === 'security') payload = { ...this.securityForm };
    if (section === 'service_fees') payload = { ...this.feesForm };
    if (section === 'notifications') payload = { ...this.notificationsForm };

    this.settingsService.updateSettings(section, payload).subscribe({
      next: (updatedBundle) => {
        this.settings = updatedBundle;
        this.generalForm = { ...updatedBundle.general };
        this.securityForm = { ...updatedBundle.security };
        this.feesForm = { ...updatedBundle.service_fees };
        this.notificationsForm = { ...updatedBundle.notifications };
        this.isSaving = false;
        this.successMessage = `System settings (${section.replace('_', ' ')}) updated successfully.`;
        setTimeout(() => (this.successMessage = null), 4000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err?.message || 'Failed to update settings.';
      },
    });
  }
}
