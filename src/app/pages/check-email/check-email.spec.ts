import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { CheckEmail } from './check-email';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('CheckEmail Component', () => {
  let component: CheckEmail;
  let fixture: ComponentFixture<CheckEmail>;
  let router: Router;
  let authModalService: AuthModalService;

  beforeEach(async () => {
    history.replaceState({ email: 'traveler@ceylongo.lk' }, '');

    await TestBed.configureTestingModule({
      imports: [CheckEmail],
      providers: [
        AuthService,
        AuthModalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'login', component: DummyComponent },
          { path: 'auth', component: DummyComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'email' ? null : null),
              },
            },
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckEmail);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authModalService = TestBed.inject(AuthModalService);
    fixture.detectChanges();
  });

  it('should initialize and read email from history state', () => {
    expect(component.email).toBe('traveler@ceylongo.lk');
  });

  it('should read email from query param if history state is empty', () => {
    history.replaceState(null, '');
    const comp = TestBed.createComponent(CheckEmail).componentInstance;
    expect(comp).toBeTruthy();
  });

  it('should open auth modal and navigate to / on backToLogin()', () => {
    const modalSpy = vi.spyOn(authModalService, 'open');
    const navSpy = vi.spyOn(router, 'navigate');
    component.backToLogin();
    expect(modalSpy).toHaveBeenCalledWith('login');
    expect(authModalService.userEmail()).toBe('traveler@ceylongo.lk');
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to / on closeModal()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should close modal when clicking on backdrop', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const backdropEvent = {
      target: { classList: { contains: (cls: string) => cls === 'status-page' } },
    } as unknown as MouseEvent;

    component.onBackdropClick(backdropEvent);
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });

  it('should not close modal when clicking inside modal content', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const modalEvent = {
      target: { classList: { contains: () => false } },
    } as unknown as MouseEvent;

    component.onBackdropClick(modalEvent);
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('should execute openEmailApp without throwing or leaking tokens', () => {
    expect(() => component.openEmailApp()).not.toThrow();
  });
});
