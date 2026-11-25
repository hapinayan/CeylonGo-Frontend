import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AdminAuthService } from '../services/admin-auth.service';
import { adminAuthGuard, adminGuestGuard } from './admin-auth.guard';

describe('AdminAuthGuard & AdminGuestGuard', () => {
  let authServiceMock: { isAuthenticated: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
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

  describe('adminAuthGuard', () => {
    it('should allow access when admin is authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        adminAuthGuard({} as ActivatedRouteSnapshot, { url: '/admin/dashboard' } as RouterStateSnapshot)
      );

      expect(result).toBe(true);
    });

    it('should redirect unauthenticated users to /admin/login with returnUrl', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        adminAuthGuard({} as ActivatedRouteSnapshot, { url: '/admin/dashboard' } as RouterStateSnapshot)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/admin/login'], {
        queryParams: { returnUrl: '/admin/dashboard' },
      });
      expect(result).not.toBe(true);
    });
  });

  describe('adminGuestGuard', () => {
    it('should redirect already authenticated admin away from /admin/login to /admin/dashboard', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        adminGuestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/admin/dashboard']);
      expect(result).not.toBe(true);
    });

    it('should allow unauthenticated visitors to view /admin/login', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        adminGuestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );

      expect(result).toBe(true);
    });
  });
});
