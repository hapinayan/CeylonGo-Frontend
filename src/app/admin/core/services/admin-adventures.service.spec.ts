import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { ActivityResponse } from '../models/admin-activities.models';
import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminAdventuresService } from './admin-adventures.service';

describe('AdminAdventuresService', () => {
  let service: AdminAdventuresService;
  let httpMock: HttpTestingController;

  let isDemo = false;
  let currentUser: AdminUser | null = {
    id: 1,
    email: 'admin@ceylongo.com',
    full_name: 'Lead Operations Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  };

  const mockAuthService = {
    isDemoSession: () => isDemo,
    isAuthenticated: () => true,
    currentUser: () => currentUser,
    currentToken: () => 'valid-jwt-token',
  };

  const sampleActivity: ActivityResponse = {
    id: 1,
    title: 'Kitulgala White Water Rafting',
    description: 'Thrilling white water rafting expedition.',
    category: 'rafting',
    location: 'Kitulgala',
    city: 'Kitulgala',
    district: 'Kegalle',
    province: 'Sabaragamuwa',
    price_per_person: 6500,
    duration_hours: 3.5,
    difficulty_level: 'moderate',
    max_participants: 8,
    min_participants: 2,
    is_active: true,
    approval_status: 'pending',
  };

  const mockPreviewState = {
    getActivities: () => ({
      items: [sampleActivity],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    }),
    getActivity: () => sampleActivity,
    approveActivity: () => ({ ...sampleActivity, approval_status: 'approved' as const }),
    rejectActivity: () => ({ ...sampleActivity, approval_status: 'rejected' as const }),
  };

  beforeEach(() => {
    isDemo = false;
    currentUser = {
      id: 1,
      email: 'admin@ceylongo.com',
      full_name: 'Lead Operations Admin',
      role: 'admin',
      admin_role: 'admin',
      is_active: true,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminAdventuresService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminAdventuresService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should enforce RBAC: reject unauthorized support_admin from viewing activities', async () => {
    currentUser = {
      id: 2,
      email: 'support@ceylongo.com',
      full_name: 'Support Officer',
      role: 'support_admin',
      admin_role: 'support_admin',
      is_active: true,
    };

    let errorThrown: any = null;
    try {
      await new Promise((resolve, reject) => {
        service.getActivities().subscribe({
          next: resolve,
          error: reject,
        });
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeTruthy();
    expect(errorThrown.message).toContain('HTTP 403 Forbidden');
  });

  const listingReview = {
    listing: {
      id: 1,
      provider_id: 2,
      category: 'adventure',
      title: 'Kitulgala White Water Rafting',
      description: 'Thrilling white water rafting expedition.',
      district: 'Kegalle',
      locality: 'Kitulgala',
      price: 6500,
      currency: 'LKR',
      is_active: true,
      approval_status: 'pending',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    },
    provider: { id: 2, business_name: 'Kitulgala Adventures', email: 'adv@ceylongo.lk', phone: '0771234567', verification_status: 'approved' },
    verification_status: 'pending',
    decided_at: null,
    decision_reason: null,
    details: { activity: { category: 'rafting', duration_hours: 3.5, difficulty_level: 'moderate', max_participants: 8, min_participants: 2 } },
    homestay_metadata: null,
    rooms: [],
  };

  it('should fetch pending activities from live backend in non-preview mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.getActivities({ page: 1, limit: 10 }).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.apiBaseUrl}/admin/listing-directory` &&
      request.params.get('category') === 'activity' &&
      request.method === 'GET'
    );
    req.flush({ items: [listingReview], total: 1, page: 1, page_size: 10, limit: 10, total_pages: 1, counts: { pending: 1 }, active: 1, providers: 1 });

    const response = await promise;
    expect(response.items.length).toBe(1);
    expect(response.items[0].title).toBe('Kitulgala White Water Rafting');
  });

  it('should delegate to preview state in preview mode', async () => {
    isDemo = true;

    const response = await new Promise<any>((resolve, reject) => {
      service.getActivities().subscribe({
        next: resolve,
        error: reject,
      });
    });

    expect(response.items.length).toBe(1);
  });

  it('should approve an activity in live mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.approveActivity(1, { notes: 'Meets safety standards' }).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne({
      method: 'POST',
      url: `${environment.apiBaseUrl}/admin/listings/1/decision`,
    });
    expect(req.request.body).toEqual({ approval_status: 'approved', decision_reason: 'Meets safety standards' });
    req.flush({ success: true });

    const detailReq = httpMock.expectOne({
      method: 'GET',
      url: `${environment.apiBaseUrl}/admin/listings/1`,
    });
    detailReq.flush({ ...listingReview, listing: { ...listingReview.listing, approval_status: 'approved' } });

    const res = await promise;
    expect(res.approval_status).toBe('approved');
  });

  it('should reject an activity with mandatory reason in live mode', async () => {
    const promise = new Promise<any>((resolve, reject) => {
      service.rejectActivity(1, { reason: 'Inadequate river guide certification' }).subscribe({
        next: resolve,
        error: reject,
      });
    });

    const req = httpMock.expectOne({
      method: 'POST',
      url: `${environment.apiBaseUrl}/admin/listings/1/decision`,
    });
    expect(req.request.body).toEqual({ approval_status: 'rejected', decision_reason: 'Inadequate river guide certification' });
    req.flush({ success: true });

    const detailReq = httpMock.expectOne({
      method: 'GET',
      url: `${environment.apiBaseUrl}/admin/listings/1`,
    });
    detailReq.flush({ ...listingReview, listing: { ...listingReview.listing, approval_status: 'rejected' } });

    const res = await promise;
    expect(res.approval_status).toBe('rejected');
  });

  it('should reject short rejection reasons (< 5 chars) on client before network call', async () => {
    let errorThrown: any = null;
    try {
      await new Promise((resolve, reject) => {
        service.rejectActivity(1, { reason: 'No' }).subscribe({
          next: resolve,
          error: reject,
        });
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeTruthy();
    expect(errorThrown.message).toContain('at least 5 characters');
  });
});
