import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminSystemSettingsService } from './admin-system-settings.service';

describe('AdminSystemSettingsService', () => {
  let service: AdminSystemSettingsService;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Super Admin',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => true,
  };

  const mockPreviewState = {
    getSystemSettings: () => ({
      general: {
        platform_name: 'CeylonGo',
        support_email: 'support@ceylongo.lk',
        contact_hotline: '+94 11 234 5678',
        maintenance_mode: false,
        default_currency: 'LKR',
        operating_timezone: 'Asia/Colombo',
      },
      security: {
        session_timeout_minutes: 60,
        max_failed_login_attempts: 5,
        password_expiry_days: 90,
        enforce_2fa_for_admins: true,
        allowed_admin_ip_ranges: '10.0.0.0/16',
      },
      service_fees: {
        homestay_commission_rate: 10.0,
        tour_guide_commission_rate: 10.0,
        rental_commission_rate: 10.0,
        artisan_marketplace_fee: 10.0,
        cancellation_grace_period_hours: 48,
      },
      notifications: {
        send_email_on_new_provider: true,
        send_email_on_verification_request: true,
        daily_digest_to_finance: true,
      },
      last_updated_at: '2026-03-24T09:05:00Z',
      updated_by_admin: 'admin@ceylongo.lk',
    }),
    updateSystemSettings: () => ({
      general: { platform_name: 'CeylonGo Updated' },
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminSystemSettingsService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminSystemSettingsService);
  });

  it('should be created and expose canManageSettings', () => {
    expect(service).toBeTruthy();
    expect(service.canManageSettings()).toBe(true);
  });

  it('should report MVP unavailable error for getSettings in live mode', () => {
    let errorMsg = '';
    service.getSettings().subscribe({
      next: () => {},
      error: (err: Error) => {
        errorMsg = err.message;
      },
    });
    expect(errorMsg).toContain('unavailable in the MVP');
  });

  it('should report MVP unavailable error for updateSettings in live mode', () => {
    let errorMsg = '';
    service.updateSettings('general', { platform_name: 'CeylonGo Updated' }).subscribe({
      next: () => {},
      error: (err: Error) => {
        errorMsg = err.message;
      },
    });
    expect(errorMsg).toContain('unavailable in the MVP');
  });
});
