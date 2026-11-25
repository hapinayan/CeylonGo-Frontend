import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { travelerAuthGuard } from './traveler-auth.guard';
import { User } from '../models/auth.models';

describe('travelerAuthGuard', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };

  const sampleTraveler: User = {
    id: 1,
    full_name: 'Test Traveler',
    email: 'traveler@example.com',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
  };

  const executeGuard = (
    url = '/artisans/favorites',
    queryParams: Record<string, string> = {}
  ) => {
    return TestBed.runInInjectionContext(() =>
      travelerAuthGuard(
        { queryParams } as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      currentUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  it('allows authenticated travelers', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(sampleTraveler);

    expect(executeGuard()).toBe(true);
  });

  it('allows authenticated users while profile is loading', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(null);

    expect(executeGuard()).toBe(true);
  });

  it('redirects unauthenticated users with returnUrl', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);

    const result = executeGuard() as UrlTree;

    expect(result instanceof UrlTree).toBe(true);
    expect(result.toString()).toBe(
      '/auth?returnUrl=%2Fartisans%2Ffavorites'
    );
  });

  it('redirects provider users to provider dashboard', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue({
      ...sampleTraveler,
      role: 'provider',
    });

    const result = executeGuard() as UrlTree;

    expect(result.toString()).toBe('/provider/dashboard');
  });

  it('redirects admin users to homepage', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue({
      ...sampleTraveler,
      role: 'admin',
    });

    const result = executeGuard() as UrlTree;

    expect(result.toString()).toBe('/');
  });

  it('prevents demo authentication bypass', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = executeGuard('/artisans/favorites', {
      demo: 'true',
    });

    expect(result instanceof UrlTree).toBe(true);
  });

  it('prevents preview authentication bypass', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = executeGuard('/artisans/favorites', {
      preview: 'true',
    });

    expect(result instanceof UrlTree).toBe(true);
  });
});