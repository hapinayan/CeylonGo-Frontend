import {
  HttpClient,
  HttpContext,
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
import { ProviderAuthService } from '../services/provider-auth.service';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST, authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ProviderAuthService,
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

    http.get(environment.apiBaseUrl + '/auth/me').subscribe();

    const req = httpMock.expectOne(environment.apiBaseUrl + '/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-xyz');
    req.flush({});
  });

  it('preserves explicit onboarding authorization and the unrelated login session on 401', () => {
    (authService as any).setSession('test-login-token', {
      id: 1,
      full_name: 'Test',
      email: 't@example.test',
      role: 'traveler',
      is_active: true,
      created_at: '',
    });

    const url = environment.apiBaseUrl + '/providers/registration/submit';
    http.post(url, null, { headers: { Authorization: 'Bearer onboarding-token' } })
      .subscribe({ error: () => {} });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer onboarding-token');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authService.getToken()).toBe('test-login-token');
  });

  it('should not attach Authorization header when token is not present', () => {
    authService.logout();

    http.get(environment.apiBaseUrl + '/auth/me').subscribe();

    const req = httpMock.expectOne(environment.apiBaseUrl + '/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not send a session token or log out on an untrusted API origin', () => {
    (authService as any).setSession('test-token-xyz', {
      id: 1,
      full_name: 'Test',
      email: 't@test.com',
      role: 'traveler',
      is_active: true,
      created_at: '',
    });

    http.get('https://example.test/api/v1/auth/me').subscribe({ error: () => {} });

    const req = httpMock.expectOne('https://example.test/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authService.getToken()).toBe('test-token-xyz');
  });

  it('preserves a newer traveler session when an older private request returns 401', () => {
    const user = {id: 1, full_name: 'Test', email: 'test@example.test', role: 'traveler', is_active: true, created_at: ''};
    (authService as any).setSession('old-test-session', user);
    const url = environment.apiBaseUrl + '/wishlists/me';
    http.get(url).subscribe({error: () => {}});
    const older = httpMock.expectOne(url);
    (authService as any).setSession('new-test-session', {...user, id: 2});
    older.flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(authService.getToken()).toBe('new-test-session');
    expect(authService.currentUser()?.id).toBe(2);
  });

  it('strips explicit authorization from a request marked anonymous', () => {
    const url = environment.apiBaseUrl + '/eco-experiences';
    http.get(url, {
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      headers: {Authorization: 'Bearer synthetic-test-token'},
    }).subscribe();
    const request = httpMock.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should call authService.logout() on 401 Unauthorized for protected endpoints', () => {
    let logoutCalled = false;
    authService.logout = () => {
      logoutCalled = true;
    };

    http.get(environment.apiBaseUrl + '/auth/me').subscribe({
      next: () => {},
      error: () => {},
    });

    const req = httpMock.expectOne(environment.apiBaseUrl + '/auth/me');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutCalled).toBe(true);
  });

  it('should NOT call authService.logout() on 401 Unauthorized for /auth/login or /auth/google', () => {
    let logoutCalled = false;
    authService.logout = () => {
      logoutCalled = true;
    };

    http.post(environment.apiBaseUrl + '/auth/login', {}).subscribe({
      next: () => {},
      error: () => {},
    });

    const req = httpMock.expectOne(environment.apiBaseUrl + '/auth/login');
    req.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutCalled).toBe(false);
  });
});

