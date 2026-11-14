import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { ForgotPassword } from './forgot-password';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'check-email', component: DummyComponent },
          { path: 'auth', component: DummyComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'email' ? 'prefilled@ceylongo.com' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize with email prefilled from route query param', () => {
    expect(component.forgotForm.value.email).toBe('prefilled@ceylongo.com');
  });

  it('should not call authService.forgotPassword if form is invalid', () => {
    const forgotSpy = vi.spyOn(authService, 'forgotPassword');
    component.forgotForm.setValue({ email: '' });
    component.sendResetLink();

    expect(forgotSpy).not.toHaveBeenCalled();
    expect(component.forgotForm.get('email')?.touched).toBe(true);
  });

  it('should call authService.forgotPassword and navigate to /check-email on success', () => {
    vi.spyOn(authService, 'forgotPassword').mockReturnValue(
      of({ message: 'If an account exists, a reset link has been sent.' })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    component.forgotForm.setValue({ email: 'traveler@ceylongo.com' });
    component.sendResetLink();

    expect(component.isLoading).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/check-email'], {
      state: { email: 'traveler@ceylongo.com' },
    });
  });

  it('should display rate limit message on 429 response', () => {
    vi.spyOn(authService, 'forgotPassword').mockReturnValue(
      throwError(() => ({ status: 429, error: { detail: 'Rate limit exceeded' } }))
    );

    component.forgotForm.setValue({ email: 'traveler@ceylongo.com' });
    component.sendResetLink();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Too many password reset attempts');
  });

  it('should display connection error message on status 0', () => {
    vi.spyOn(authService, 'forgotPassword').mockReturnValue(
      throwError(() => ({ status: 0 }))
    );

    component.forgotForm.setValue({ email: 'traveler@ceylongo.com' });
    component.sendResetLink();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Cannot connect to backend server');
  });

  it('should navigate to /login with email queryParam on goBack()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goBack();
    expect(navSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { email: 'prefilled@ceylongo.com' },
    });
  });

  it('should navigate to /auth on closeModal()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should handle backdrop clicks appropriately', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const backdropEvent = {
      target: { classList: { contains: (c: string) => c === 'forgot-page' } },
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
