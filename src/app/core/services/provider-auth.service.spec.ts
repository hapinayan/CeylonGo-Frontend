import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ProviderLoginRequest, ProviderLoginResponse, ProviderUser } from '../models/provider-auth.models';
import { ProviderAuthService } from './provider-auth.service';

describe('ProviderAuthService', () => {
  let service: ProviderAuthService;
  let httpMock: HttpTestingController;

  const mockProviderUser: ProviderUser = {
    id: 10,
    email: 'provider@example.com',
    full_name: 'Ceylon Tours',
    role: 'provider',
    is_active: true,
    business_name: 'Ceylon Eco Tours',
    provider_type: 'tour_guide',
    district: 'Kandy',
    approval_status: 'approved',
  };

  const mockLoginResponse: ProviderLoginResponse = {
    access_token: 'mock-provider-jwt-token',
    token_type: 'bearer',
    user: mockProviderUser,
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ProviderAuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProviderAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should authenticate provider and store isolated session on 200 OK', () => {
    const payload: ProviderLoginRequest = {
      email: 'PROVIDER@EXAMPLE.COM ',
      password: 'StrongPassword123!',
    };

    service.login(payload).subscribe((res) => {
      expect(res.access_token).toBe('mock-provider-jwt-token');
      expect(res.user.email).toBe('provider@example.com');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'provider@example.com',
      password: 'StrongPassword123!',
    });

    req.flush(mockLoginResponse);

    expect(service.getToken()).toBe('mock-provider-jwt-token');
    expect(service.getUser()?.business_name).toBe('Ceylon Eco Tours');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isApprovedProvider()).toBe(true);
  });

  it('should format 401 invalid credentials error', () => {
    service.login({ email: 'provider@example.com', password: 'wrong' }).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(401);
        expect(err.message).toContain('Invalid email or password');
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/login`);
    req.flush({ detail: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('should format 403 pending approval error', () => {
    service.login({ email: 'provider@example.com', password: 'password' }).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(403);
        expect(err.message).toContain('Provider application is pending admin review');
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/login`);
    req.flush(
      { detail: 'Provider application is pending admin review.' },
      { status: 403, statusText: 'Forbidden' }
    );
  });

  it('should format 429 rate limit error', () => {
    service.login({ email: 'provider@example.com', password: 'password' }).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(429);
        expect(err.message).toContain('Too many login attempts');
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/login`);
    req.flush({ detail: 'Rate limit exceeded' }, { status: 429, statusText: 'Too Many Requests' });
  });

  it('should clear provider session on logout and call logout endpoint', () => {
    service.setSession('test-token', mockProviderUser);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Successfully logged out' });

    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should fetch provider profile with getProfile', () => {
    service.setSession('test-token', mockProviderUser);

    service.getProfile().subscribe((profile) => {
      expect(profile.business_name).toBe('Ceylon Eco Tours');
      expect(profile.verification_status).toBe('approved');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/providers/me`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 1,
      user_id: 10,
      business_name: 'Ceylon Eco Tours',
      phone: '0771234567',
      district: 'Kandy',
      verification_status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
    });
  });
});
