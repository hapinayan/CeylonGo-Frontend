import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import {
  TravelerAccount,
  TravelerDirectory,
  TravelerStatusUpdate,
} from '../models/admin-travelers.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminTravelersService } from './admin-travelers.service';

describe('AdminTravelersService', () => {
  let service: AdminTravelersService;
  let httpMock: HttpTestingController;

  let isDemo = false;
  const mockSuperAdmin: AdminUser = {
    id: 1,
    full_name: 'Super Admin',
    email: 'super@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const mockAuthService = {
    isDemoSession: () => isDemo,
    isAuthenticated: () => true,
    currentUser: () => mockSuperAdmin,
    currentToken: () => 'valid-jwt-token',
  };

  beforeEach(() => {
    isDemo = false;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminTravelersService,
        AdminPreviewStateService,
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(AdminTravelersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Live Mode API Requests', () => {
    it('should query GET /api/v1/admin/travelers with pagination and filter params', () => {
      const mockResponse: TravelerDirectory = {
        items: [
          {
            id: 1,
            full_name: 'Kavindu Perera',
            email: 'kavindu@example.com',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      };

      service.getTravelers({ page: 1, page_size: 20, is_active: true, search: 'Kavindu' }).subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.items[0].full_name).toBe('Kavindu Perera');
      });

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/admin/travelers`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('page_size')).toBe('20');
      expect(req.request.params.get('is_active')).toBe('true');
      expect(req.request.params.get('search')).toBe('Kavindu');

      req.flush(mockResponse);
    });

    it('should fetch single traveler by ID', () => {
      const mockTraveler: TravelerAccount = {
        id: 2,
        full_name: 'Elena Rostova',
        email: 'elena@example.com',
        is_active: true,
        created_at: '2026-01-15T00:00:00Z',
      };

      service.getTravelerById(2).subscribe((res) => {
        expect(res.id).toBe(2);
        expect(res.full_name).toBe('Elena Rostova');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/travelers/2`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTraveler);
    });

    it('should send PATCH request for status update with exact payload', () => {
      const payload: TravelerStatusUpdate = {
        is_active: false,
        reason_code: 'policy_violation',
        note: 'Violation of guest policy.',
      };

      const updatedTraveler: TravelerAccount = {
        id: 1,
        full_name: 'Kavindu Perera',
        email: 'kavindu@example.com',
        is_active: false,
        created_at: '2026-01-01T00:00:00Z',
      };

      service.updateTravelerStatus(1, payload).subscribe((res) => {
        expect(res.is_active).toBe(false);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/travelers/1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(updatedTraveler);
    });
  });

  describe('Demo Preview Routing', () => {
    it('should route getTravelers to previewState in demo mode without issuing HTTP request', () => {
      isDemo = true;

      service.getTravelers().subscribe((res) => {
        expect(res.items.length).toBe(8);
        expect(res.total).toBe(8);
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/admin/travelers`);
    });

    it('should route updateTravelerStatus to previewState in demo mode without HTTP request', () => {
      isDemo = true;

      const payload: TravelerStatusUpdate = {
        is_active: false,
        reason_code: 'fraud_suspected',
        note: 'Flagged suspicious activity in demo.',
      };

      service.updateTravelerStatus(1, payload).subscribe((res) => {
        expect(res.is_active).toBe(false);
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/admin/travelers/1/status`);
    });
  });
});
