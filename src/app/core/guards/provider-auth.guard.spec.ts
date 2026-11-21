import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderAuthService } from '../services/provider-auth.service';
import { providerAuthGuard } from './provider-auth.guard';

describe('providerAuthGuard', () => {
  let router: Router;
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isApprovedProvider: ReturnType<typeof vi.fn>;
  };

  const executeGuard = () => {
    return TestBed.runInInjectionContext(() =>
      providerAuthGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      isApprovedProvider: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProviderAuthService, useValue: authServiceMock },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when provider is authenticated and approved', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.isApprovedProvider.mockReturnValue(true);

    const result = executeGuard();
    expect(result).toBe(true);
  });

  it('redirects to /provider/login when provider is not authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.isApprovedProvider.mockReturnValue(false);

    const result = executeGuard() as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/provider/login');
  });

  it('redirects to /provider/login when provider is authenticated but not approved/active', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.isApprovedProvider.mockReturnValue(false);

    const result = executeGuard() as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/provider/login');
  });
});
