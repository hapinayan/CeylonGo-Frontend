import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ProviderDetailResponse } from '../models/admin-providers.models';
import {
  ProviderVerificationItem,
  RejectProviderRequest,
} from '../models/admin-verifications.models';
import { AdminAuthService } from './admin-auth.service';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminVerificationsService } from './admin-verifications.service';

describe('AdminVerificationsService', () => {
  let service: AdminVerificationsService;
  let httpMock: HttpTestingController;
  let previewStateMock: Partial<AdminPreviewStateService>;
  let currentUserSignal: ReturnType<typeof signal>;

  const mockProviderDetail: ProviderDetailResponse = {
    id: 2,
    user_id: 102,
    full_name: 'Mahesh Gunasekara',
    email: 'mahesh.g@example.com',
    role: 'provider',
    is_active: false,
    phone: '0712345678',
    identity_document_type: 'nic',
    business_name: 'Ella Peaks Tour Guiding',
    provider_type: 'tour_guide',
    district: 'Badulla',
    approval_status: 'pending',
    created_at: '2026-03-24T11:30:00Z',
    selfie_uploaded: true,
    nic_front_uploaded: true,
    nic_back_uploaded: true,
  };

  const mockQueueItem: ProviderVerificationItem = {
    id: 2,
    user_id: 102,
    full_name: 'Mahesh Gunasekara',
    email: 'mahesh.g@example.com',
    business_name: 'Ella Peaks Tour Guiding',
    provider_type: 'tour_guide',
    district: 'Badulla',
    approval_status: 'pending',
    created_at: '2026-03-24T11:30:00Z',
    documents: [
      { type: 'selfie', title: 'Live Selfie / Photo', isAvailable: true },
      { type: 'nic_front', title: 'National ID / Passport (Front)', isAvailable: true },
      { type: 'nic_back', title: 'National ID (Back)', isAvailable: true },
    ],
  };

  beforeEach(() => {
    currentUserSignal = signal({
      id: '1',
      email: 'admin@ceylongo.com',
      role: 'super_admin',
      is_active: true,
      name: 'Super Admin',
    });

    previewStateMock = {
      getVerificationQueue: vi.fn().mockReturnValue([mockQueueItem]),
      getProvider: vi.fn().mockReturnValue(mockProviderDetail),
      getIdentityDocumentPreview: vi.fn().mockReturnValue('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),
      approveProvider: vi.fn().mockReturnValue({
        success: true,
        provider_id: 2,
        approval_status: 'approved',
        message: 'Approved',
        email_sent: true,
      }),
      rejectProvider: vi.fn().mockReturnValue({
        success: true,
        provider_id: 2,
        approval_status: 'rejected',
        rejection_reason: 'Blurry photo',
        message: 'Rejected',
        email_sent: true,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminVerificationsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: { currentUser: currentUserSignal } },
        { provide: AdminPreviewStateService, useValue: previewStateMock },
      ],
    });

    service = TestBed.inject(AdminVerificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Live Mode API Requests', () => {
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

    it('should query GET /api/v1/admin/providers with status=pending by default', () => {
      service.getVerificationQueue({ page: 1, limit: 10 }).subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.items[0].business_name).toBe('Ella Peaks Tour Guiding');
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${environment.apiBaseUrl}/admin/providers` &&
          r.params.get('status') === 'pending' &&
          r.params.get('page') === '1' &&
          r.params.get('limit') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        items: [
          {
            id: 2,
            user_id: 102,
            full_name: 'Mahesh Gunasekara',
            email: 'mahesh.g@example.com',
            business_name: 'Ella Peaks Tour Guiding',
            provider_type: 'tour_guide',
            district: 'Badulla',
            approval_status: 'pending',
            created_at: '2026-03-24T11:30:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
      });
    });

    it('should fetch provider details via GET /api/v1/admin/providers/:id', () => {
      service.getVerificationDetails(2).subscribe((res) => {
        expect(res).toEqual(mockProviderDetail);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/2`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProviderDetail);
    });

    it('should submit approval via POST /api/v1/admin/providers/:id/approve', () => {
      service.approveVerification(2).subscribe((res) => {
        expect(res.success).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/2/approve`);
      expect(req.request.method).toBe('POST');
      req.flush({
        success: true,
        provider_id: 2,
        approval_status: 'approved',
        message: 'Application approved',
        email_sent: true,
      });
    });

    it('should submit rejection via POST /api/v1/admin/providers/:id/reject with mandatory payload', () => {
      const payload: RejectProviderRequest = {
        reason: 'National identity card is unreadable and blurry.',
      };

      service.rejectVerification(2, payload).subscribe((res) => {
        expect(res.approval_status).toBe('rejected');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/providers/2/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'National identity card is unreadable and blurry.' });
      req.flush({
        success: true,
        provider_id: 2,
        approval_status: 'rejected',
        rejection_reason: 'National identity card is unreadable and blurry.',
        message: 'Application rejected',
        email_sent: true,
      });
    });

    it('should validate rejection reason length and reject short or whitespace-only strings', () => {
      let caughtErr: Error | undefined;
      service.rejectVerification(2, { reason: '   ' }).subscribe({
        next: () => {},
        error: (err) => {
          caughtErr = err;
        },
      });

      expect(caughtErr).toBeDefined();
      expect(caughtErr?.message).toContain('Rejection reason must be between 5 and 500 characters');
      httpMock.expectNone(`${environment.apiBaseUrl}/admin/providers/2/reject`);
    });

    it('should reject review actions when caller lacks required admin role permissions', () => {
      currentUserSignal.set({
        id: '5',
        email: 'support@ceylongo.com',
        role: 'support_admin',
        is_active: true,
        name: 'Support Admin',
      });

      let caughtErr: Error | undefined;
      service.approveVerification(2).subscribe({
        next: () => {},
        error: (err) => {
          caughtErr = err;
        },
      });

      expect(caughtErr).toBeDefined();
      expect(caughtErr?.message).toContain('Unauthorized: Only Super Administrators and Operations Administrators');
    });
  });

  describe('Isolated Development Preview Mode', () => {
    beforeEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = true;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = true;
    });

    it('should delegate getVerificationQueue to AdminPreviewStateService without HTTP requests', () => {
      service.getVerificationQueue({ status: 'pending' }).subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.items[0].business_name).toBe('Ella Peaks Tour Guiding');
      });

      expect(previewStateMock.getVerificationQueue).toHaveBeenCalledWith({ status: 'pending' });
      httpMock.expectNone(`${environment.apiBaseUrl}/admin/providers`);
    });

    it('should retrieve safe document preview SVG data URI without HTTP requests', () => {
      service.getDocument(2, 'selfie').subscribe((uri) => {
        expect(uri).toContain('data:image/svg+xml');
      });

      expect(previewStateMock.getIdentityDocumentPreview).toHaveBeenCalledWith(2, 'selfie');
      httpMock.expectNone(`${environment.apiBaseUrl}/admin/providers/2/documents/selfie`);
    });

    it('should safely revoke object URLs when blob URLs are passed', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      service.revokeDocumentUrl('blob:http://localhost:4200/12345');
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost:4200/12345');
    });
  });
});
