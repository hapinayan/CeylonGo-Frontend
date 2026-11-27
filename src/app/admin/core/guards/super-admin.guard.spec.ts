import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AdminAuthService } from '../services/admin-auth.service';
import { superAdminGuard } from './super-admin.guard';

describe('superAdminGuard', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isSuperAdmin: ReturnType<typeof vi.fn>;
  };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      isSuperAdmin: vi.fn(),
    };
    routerMock = {
      createUrlTree: vi.fn((commands, extras) => ({ commands, extras } as unknown as UrlTree)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminAuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access to Super Admin accounts', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.isSuperAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      superAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated users to /admin/login', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      superAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
    expect(result).not.toBe(true);
  });

  it('should deny access to operational admins and redirect to dashboard with accessDenied query param', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.isSuperAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      superAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/admin/dashboard'], {
      queryParams: { accessDenied: 'super-admin-required' },
    });
    expect(result).not.toBe(true);
  });
});
