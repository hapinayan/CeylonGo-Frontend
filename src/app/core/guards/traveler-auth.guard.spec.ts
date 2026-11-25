import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { travelerAuthGuard } from './traveler-auth.guard';

describe('travelerAuthGuard', () => {
  let router: Router;
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  const executeGuard = (url: string = '/artisans/favorites') => {
    return TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    );
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when traveler is authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const result = executeGuard();
    expect(result).toBe(true);
  });

  it('allows navigation when demo or preview query parameter is present', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const routeSnapshot = { queryParams: { demo: 'true' } } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard(routeSnapshot, { url: '/artisans/favorites' } as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('redirects unauthenticated traveler to /auth with returnUrl query parameter', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const routeSnapshot = { queryParams: {} } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard(routeSnapshot, { url: '/artisans/favorites' } as RouterStateSnapshot)
    ) as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(result.toString()).toContain('/auth?returnUrl=%2Fartisans%2Ffavorites');
  });
});
