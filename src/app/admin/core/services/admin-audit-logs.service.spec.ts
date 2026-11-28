import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuditLogsService', () => {
  let service: AdminAuditLogsService;
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
    getAuditLogs: () => ({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminAuditLogsService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminAuditLogsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewAuditLogs()).toBe(true);
  });

  it('should query live audit logs endpoint', () => {
    service.getAuditLogs({ action_type: 'homestay.approve' }).subscribe((res) => {
      expect(res.total).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/audit-log-directory'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('action_type')).toBe('homestay.approve');
    req.flush({ items: [{ id: 101 }], total: 1, page: 1, page_size: 20, total_pages: 1 });
  });
});
