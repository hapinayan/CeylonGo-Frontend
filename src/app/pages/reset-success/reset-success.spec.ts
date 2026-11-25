import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { ResetSuccess } from './reset-success';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('ResetSuccess Component', () => {
  let component: ResetSuccess;
  let fixture: ComponentFixture<ResetSuccess>;
  let router: Router;
  let authModalService: AuthModalService;

  describe('with history state', () => {
    beforeEach(async () => {
      history.replaceState({ email: 'traveler@ceylongo.com', verified: true }, '');

      await TestBed.configureTestingModule({
        imports: [ResetSuccess],
        providers: [
          AuthService,
          AuthModalService,
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([
            { path: '', component: DummyComponent },
            { path: 'login', component: DummyComponent },
          ]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: () => null,
                },
              },
              queryParams: of({}),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetSuccess);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      authModalService = TestBed.inject(AuthModalService);
      fixture.detectChanges();
    });

    it('should read email from history state and not be in demo mode', () => {
      expect(component.email).toBe('traveler@ceylongo.com');
      expect(component.isDemoMode).toBe(false);
    });

    it('should open auth modal and navigate to / on goToLogin()', () => {
      const modalSpy = vi.spyOn(authModalService, 'open');
      const navSpy = vi.spyOn(router, 'navigate');
      component.goToLogin();
      expect(modalSpy).toHaveBeenCalledWith('login');
      expect(authModalService.userEmail()).toBe('traveler@ceylongo.com');
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
        target: { classList: { contains: (c: string) => c === 'success-page' } },
      } as unknown as MouseEvent;

      component.onBackdropClick(backdropEvent);
      expect(navSpy).toHaveBeenCalledWith(['/']);
    });
  });

  describe('with query param and demo mode', () => {
    beforeEach(async () => {
      history.replaceState(null, '');

      await TestBed.configureTestingModule({
        imports: [ResetSuccess],
        providers: [
          AuthService,
          AuthModalService,
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([
            { path: '', component: DummyComponent },
            { path: 'login', component: DummyComponent },
          ]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: (key: string) => {
                    if (key === 'email') return 'query@ceylongo.com';
                    if (key === 'demo') return 'true';
                    return null;
                  },
                },
              },
              queryParams: of({}),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ResetSuccess);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      authModalService = TestBed.inject(AuthModalService);
      fixture.detectChanges();
    });

    it('should read email and demo mode from query param', () => {
      expect(component.email).toBe('query@ceylongo.com');
      expect(component.isDemoMode).toBe(true);
    });
  });
});
