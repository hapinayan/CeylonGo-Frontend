import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminProfileService } from './admin-profile.service';

describe('AdminProfileService', () => {
  let service: AdminProfileService;
  let httpTesting: HttpTestingController;

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
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getAdminProfile: () => ({
      id: 1,
      email: 'admin@ceylongo.lk',
      full_name: 'Super Admin',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
      notification_preferences: {
        email_alerts: true,
        verification_notifications: true,
        financial_summaries: true,
        security_alerts: true,
      },
    }),
    updateAdminProfile: () => ({
      id: 1,
      email: 'admin@ceylongo.lk',
      full_name: 'Updated Name',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
      notification_preferences: {
        email_alerts: true,
        verification_notifications: true,
        financial_summaries: true,
        security_alerts: true,
      },
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminProfileService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminProfileService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should query live admin profile endpoint', () => {
    service.getProfile().subscribe((res) => {
      expect(res.full_name).toBe('Live Admin');
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/auth/me'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, email: 'admin@ceylongo.lk', full_name: 'Live Admin', role: 'super_admin' });
  });
});
