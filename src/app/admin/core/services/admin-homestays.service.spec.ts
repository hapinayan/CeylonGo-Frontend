import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import {
  HomestayAdminDashboardResponse,
  HomestayResponse,
  HomestayReviewRequest,
  HomestayVerificationRequest,
} from '../models/admin-homestays.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminHomestaysService } from './admin-homestays.service';

describe('AdminHomestaysService', () => {
  let service: AdminHomestaysService;
  let httpMock: HttpTestingController;

  let isDemo = false;
  let currentUser: AdminUser | null = {
    id: 1,
    full_name: 'Super Admin',
    email: 'admin@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const mockAuthService = {
    isDemoSession: () => isDemo,
    isAuthenticated: () => true,
    currentUser: () => currentUser,
    currentToken: () => 'valid-jwt-token',
  };

  const mockHomestay: HomestayResponse = {
    id: 101,
    name: 'Kandy Lake Villa',
    description: 'Serene lakeside homestay',
    location: 'Kandy Lake Round',
    city: 'Kandy',
    district: 'Kandy',
    province: 'Central',
    price_per_night: 14500,
    max_guests: 4,
    is_active: true,
    approval_status: 'pending',
    verification_status: 'pending',
    created_at: '2026-11-20T10:00:00Z',
    images: [],
    amenities: [],
  };

  const mockDashboard: HomestayAdminDashboardResponse = {
    listings: {
      total: 8,
      approved: 4,
      pending_approval: 2,
      draft: 0,
      rejected: 1,
      suspended: 1,
    },
    bookings: {
      total: 24,
      pending: 3,
      confirmed: 18,
      completed: 2,
      cancelled: 1,
      rejected: 0,
    },
    payments: {
      total_online_payments_count: 18,
      total_online_payments_volume: 345000,
      pending_refunds_count: 1,
      pending_refunds_volume: 14500,
      currency: 'LKR',
    },
    campaigns: {
      total_campaigns: 2,
      active_campaigns: 1,
      pending_approval_campaigns: 1,
      total_campaign_budget: 50000,
      currency: 'LKR',
    },
    reviews: {
      total_reviews: 42,
      pending_moderation: 0,
      approved_reviews: 40,
      rejected_reviews: 2,
    },
  };

  beforeEach(() => {
    isDemo = false;
    currentUser = {
      id: 1,
      full_name: 'Super Admin',
      email: 'admin@ceylongo.com',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminHomestaysService,
        AdminPreviewStateService,
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(AdminHomestaysService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Live Mode Execution', () => {
    const listingReview = {
      listing: {
        id: 101,
        provider_id: 2,
        category: 'homestay',
        title: 'Kandy Lake Villa',
        description: 'Serene lakeside homestay',
        district: 'Kandy',
        locality: 'Kandy Lake Round',
        price: 14500,
        currency: 'LKR',
        is_active: true,
        approval_status: 'pending',
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
      },
      provider: { id: 2, business_name: 'Kandy Host', email: 'host@ceylongo.lk', phone: '0771234567', verification_status: 'approved' },
      verification_status: 'pending',
      decided_at: null,
      decision_reason: null,
      details: {},
      homestay_metadata: { province: 'Central', max_guests: 4, amenities: [] },
      rooms: [{ capacity: 4 }],
    };

    it('should query GET /listing-directory when fetching homestays in live mode', () => {
      service.getHomestays({ limit: 10, page: 1 }).subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.total).toBe(1);
        expect(res.items[0].name).toBe('Kandy Lake Villa');
      });

      const req = httpMock.expectOne((r) =>
        r.url === `${environment.apiBaseUrl}/admin/listing-directory` &&
        r.params.get('category') === 'homestay'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page_size')).toBe('10');
      req.flush({ items: [listingReview], total: 1, page: 1, page_size: 10, limit: 10, total_pages: 1, counts: { pending: 1 }, active: 1, providers: 1 });
    });

    it('should query GET /listing-directory for administrative metrics', () => {
      service.getHomestayDashboard().subscribe((dashboard) => {
        expect(dashboard.listings.total).toBe(8);
        expect(dashboard.listings.approved).toBe(4);
      });

      const req = httpMock.expectOne((r) =>
        r.url === `${environment.apiBaseUrl}/admin/listing-directory` &&
        r.params.get('category') === 'homestay' &&
        r.params.get('page_size') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        items: [],
        total: 8,
        page: 1,
        page_size: 1,
        limit: 1,
        total_pages: 8,
        counts: { approved: 4, pending: 2, rejected: 1, suspended: 1 },
        active: 4,
        providers: 3,
      });
    });

    it('should query GET /listings/{id} for homestay detail inspection', () => {
      service.getHomestayById(101).subscribe((h) => {
        expect(h.id).toBe(101);
        expect(h.name).toBe('Kandy Lake Villa');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/listings/101`);
      expect(req.request.method).toBe('GET');
      req.flush(listingReview);
    });

    it('should submit POST /listings/{id}/decision with decision and reason', () => {
      const payload: HomestayReviewRequest = { decision: 'approved' };
      service.reviewHomestay(101, payload).subscribe((res) => {
        expect(res.approval_status).toBe('approved');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/listings/101/decision`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ approval_status: 'approved', decision_reason: undefined });
      req.flush({ success: true });

      const detailReq = httpMock.expectOne(`${environment.apiBaseUrl}/admin/listings/101`);
      detailReq.flush({ ...listingReview, listing: { ...listingReview.listing, approval_status: 'approved' } });
    });

    it('should reject direct verifyHomestay call in live mode', () => {
      const payload: HomestayVerificationRequest = { verification_status: 'verified' };
      let errorMsg = '';
      service.verifyHomestay(101, payload).subscribe({
        next: () => {},
        error: (err: Error) => {
          errorMsg = err.message;
        },
      });
      expect(errorMsg).toContain('Use the listing review decision');
    });

    it('should propagate HTTP errors honestly without mock fallback', () => {
      let caughtError: unknown;
      service.getHomestayById(999).subscribe({
        next: () => {},
        error: (err) => {
          caughtError = err;
        },
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/listings/999`);
      req.flush({ detail: 'Homestay not found' }, { status: 404, statusText: 'Not Found' });
      expect(caughtError).toBeTruthy();
    });
  });

  describe('Demo Preview Mode Execution', () => {
    const originalPreview = environment.features?.adminPreviewMode;

    beforeEach(() => {
      isDemo = true;
      if (environment.features) {
        environment.features.adminPreviewMode = true;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = true;
      TestBed.inject(AdminPreviewStateService).resetState();
    });

    afterEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = originalPreview ?? false;
      }
      (environment as unknown as Record<string, unknown>)['adminPreviewMode'] = originalPreview ?? false;
    });

    it('should retrieve homestays from previewState in demo session', () => {
      service.getHomestays({ limit: 10 }).subscribe((res) => {
        expect(res.items.length).toBeGreaterThan(0);
        expect(res.total).toBeGreaterThan(0);
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/admin/homestays/pending`);
    });

    it('should review homestays in previewState in demo session', () => {
      const payload: HomestayReviewRequest = { decision: 'approved' };
      service.reviewHomestay(1, payload).subscribe((res) => {
        expect(res.approval_status).toBe('approved');
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/admin/homestays/1/review`);
    });

    it('should verify homestays in previewState in demo session', () => {
      const payload: HomestayVerificationRequest = { verification_status: 'verified' };
      service.verifyHomestay(1, payload).subscribe((res) => {
        expect(res.verification_status).toBe('verified');
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/admin/homestays/1/verify`);
    });
  });

  describe('RBAC Authorization', () => {
    it('should block viewer role from reviewing homestays', () => {
      currentUser = {
        id: 9,
        full_name: 'Viewer',
        email: 'viewer@ceylongo.com',
        role: 'viewer',
        admin_role: 'viewer',
        is_active: true,
      };

      let errorMsg = '';
      service.reviewHomestay(101, { decision: 'approved' }).subscribe({
        next: () => {},
        error: (err: Error) => {
          errorMsg = err.message;
        },
      });

      expect(errorMsg).toContain('HTTP 403 Forbidden');
    });

    it('should block viewer role from verifying homestays', () => {
      currentUser = {
        id: 9,
        full_name: 'Viewer',
        email: 'viewer@ceylongo.com',
        role: 'viewer',
        admin_role: 'viewer',
        is_active: true,
      };

      let errorMsg = '';
      service.verifyHomestay(101, { verification_status: 'verified' }).subscribe({
        next: () => {},
        error: (err: Error) => {
          errorMsg = err.message;
        },
      });

      expect(errorMsg).toContain('HTTP 403 Forbidden');
    });
  });
});
