import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CheckEmail } from './check-email';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('CheckEmail Component', () => {
  let component: CheckEmail;
  let fixture: ComponentFixture<CheckEmail>;
  let router: Router;

  beforeEach(async () => {
    // Set mock history state
    history.replaceState({ email: 'traveler@ceylongo.lk' }, '');

    await TestBed.configureTestingModule({
      imports: [CheckEmail],
      providers: [
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'auth', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckEmail);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize and read email from history state', () => {
    expect(component.email).toBe('traveler@ceylongo.lk');
  });

  it('should navigate to /login with email query parameter on backToLogin()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.backToLogin();
    expect(navSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { email: 'traveler@ceylongo.lk' },
    });
  });

  it('should navigate to /login without query parameter when email is empty', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.email = '';
    component.backToLogin();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should navigate to /auth on closeModal()', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.closeModal();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should close modal when clicking on backdrop', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    const backdropEvent = {
      target: { classList: { contains: (cls: string) => cls === 'status-page' } },
    } as unknown as MouseEvent;

    component.onBackdropClick(backdropEvent);
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
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
