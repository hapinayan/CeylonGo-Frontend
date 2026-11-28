import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminTourGuidesService } from './admin-tour-guides.service';

describe('AdminTourGuidesService', () => {
  let service: AdminTourGuidesService;
  let httpTesting: HttpTestingController;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Operations Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => false,
  };

  const mockPreviewState = {
    getTourGuides: () => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    getTourGuideById: () => ({ guide: { id: 1 } }),
    approveTourGuide: () => ({ success: true, tour_guide_id: 1, message: 'Approved' }),
    rejectTourGuide: () => ({ success: true, tour_guide_id: 1, message: 'Rejected' }),
    getTourGuideKPIs: () => ({ total_guides: 8, active_guides: 5, pending_approval: 2, verified_guides: 4 }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminTourGuidesService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminTourGuidesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created and expose permission signals', () => {
    expect(service).toBeTruthy();
    expect(service.canViewGuides()).toBe(true);
    expect(service.canReviewGuides()).toBe(true);
    expect(service.canVerifyCredentials()).toBe(true);
  });

  it('should query live tour guides endpoint when not in demo session', () => {
    service.getTourGuides({ approval_status: 'pending', page: 1 }).subscribe((res) => {
      expect(res.total).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/api/v1/admin/listing-directory'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('category')).toBe('tour_guide');
    expect(req.request.params.get('status')).toBe('pending');
    req.flush({
      items: [
        {
          listing: {
            id: 2,
            provider_id: 5,
            category: 'guide',
            title: 'Kandy Heritage Guide',
            description: 'Licensed guide',
            district: 'Kandy',
            locality: 'Kandy',
            price: 5000,
            currency: 'LKR',
            is_active: true,
            approval_status: 'pending',
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
          },
          provider: { id: 5, business_name: 'Kandy Heritage', email: 'guide@ceylongo.lk', phone: '0771234567', verification_status: 'approved' },
          verification_status: 'pending',
          decided_at: null,
          decision_reason: null,
          details: {},
          homestay_metadata: null,
          rooms: [],
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      limit: 20,
      total_pages: 1,
      counts: { pending: 1 },
      active: 1,
      providers: 1,
    });
  });

  it('should call approve tour guide endpoint', () => {
    service.approveTourGuide(1, 'Verified credentials').subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/api/v1/admin/listings/1/decision'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ approval_status: 'approved', decision_reason: 'Verified credentials' });
    req.flush({ success: true });
  });

  it('should delegate to preview state in demo mode', () => {
    mockAuthService.isDemoSession = () => true;

    service.getTourGuides().subscribe((res) => {
      expect(res.total).toBe(0);
    });

    service.getTourGuideKPIs().subscribe((kpi) => {
      expect(kpi.total_guides).toBe(8);
    });

    mockAuthService.isDemoSession = () => false;
  });
});
