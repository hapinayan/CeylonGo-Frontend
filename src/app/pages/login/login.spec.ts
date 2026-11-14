import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceMock: {
    login: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    let mockUser: any = null;
    authServiceMock = {
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      currentUser: vi.fn(() => mockUser),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([
          { path: 'login-success', component: class {} },
          { path: 'register', component: class {} },
          { path: 'auth', component: class {} },
        ]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'registered' ? 'true' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize and show registration success query message', () => {
    expect(component.successMessage()).toContain('Account registered successfully');
    expect(component.loginForm.valid).toBe(false);
  });

  it('should validate email and password requirements', () => {
    component.loginForm.patchValue({ email: 'invalid-email', password: '123' });
    expect(component.loginForm.get('email')?.hasError('email')).toBe(true);
    expect(component.loginForm.get('password')?.hasError('minlength')).toBe(true);
  });

  it('should login, trigger /auth/me, and reset isLoading to false on success', () => {
    component.loginForm.setValue({
      email: 'traveler@ceylongo.lk',
      password: 'Password123!',
    });

    const mockLoginRes = {
      access_token: 'fake-jwt-token-xyz',
      token_type: 'bearer',
      user: {
        id: 1,
        full_name: 'Test Traveler',
        email: 'traveler@ceylongo.lk',
        role: 'traveler',
        is_active: true,
        created_at: '',
      },
    };

    authServiceMock.login.mockReturnValue(of(mockLoginRes));
    authServiceMock.getCurrentUser.mockReturnValue(of(mockLoginRes.user));
    authServiceMock.currentUser.mockReturnValue(mockLoginRes.user);

    component.onLogin();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'traveler@ceylongo.lk',
      password: 'Password123!',
    });
    expect(authServiceMock.getCurrentUser).toHaveBeenCalled();
    expect(component.successMessage()).toContain('Welcome back, Test Traveler!');
    expect(component.currentUser?.full_name).toBe('Test Traveler');
    expect(component.isLoading()).toBe(false);
  });

  it('should reset isLoading to false on 401 invalid credentials error', () => {
    component.loginForm.setValue({
      email: 'traveler@ceylongo.lk',
      password: 'WrongPassword123!',
    });

    authServiceMock.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { detail: 'Invalid email or password' },
          })
      )
    );

    component.onLogin();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Invalid email or password.');
  });

  it('should reset isLoading to false on 403 inactive account error', () => {
    component.loginForm.setValue({
      email: 'inactive@ceylongo.lk',
      password: 'Password123!',
    });

    authServiceMock.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { detail: 'Account is inactive. Please contact support.' },
          })
      )
    );

    component.onLogin();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Account is inactive. Please contact support.'
    );
  });

  it('should reset isLoading to false even if /auth/me fails after successful login', () => {
    component.loginForm.setValue({
      email: 'traveler@ceylongo.lk',
      password: 'Password123!',
    });

    const mockLoginRes = {
      access_token: 'fake-jwt-token-xyz',
      token_type: 'bearer',
      user: {
        id: 1,
        full_name: 'Test Traveler',
        email: 'traveler@ceylongo.lk',
        role: 'traveler',
        is_active: true,
        created_at: '',
      },
    };

    authServiceMock.login.mockReturnValue(of(mockLoginRes));
    authServiceMock.getCurrentUser.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    authServiceMock.currentUser.mockReturnValue(mockLoginRes.user);

    component.onLogin();

    expect(authServiceMock.login).toHaveBeenCalled();
    expect(authServiceMock.getCurrentUser).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.currentUser?.full_name).toBe('Test Traveler');
    expect(component.successMessage()).toContain('Welcome back, Test Traveler!');
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });

  it('should navigate to /forgot-password with email queryParam', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.loginForm.patchValue({ email: 'traveler@ceylongo.lk' });
    component.forgotPassword();
    expect(navSpy).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: { email: 'traveler@ceylongo.lk' },
    });
  });

  it('should navigate to /auth on closeModal and goBack', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);

    component.goBack();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should navigate to /register on goToRegister', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goToRegister();
    expect(navSpy).toHaveBeenCalledWith(['/register']);
  });

  it('should handle backdrop clicks appropriately', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const backdropEvent = {
      target: { classList: { contains: (c: string) => c === 'login-page' } },
    } as unknown as MouseEvent;

    component.onBackdropClick(backdropEvent);
    expect(navSpy).toHaveBeenCalledWith(['/auth']);

    navSpy.mockClear();
    const modalEvent = {
      target: { classList: { contains: () => false } },
    } as unknown as MouseEvent;

    component.onBackdropClick(modalEvent);
    expect(navSpy).not.toHaveBeenCalled();
  });
});
