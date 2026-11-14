import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RegisterSuccess } from './register-success';

describe('RegisterSuccess Component', () => {
  let component: RegisterSuccess;
  let fixture: ComponentFixture<RegisterSuccess>;
  let router: Router;

  describe('with valid state', () => {
    beforeEach(async () => {
      // Mock history.state
      vi.spyOn(history, 'state', 'get').mockReturnValue({
        fullName: 'Kasun Perera',
        email: 'kasun@example.com',
      });

      await TestBed.configureTestingModule({
        imports: [RegisterSuccess],
        providers: [
          provideRouter([
            { path: 'login', component: class {} },
            { path: 'auth', component: class {} },
          ]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: () => null,
                },
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(RegisterSuccess);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      fixture.detectChanges();
    });

    it('should initialize and read fullName, email, and compute firstName', () => {
      expect(component.email).toBe('kasun@example.com');
      expect(component.fullName).toBe('Kasun Perera');
      expect(component.firstName).toBe('Kasun');
    });

    it('should render personalized greeting, email box, and success heading', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('Account Created Successfully!');
      expect(compiled.querySelector('.subtitle')?.textContent).toContain('Welcome to CeylonGo! Your account is ready.');
      expect(compiled.querySelector('.personalized-greeting')?.textContent).toContain('Hello, Kasun!');
      expect(compiled.querySelector('.email-value')?.textContent).toContain('kasun@example.com');
      expect(compiled.querySelector('.journey-text')?.textContent).toContain('Sign in to start exploring Sri Lanka with CeylonGo.');
    });

    it('should navigate to /login with email and registered query parameters on goToLogin', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.goToLogin();

      expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          email: 'kasun@example.com',
          registered: 'true',
        },
      });
    });

    it('should navigate to /auth on goToHome and goToAuth', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');

      component.goToHome();
      expect(navigateSpy).toHaveBeenCalledWith(['/auth']);

      component.goToAuth();
      expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
    });

    it('should navigate to /auth on closeModal', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.closeModal();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
    });

    it('should navigate to /auth on backdrop click', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      const backdropEl = document.createElement('div');
      backdropEl.className = 'success-page';

      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: backdropEl, enumerable: true });

      component.onBackdropClick(event);
      expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
    });

    it('should not dismiss modal when clicking card content', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      const cardEl = document.createElement('div');
      cardEl.className = 'success-card';

      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: cardEl, enumerable: true });

      component.onBackdropClick(event);
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('with missing registration state', () => {
    beforeEach(async () => {
      vi.spyOn(history, 'state', 'get').mockReturnValue({});

      await TestBed.configureTestingModule({
        imports: [RegisterSuccess],
        providers: [
          provideRouter([
            { path: 'auth', component: class {} },
          ]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: () => null,
                },
              },
            },
          },
        ],
      }).compileComponents();

      router = TestBed.inject(Router);
    });

    it('should redirect safely to /auth when no registration email is available', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      fixture = TestBed.createComponent(RegisterSuccess);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
    });
  });
});
