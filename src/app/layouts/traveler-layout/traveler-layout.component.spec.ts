import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { routes } from '../../app.routes';
import { TravelerLayoutComponent } from './traveler-layout.component';

@Component({ standalone: true, template: '<p>Sample Traveler View</p>' })
class MockPageComponent {}

describe('TravelerLayoutComponent & Route Shell Isolation', () => {
  const authUser = signal(null);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: AuthService,
          useValue: {
            currentUser: authUser,
            isAuthenticated: () => false,
            getToken: () => null,
          },
        },
        provideRouter([
          {
            path: '',
            component: TravelerLayoutComponent,
            children: [
              { path: '', component: MockPageComponent, pathMatch: 'full' },
              { path: 'homestays', component: MockPageComponent },
              { path: 'artisans/discover', component: MockPageComponent },
              { path: 'community', component: MockPageComponent },
            ],
          },
        ]),
      ],
    }).compileComponents();
  });

  it('renders single Navbar and Footer, hides Back on Homepage, and shows Back on inner Traveler pages', async () => {
    const harness = await RouterTestingHarness.create('/');
    const el = harness.routeNativeElement?.parentElement ?? document.body;

    expect(el.querySelectorAll('app-traveler-navbar').length).toBe(1);
    expect(el.querySelectorAll('app-footer').length).toBe(1);
    expect(el.querySelector('.traveler-back-btn')).toBeNull();

    for (const target of ['/homestays', '/artisans/discover', '/community']) {
      await harness.navigateByUrl(target);
      expect(el.querySelectorAll('app-traveler-navbar').length).toBe(1);
      expect(el.querySelectorAll('app-footer').length).toBe(1);
      const backBtn = el.querySelector('.traveler-back-btn');
      expect(backBtn).toBeTruthy();
      expect(backBtn?.textContent?.trim()).toBe('Back');
    }
  });

  it('keeps Provider routes isolated outside TravelerLayoutComponent', () => {
    const providerRoute = routes.find((r) => r.path === 'provider' && r.children);
    expect(providerRoute).toBeDefined();

    const travelerLayoutRoot = routes.find((r) => r.path === '' && r.children);
    expect(travelerLayoutRoot).toBeDefined();
    const childPaths = travelerLayoutRoot?.children?.map((c) => c.path) ?? [];
    expect(childPaths).not.toContain('provider');
    expect(childPaths).toContain('community');
    expect(childPaths).toContain('artisans');
    expect(childPaths).toContain('homestays');
    expect(childPaths).toContain('experiences');
    expect(childPaths).toContain('bicycles');
    expect(childPaths).toContain('tour-guides');
    expect(childPaths).toContain('my-bookings');
    expect(childPaths).toContain('wishlist');
  });
});
