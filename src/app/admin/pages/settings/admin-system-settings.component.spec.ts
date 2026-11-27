import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SystemSettingsBundle } from '../../core/models/admin-system-settings.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminSystemSettingsService } from '../../core/services/admin-system-settings.service';
import { AdminSystemSettingsComponent } from './admin-system-settings.component';

describe('AdminSystemSettingsComponent', () => {
  let component: AdminSystemSettingsComponent;
  let fixture: ComponentFixture<AdminSystemSettingsComponent>;

  const mockBundle: SystemSettingsBundle = {
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
      enforce_2fa_for_admins: false,
      allowed_admin_ip_ranges: '0.0.0.0/0',
    },
    service_fees: {
      homestay_commission_rate: 10,
      tour_guide_commission_rate: 12,
      rental_commission_rate: 8,
      artisan_marketplace_fee: 5,
      cancellation_grace_period_hours: 24,
    },
    notifications: {
      send_email_on_new_provider: true,
      send_email_on_verification_request: true,
      daily_digest_to_finance: true,
      system_alert_webhook_url: '',
    },
    last_updated_at: '2026-03-26T00:00:00Z',
    updated_by_admin: 'Platform Super Administrator',
  };

  const mockService = {
    canManageSettings: signal(true),
    getSettings: vi.fn().mockReturnValue(of(mockBundle)),
    updateSettings: vi.fn().mockImplementation((section, payload) => {
      const updated = {
        ...mockBundle,
        [section]: { ...(mockBundle as any)[section], ...payload },
      };
      return of(updated);
    }),
  };

  const mockAuthService = {
    currentUser: signal({
      id: 1,
      email: 'admin@ceylongo.lk',
      full_name: 'Super Administrator',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
    }),
    isAuthenticated: signal(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSystemSettingsComponent],
      providers: [
        { provide: AdminSystemSettingsService, useValue: mockService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load system settings bundle', () => {
    expect(component).toBeTruthy();
    expect(component.settings).toBeTruthy();
    expect(component.generalForm.platform_name).toBe('CeylonGo');
  });

  it('should switch tabs properly', () => {
    component.setTab('security');
    expect(component.activeTab).toBe('security');

    component.setTab('service_fees');
    expect(component.activeTab).toBe('service_fees');

    component.setTab('notifications');
    expect(component.activeTab).toBe('notifications');
  });

  it('should save general settings section for super admin', () => {
    component.generalForm.platform_name = 'CeylonGo Global';
    component.saveSection('general');
    expect(component.successMessage).toContain('updated successfully');
    expect(mockService.updateSettings).toHaveBeenCalled();
  });
});
