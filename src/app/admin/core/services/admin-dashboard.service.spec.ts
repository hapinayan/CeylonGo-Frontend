import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminDashboardResponse } from '../models/admin-dashboard.models';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let httpMock: HttpTestingController;

  const mockResponse: AdminDashboardResponse = {
    providers: {
      total_profiles: 50,
      pending_applications: 8,
    },
    bookings: {
      homestay: 120,
      rental_vehicle: 85,
      tour_guide: 40,
    },
    pending_approvals: {
      homestay_listings: 4,
      activity_listings: 3,
      eco_experience_listings: 1,
      artisan_listings: 5,
      rental_vehicles: 7,
      tour_guide_profiles: 2,
    },
    traveler_eligibility: {
      pending_rental_checks: 9,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminDashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AdminDashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch dashboard metrics via GET /api/v1/admin/dashboard when preview mode is disabled', () => {
    const originalMode = environment.features?.adminPreviewMode;
    if (environment.features) {
      environment.features.adminPreviewMode = false;
    }

    service.getDashboard().subscribe((data) => {
      expect(data).toEqual(mockResponse);
      expect(data.providers?.total_profiles).toBe(50);
      expect(data.bookings.homestay).toBe(120);
      expect(data.pending_approvals?.homestay_listings).toBe(4);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    if (environment.features) {
      environment.features.adminPreviewMode = originalMode;
    }
  });

  it('should return demo metrics directly when preview mode is enabled', () => {
    const originalMode = environment.features?.adminPreviewMode;
    if (environment.features) {
      environment.features.adminPreviewMode = true;
    }

    service.getDashboard().subscribe((data) => {
      expect(data.providers?.total_profiles).toBe(48);
      expect(data.bookings.homestay).toBe(124);
      expect(data.pending_approvals?.homestay_listings).toBe(4);
    });

    // No HTTP request should be made
    httpMock.expectNone(`${environment.apiBaseUrl}/admin/dashboard`);

    if (environment.features) {
      environment.features.adminPreviewMode = originalMode;
    }
  });
});
