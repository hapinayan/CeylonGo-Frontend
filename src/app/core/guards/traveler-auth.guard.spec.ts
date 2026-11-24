import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { travelerAuthGuard } from './traveler-auth.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.models';

describe('travelerAuthGuard', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  const sampleTraveler: User = {
    id: 1,
    full_name: 'Hapinayan Perera',
    email: 'hapinayan017@gmail.com',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      currentUser: vi.fn(),
    };

    routerMock = {
      createUrlTree: vi.fn((commands: any[]) => ({ toString: () => commands.join('/') } as unknown as UrlTree)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access when user is authenticated with traveler role', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(sampleTraveler);

    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('should allow access when authenticated and user profile is not yet loaded', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated users to public homepage (/)', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).not.toBe(true);
  });

  it('should redirect provider users away from traveler routes to provider dashboard', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue({
      ...sampleTraveler,
      role: 'provider',
    });

    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/provider/dashboard']);
    expect(result).not.toBe(true);
  });

  it('should redirect admin users away from traveler routes to public homepage', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.currentUser.mockReturnValue({
      ...sampleTraveler,
      role: 'admin',
    });

    const result = TestBed.runInInjectionContext(() =>
      travelerAuthGuard({} as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).not.toBe(true);
  });
});
