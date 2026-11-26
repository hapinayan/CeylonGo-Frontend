import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderPreviewService } from '../../provider/provider-preview.service';
import { ProviderAuthService } from '../services/provider-auth.service';
import { providerAuthGuard } from './provider-auth.guard';

describe('providerAuthGuard', () => {
  let router: Router;
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isApprovedProvider: ReturnType<typeof vi.fn>;
  };
  let previewServiceMock: {
    canUsePreview: ReturnType<typeof vi.fn>;
    syncFromNavigation: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
  };

  const executeGuard = (previewQuery: string | null = null, url = '/provider/dashboard') => {
    const route = {
      queryParamMap: convertToParamMap(previewQuery ? { preview: previewQuery } : {}),
    } as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;

    return TestBed.runInInjectionContext(() => providerAuthGuard(route, state));
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      isApprovedProvider: vi.fn(),
    };
    previewServiceMock = {
      canUsePreview: vi.fn().mockReturnValue(false),
      syncFromNavigation: vi.fn().mockReturnValue(false),
      disable: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProviderAuthService, useValue: authServiceMock },
        { provide: ProviderPreviewService, useValue: previewServiceMock },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when provider is authenticated and approved', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.isApprovedProvider.mockReturnValue(true);

    const result = executeGuard();
    expect(result).toBe(true);
    expect(previewServiceMock.disable).toHaveBeenCalled();
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

  it('allows preview navigation in local development when preview=true without authentication', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.isApprovedProvider.mockReturnValue(false);
    previewServiceMock.canUsePreview.mockReturnValue(true);
    previewServiceMock.syncFromNavigation.mockReturnValue(true);

    const result = executeGuard('true', '/provider/dashboard?preview=true');
    expect(result).toBe(true);
  });

  it('blocks preview navigation and redirects to /provider/login when production build disables preview', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.isApprovedProvider.mockReturnValue(false);
    previewServiceMock.canUsePreview.mockReturnValue(false);

    const result = executeGuard('true', '/provider/dashboard?preview=true') as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/provider/login');
    expect(previewServiceMock.syncFromNavigation).not.toHaveBeenCalled();
  });
});
