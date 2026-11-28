import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import {
  ProviderDetailResponse,
  ProviderListResponse,
} from '../models/admin-providers.models';
import { AdminAuthService } from './admin-auth.service';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminProvidersService } from './admin-providers.service';

describe('AdminProvidersService', () => {
  let service: AdminProvidersService;
  let httpMock: HttpTestingController;
  let previewStateMock: Partial<AdminPreviewStateService>;
  let currentUserSignal: ReturnType<typeof signal>;

  const mockProviderList: ProviderListResponse = {
    items: [
      {
        id: 1,
        user_id: 101,
        full_name: 'Sunil Shantha',
        email: 'sunil.s@example.com',
        business_name: 'Kandy Serenity Homestay',
        provider_type: 'homestay',
        district: 'Kandy',
        approval_status: 'approved',
        created_at: '2026-01-05T09:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    total_pages: 1,
  };

  const mockProviderDetail: ProviderDetailResponse = {
    id: 1,
    user_id: 101,
    full_name: 'Sunil Shantha',
    email: 'sunil.s@example.com',
    role: 'provider',
    is_active: true,
    phone: '0771234567',
    identity_document_type: 'nic',
    business_name: 'Kandy Serenity Homestay',
    provider_type: 'homestay',
    district: 'Kandy',
    approval_status: 'approved',
    created_at: '2026-01-05T09:00:00Z',
    selfie_uploaded: true,
    nic_front_uploaded: true,
    nic_back_uploaded: true,
  };

  beforeEach(() => {
    currentUserSignal = signal({
      id: '1',
      email: 'admin@ceylongo.com',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
      name: 'Super Admin',
    });

    previewStateMock = {
      getProviders: vi.fn(),
      getProvider: vi.fn(),
      approveProvider: vi.fn(),
      rejectProvider: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminProvidersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: { currentUser: currentUserSignal } },
        { provide: AdminPreviewStateService, useValue: previewStateMock },
      ],
    });

    service = TestBed.inject(AdminProvidersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Live Mode API Requests (when adminPreviewMode is false)', () => {
    const originalPreview = environment.features?.adminPreviewMode;

    beforeEach(() => {
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = false;
      if (environment.features) {
        environment.features.adminPreviewMode = false;
      }
    });

    afterEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = originalPreview ?? true;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = originalPreview ?? true;
    });

    it('should query GET /api/v1/admin/provider-directory with supported parameters', () => {
      service
        .getProviders({ page: 2, limit: 10, status: 'pending', search: 'Kandy' })
        .subscribe((res) => {
          expect(res.items[0].approval_status).toBe('approved');
        });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${environment.apiBaseUrl}/admin/provider-directory` &&
          r.params.get('page') === '2' &&
          r.params.get('limit') === '10' &&
          r.params.get('status') === 'pending' &&
          r.params.get('search') === 'Kandy'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        ...mockProviderList,
        items: mockProviderList.items.map((item) => ({
          ...item,
          verification_status: item.approval_status,
        })),
      });
    });

    it('should fetch provider details via GET /api/v1/admin/providers/:id', () => {
      service.getProviderById(1).subscribe((res) => {
        expect(res).toEqual(mockProviderDetail);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProviderDetail);
    });

    it('should submit approval via POST /api/v1/admin/providers/:id/approve', () => {
      const mockActionResponse = {
        success: true,
        provider_id: 1,
        approval_status: 'approved',
        message: 'Approved',
        email_sent: true,
      };

      service.approveProvider(1).subscribe((res) => {
        expect(res.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/1/approve`);
      expect(req.request.method).toBe('POST');
      req.flush(mockActionResponse);
    });

    it('should submit rejection via POST /api/v1/admin/providers/:id/reject with mandatory payload', () => {
      const mockActionResponse = {
        success: true,
        provider_id: 1,
        approval_status: 'rejected',
        rejection_reason: 'Document blurry',
        message: 'Rejected',
        email_sent: true,
      };

      service
        .rejectProvider(1, { reason: 'Document blurry and invalid address' })
        .subscribe((res) => {
          expect(res.approval_status).toBe('rejected');
        });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/1/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'Document blurry and invalid address' });
      req.flush(mockActionResponse);
    });

    it('should propagate HTTP errors honestly and never fall back to preview fixtures', () => {
      let caughtError: unknown;
      service.getProviders().subscribe({
        next: () => {},
        error: (err) => {
          caughtError = err;
        },
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/provider-directory`);
      req.flush({ detail: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });

      expect(caughtError).toBeTruthy();
      expect(previewStateMock.getProviders).not.toHaveBeenCalled();
    });
  });

  describe('Isolated Development Preview Mode', () => {
    const originalPreview = environment.features?.adminPreviewMode;

    beforeEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = true;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = true;
    });

    afterEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = originalPreview ?? false;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = originalPreview ?? false;
    });

    it('should delegate getProviders to AdminPreviewStateService without HTTP requests', () => {
      (previewStateMock.getProviders as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockProviderList
      );

      service.getProviders({ search: 'test' }).subscribe((res) => {
        expect(res).toEqual(mockProviderList);
      });

      expect(previewStateMock.getProviders).toHaveBeenCalledWith({ search: 'test' });
      httpMock.expectNone(`${environment.apiBaseUrl}/admin/providers`);
    });

    it('should delegate getProviderById to AdminPreviewStateService without HTTP requests', () => {
      (previewStateMock.getProvider as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockProviderDetail
      );

      service.getProviderById(1).subscribe((res) => {
        expect(res).toEqual(mockProviderDetail);
      });

      expect(previewStateMock.getProvider).toHaveBeenCalledWith(1);
      httpMock.expectNone(`${environment.apiBaseUrl}/admin/providers/1`);
    });

    it('should reject approval when caller lacks required admin role permissions', () => {
      currentUserSignal.set({
        id: '99',
        email: 'support@ceylongo.com',
        role: 'support_admin',
        is_active: true,
        name: 'Support Officer',
      });

      let caughtErr: Error | undefined;
      service.approveProvider(1).subscribe({
        next: () => {},
        error: (err) => {
          caughtErr = err;
        },
      });

      expect(caughtErr).toBeDefined();
      expect(caughtErr?.message).toContain('Unauthorized: Only administrators');
    });

    it('should reject rejection when caller lacks required admin role permissions', () => {
      currentUserSignal.set({
        id: '99',
        email: 'finance@ceylongo.com',
        role: 'finance_admin',
        is_active: true,
        name: 'Finance Officer',
      });

      let caughtErr: Error | undefined;
      service.rejectProvider(1, { reason: 'Missing docs' }).subscribe({
        next: () => {},
        error: (err) => {
          caughtErr = err;
        },
      });

      expect(caughtErr).toBeDefined();
      expect(caughtErr?.message).toContain('Unauthorized: Only administrators');
    });
  });
});
