import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { ResetPassword } from './reset-password';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;
  let authService: AuthService;
  let router: Router;

  const mockToken = 'valid-token-abc-123';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'reset-success', component: DummyComponent },
          { path: 'forgot-password', component: DummyComponent },
          { path: 'auth', component: DummyComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'token' ? mockToken : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should verify token on init and set isTokenValid = true on success', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(true);
    expect(component.email).toBe('traveler@ceylongo.com');
    expect(component.token).toBe(mockToken);
  });

  it('should handle token verification failure on init', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => ({ status: 400, error: { detail: 'Token expired' } }))
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(false);
    expect(component.errorMessage).toContain('Token expired');
  });

  it('should validate password matching', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.resetForm.setValue({
      password: 'StrongPassword1',
      confirmPassword: 'DifferentPassword2',
    });

    expect(component.resetForm.valid).toBe(false);
    expect(component.resetForm.errors?.['passwordMismatch']).toBe(true);
  });

  it('should call authService.resetPassword and navigate to /reset-success on submit', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );
    vi.spyOn(authService, 'resetPassword').mockReturnValue(
      of({ message: 'Password has been reset successfully.' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.resetForm.setValue({
      password: 'NewStrongPassword1',
      confirmPassword: 'NewStrongPassword1',
    });

    component.resetPassword();

    expect(navSpy).toHaveBeenCalledWith(['/reset-success'], {
      state: { email: 'traveler@ceylongo.com' },
    });
  });

  it('should toggle password visibility states', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);

    expect(component.showConfirmPassword).toBe(false);
    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(true);
  });

  it('should navigate back to /login with email query param', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.backToLogin();
    expect(navSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { email: 'traveler@ceylongo.com' },
    });
  });

  it('should navigate to /forgot-password on requestNewResetLink()', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.requestNewResetLink();
    expect(navSpy).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: { email: 'traveler@ceylongo.com' },
    });
  });

  it('should navigate to /auth on closeModal()', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should close modal on backdrop click and ignore modal interior clicks', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const backdropEvent = {
      target: { classList: { contains: (cls: string) => cls === 'reset-page' } },
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
