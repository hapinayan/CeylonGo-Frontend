import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { AuthEntry } from './auth-entry';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthEntry', () => {
  let component: AuthEntry;
  let fixture: ComponentFixture<AuthEntry>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthEntry],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'login', component: DummyComponent },
          { path: 'register', component: DummyComponent },
          { path: 'login-success', component: DummyComponent },
          { path: 'auth', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthEntry);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize with invalid empty email form', () => {
    expect(component.emailForm.valid).toBe(false);
    expect(component.isLoading()).toBe(false);
  });

  it('should not call checkEmail if form is invalid', () => {
    const checkSpy = vi.spyOn(authService, 'checkEmail');
    component.continueWithEmail();
    expect(checkSpy).not.toHaveBeenCalled();
    expect(component.emailForm.get('email')?.touched).toBe(true);
  });

  it('should navigate to /login when email is registered', () => {
    vi.spyOn(authService, 'checkEmail').mockReturnValue(
      of({ email: 'traveler@ceylongo.com', is_registered: true })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    component.emailForm.setValue({ email: 'traveler@ceylongo.com' });
    component.continueWithEmail();

    expect(component.isLoading()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { email: 'traveler@ceylongo.com' },
    });
  });

  it('should navigate to /register when email is not registered', () => {
    vi.spyOn(authService, 'checkEmail').mockReturnValue(
      of({ email: 'new@ceylongo.com', is_registered: false })
    );
    const navSpy = vi.spyOn(router, 'navigate');

    component.emailForm.setValue({ email: 'new@ceylongo.com' });
    component.continueWithEmail();

    expect(component.isLoading()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/register'], {
      queryParams: { email: 'new@ceylongo.com' },
    });
  });

  it('should display rate limit message on 429 response', () => {
    vi.spyOn(authService, 'checkEmail').mockReturnValue(
      throwError(() => ({ status: 429, error: { detail: 'Too many requests' } }))
    );

    component.emailForm.setValue({ email: 'spam@ceylongo.com' });
    component.continueWithEmail();

    expect(component.isLoading()).toBe(false);
    expect(component.socialMessage()).toContain('Too many requests');
  });

  it('should display offline/server error message on status 0', () => {
    vi.spyOn(authService, 'checkEmail').mockReturnValue(
      throwError(() => ({ status: 0 }))
    );

    component.emailForm.setValue({ email: 'traveler@ceylongo.com' });
    component.continueWithEmail();

    expect(component.isLoading()).toBe(false);
    expect(component.socialMessage()).toContain('Cannot connect to backend server');
  });

  it('should show coming soon message on WhatsApp click', () => {
    component.continueWithWhatsApp();
    expect(component.socialMessage()).toContain('WhatsApp Sign In is coming soon');
  });

  it('should close modal when clicking on backdrop', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const mockBackdropEvent = {
      target: { classList: { contains: (cls: string) => cls === 'auth-page' } },
    } as unknown as MouseEvent;

    component.onBackdropClick(mockBackdropEvent);
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should not close modal when clicking inside modal content', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const mockModalEvent = {
      target: { classList: { contains: (cls: string) => false } },
    } as unknown as MouseEvent;

    component.onBackdropClick(mockModalEvent);
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('should navigate to / on closeModal()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });
});
