import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError, TimeoutError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { ResetPassword } from './reset-password';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;
  let authService: AuthService;
  let authModalService: AuthModalService;
  let router: Router;

  const mockToken = 'valid-token-abc-123';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        AuthService,
        AuthModalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: DummyComponent },
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
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authModalService = TestBed.inject(AuthModalService);
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
    expect(component.isNetworkOrServerError).toBe(false);
  });

  it('should handle token verification failure on init with 400', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => ({ status: 400, error: { detail: 'Token expired' } }))
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(false);
    expect(component.errorMessage).toContain('Token expired');
    expect(component.isNetworkOrServerError).toBe(false);
  });

  it('should handle network error (status 0) and set isNetworkOrServerError = true', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => ({ status: 0, error: null }))
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(false);
    expect(component.isNetworkOrServerError).toBe(true);
    expect(component.errorMessage).toContain('Unable to connect to CeylonGo server');
  });

  it('should handle timeout error and set isNetworkOrServerError = true', () => {
    const timeoutErr = new TimeoutError();
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => timeoutErr)
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(false);
    expect(component.isNetworkOrServerError).toBe(true);
    expect(component.errorMessage).toContain('timed out');
  });

  it('should handle 422 validation error with array detail', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => ({
        status: 422,
        error: {
          detail: [{ loc: ['query', 'token'], msg: 'String should have at least 10 characters' }],
        },
      }))
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isTokenValid).toBe(false);
    expect(component.errorMessage).toBe('String should have at least 10 characters');
    expect(component.isNetworkOrServerError).toBe(false);
  });

  it('should retry verification on retryVerification()', () => {
    const spy = vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      throwError(() => ({ status: 0 }))
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    component.retryVerification();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(component.isTokenValid).toBe(true);
    expect(component.isNetworkOrServerError).toBe(false);
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
      state: { email: 'traveler@ceylongo.com', verified: true },
      queryParams: { email: 'traveler@ceylongo.com' },
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

  it('should open auth modal and navigate to / on backToLogin()', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const modalSpy = vi.spyOn(authModalService, 'open');
    const navSpy = vi.spyOn(router, 'navigate');
    component.backToLogin();
    expect(modalSpy).toHaveBeenCalledWith('login');
    expect(authModalService.userEmail()).toBe('traveler@ceylongo.com');
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to / on closeModal()', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should handle backdrop clicks appropriately', () => {
    vi.spyOn(authService, 'verifyResetToken').mockReturnValue(
      of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
    );

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const navSpy = vi.spyOn(router, 'navigate');
    const backdropEvent = {
      target: { classList: { contains: (c: string) => c === 'reset-page' } },
    } as unknown as MouseEvent;

    component.onBackdropClick(backdropEvent);
    expect(navSpy).toHaveBeenCalledWith(['/']);

    navSpy.mockClear();
    const modalEvent = {
      target: { classList: { contains: () => false } },
    } as unknown as MouseEvent;

    component.onBackdropClick(modalEvent);
    expect(navSpy).not.toHaveBeenCalled();
  });
});
