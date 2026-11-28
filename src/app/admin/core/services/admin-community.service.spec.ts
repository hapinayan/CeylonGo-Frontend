import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminCommunityService } from './admin-community.service';

describe('AdminCommunityService', () => {
  let service: AdminCommunityService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'moderator@ceylongo.lk',
    full_name: 'Content Moderator',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getCommunityReports: () => ({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }),
    reviewCommunityReport: () => ({ success: true, message: 'Report actioned' }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminCommunityService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminCommunityService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewCommunity()).toBe(true);
    expect(service.canModerateCommunity()).toBe(true);
  });

  it('should query live reports queue endpoint', () => {
    service.getCommunityReports({ status: 'pending' }).subscribe((res) => {
      expect(res.total).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/community/reports'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('pending');
    req.flush({ items: [{ id: 1, status: 'pending' }], total: 1, page: 1, page_size: 20 });
  });

  it('should call review report endpoint', () => {
    service.reviewReport(1, { action: 'hide', reason: 'Spam' }).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/admin/community/reports/1'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      status: 'resolved',
      review_notes: 'Spam',
      action_visibility: 'hidden',
    });
    req.flush({ success: true });
  });
});
