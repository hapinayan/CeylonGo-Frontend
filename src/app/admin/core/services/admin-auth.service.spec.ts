import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import { ADMIN_TOKEN_KEY, ADMIN_USER_KEY, AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let httpMock: HttpTestingController;
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  const mockAdminUser: AdminUser = {
    id: 1,
    full_name: 'Test Administrator',
    email: 'admin@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const mockOperationalUser: AdminUser = {
    id: 2,
    full_name: 'Ops Manager',
    email: 'ops@ceylongo.com',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  };

  beforeEach(() => {
    routerMock = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AdminAuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AdminAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate admin and set session signals and storage', () => {
    expect(service.isAuthenticated()).toBe(false);

    service.login({ email: 'admin@ceylongo.com', password: 'Password123!' }).subscribe((res) => {
      expect(res.access_token).toBe('mock-jwt-token');
      expect(res.user.full_name).toBe('Test Administrator');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@ceylongo.com', password: 'Password123!' });

    req.flush({
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      user: mockAdminUser,
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentToken()).toBe('mock-jwt-token');
    expect(service.currentUser()?.email).toBe('admin@ceylongo.com');
    expect(service.isSuperAdmin()).toBe(true);
    expect(service.roleDisplayName()).toBe('Super Admin');
  });

  it('should identify operational admin correctly without elevating to super_admin', () => {
    service.setSession('mock-ops-token', mockOperationalUser);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isSuperAdmin()).toBe(false);
    expect(service.roleDisplayName()).toBe('Admin');
  });

  it('should clear session and navigate to login on logout', () => {
    service.setSession('mock-jwt-token', mockAdminUser);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/login');
  });

  it('should fetch authenticated admin profile via fetchMe', () => {
    service.fetchMe().subscribe((user) => {
      expect(user.id).toBe(1);
      expect(user.full_name).toBe('Test Administrator');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAdminUser);

    expect(service.currentUser()?.full_name).toBe('Test Administrator');
  });

  describe('JWT validation and Session Reconciliation (FINDING-AUTH-03)', () => {
    const makeJwt = (payloadObj: object) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(payloadObj));
      const sig = 'mock_signature';
      return `${header}.${payload}.${sig}`;
    };

    it('should validate valid unexpired JWT token format', () => {
      const validToken = makeJwt({ sub: 'admin@ceylongo.com', exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(service.isValidTokenFormat(validToken)).toBe(true);
    });

    it('should reject expired JWT token format', () => {
      const expiredToken = makeJwt({ sub: 'admin@ceylongo.com', exp: Math.floor(Date.now() / 1000) - 100 });
      expect(service.isValidTokenFormat(expiredToken)).toBe(false);
    });

    it('should reject malformed or non-JWT tokens', () => {
      expect(service.isValidTokenFormat('not-a-jwt')).toBe(false);
      expect(service.isValidTokenFormat('')).toBe(false);
      expect(service.isValidTokenFormat(null)).toBe(false);
      expect(service.isValidTokenFormat('a.b')).toBe(false);
    });

    it('should reconcile session successfully and update user profile', () => {
      const validToken = makeJwt({ sub: 'admin@ceylongo.com', exp: Math.floor(Date.now() / 1000) + 3600 });
      service.setSession(validToken, mockOperationalUser);

      expect(service.isSuperAdmin()).toBe(false);

      const serverUpdatedUser: AdminUser = {
        ...mockOperationalUser,
        role: 'super_admin',
        admin_role: 'super_admin',
      };

      service.reconcileSession().subscribe((user) => {
        expect(user).toEqual(serverUpdatedUser);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(serverUpdatedUser);

      expect(service.currentUser()?.role).toBe('super_admin');
      expect(service.isSuperAdmin()).toBe(true);
      expect(service.isReconciling()).toBe(false);
    });

    it('should logout and purge session when server returns 401 Unauthorized during reconciliation', () => {
      const validToken = makeJwt({ sub: 'admin@ceylongo.com', exp: Math.floor(Date.now() / 1000) + 3600 });
      service.setSession(validToken, mockAdminUser);

      service.reconcileSession().subscribe({
        next: () => vi.fn(),
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/me`);
      req.flush({ detail: 'Token revoked' }, { status: 401, statusText: 'Unauthorized' });

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentToken()).toBeNull();
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/login');
    });

    it('should logout and purge session when server returns inactive user during reconciliation', () => {
      const validToken = makeJwt({ sub: 'admin@ceylongo.com', exp: Math.floor(Date.now() / 1000) + 3600 });
      service.setSession(validToken, mockAdminUser);

      const suspendedUser: AdminUser = {
        ...mockAdminUser,
        is_active: false,
      };

      service.reconcileSession().subscribe((user) => {
        expect(user?.is_active).toBe(false);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/me`);
      req.flush(suspendedUser);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentToken()).toBeNull();
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/login');
    });

    it('should handle network error (status 0) without clearing session immediately or elevating permissions', () => {
      const validToken = makeJwt({ sub: 'ops@ceylongo.com', exp: Math.floor(Date.now() / 1000) + 3600 });
      service.setSession(validToken, mockOperationalUser);

      service.reconcileSession().subscribe({
        next: () => vi.fn(),
        error: (err) => {
          expect(err.status).toBe(0);
        },
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/auth/me`);
      req.error(new ProgressEvent('error'), { status: 0 });

      expect(service.isAuthenticated()).toBe(true);
      expect(service.isSuperAdmin()).toBe(false);
      expect(service.isReconciling()).toBe(false);
    });
  });
});
