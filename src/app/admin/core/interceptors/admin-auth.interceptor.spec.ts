import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { adminAuthInterceptor } from './admin-auth.interceptor';
import { AdminAuthService } from '../services/admin-auth.service';

describe('adminAuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let adminAuthServiceMock: {
    getToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    adminAuthServiceMock = {
      getToken: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([adminAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: AdminAuthService, useValue: adminAuthServiceMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should attach Bearer token to /api/v1/admin/ endpoints when token is available', () => {
    adminAuthServiceMock.getToken.mockReturnValue('valid-admin-jwt');

    httpClient.get(`${environment.apiBaseUrl}/admin/dashboard`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/admin/dashboard`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-admin-jwt');
    req.flush({});
  });

  it('should not attach Authorization header if no token is available', () => {
    adminAuthServiceMock.getToken.mockReturnValue(null);

    httpClient.get(`${environment.apiBaseUrl}/admin/dashboard`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/admin/dashboard`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not attach admin token to non-admin endpoints', () => {
    adminAuthServiceMock.getToken.mockReturnValue('valid-admin-jwt');

    httpClient.get(`${environment.apiBaseUrl}/homestays`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/homestays`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should call adminAuthService.logout on 401 Unauthorized for protected admin endpoints', () => {
    adminAuthServiceMock.getToken.mockReturnValue('expired-admin-jwt');

    httpClient.get(`${environment.apiBaseUrl}/admin/dashboard`).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/admin/dashboard`);
    req.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(adminAuthServiceMock.logout).toHaveBeenCalled();
  });

  it('should not call adminAuthService.logout on 401 Unauthorized for the login endpoint', () => {
    httpClient.post(`${environment.apiBaseUrl}/admin/auth/login`, {}).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/admin/auth/login`);
    req.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(adminAuthServiceMock.logout).not.toHaveBeenCalled();
  });
});
