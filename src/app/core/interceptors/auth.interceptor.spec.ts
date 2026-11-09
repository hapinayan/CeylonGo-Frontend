import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    authService.logout();
  });

  it('should attach Authorization Bearer header when token is present for API routes', () => {
    // Manually set session
    (authService as any).setSession('test-token-xyz', {
      id: 1,
      full_name: 'Test',
      email: 't@test.com',
      role: 'traveler',
      is_active: true,
      created_at: '',
    });

    http.get('/api/v1/auth/me').subscribe();

    const req = httpMock.expectOne('/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-xyz');
    req.flush({});
  });

  it('should not attach Authorization header when token is not present', () => {
    authService.logout();

    http.get('/api/v1/auth/me').subscribe();

    const req = httpMock.expectOne('/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});

