import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ProviderAuthService } from './provider-auth.service';
import { ProviderService } from './provider.service';

describe('ProviderService', () => {
  let service: ProviderService;
  let httpMock: HttpTestingController;

  const mockProviderAuth = {
    getToken: () => 'mock-provider-jwt-token',
    getUser: () => ({ id: 10, business_name: 'Ceylon Horizon Villa' }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProviderService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProviderAuthService, useValue: mockProviderAuth },
      ],
    });
    service = TestBed.inject(ProviderService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create homestay draft with POST /api/v1/provider/listings', () => {
    service.createDraftListing('homestay').subscribe((res) => {
      expect(res.listing.id).toBe(101);
      expect(res.verification_status).toBe('draft');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/provider/listings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ category: 'homestay' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-provider-jwt-token');
    req.flush({
      listing: { id: 101, category: 'homestay' },
      verification_status: 'draft',
      rooms: [],
      media: [],
    });
  });

  it('should submit listing with POST /api/v1/provider/listings/{id}/submit', () => {
    service.submitListing(101).subscribe((res) => {
      expect(res.verification_status).toBe('pending');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/provider/listings/101/submit`);
    expect(req.request.method).toBe('POST');
    req.flush({
      listing: { id: 101 },
      verification_status: 'pending',
    });
  });

  it('should publish listing with POST /api/v1/provider/listings/{id}/publish', () => {
    service.publishListing(101).subscribe((res) => {
      expect(res.verification_status).toBe('approved');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/provider/listings/101/publish`);
    expect(req.request.method).toBe('POST');
    req.flush({
      listing: { id: 101, is_active: true },
      verification_status: 'approved',
    });
  });

  it('should update booking status with PATCH /api/v1/bookings/{id}/status', () => {
    service
      .updateBookingStatus(55, { to_status: 'confirmed' })
      .subscribe((res) => {
        expect(res.success).toBe(true);
      });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/bookings/55/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ to_status: 'confirmed' });
    req.flush({ success: true });
  });
});
