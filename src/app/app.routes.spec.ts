import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { AuthEntry } from './pages/auth-entry/auth-entry';
import { HomestayDiscovery } from './pages/homestay-discovery/homestay-discovery';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

describe('App Routing Configuration', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should navigate to root path ("") and load unified homepage', async () => {
    await router.navigateByUrl('');
    expect(router.url).toBe('/');
  });

  it('should navigate directly to "/homestays" without authentication requirement', async () => {
    await router.navigateByUrl('/homestays');
    expect(router.url).toBe('/homestays');

    // Verify /homestays route configuration
    const homestayRoute = routes.find((r) => r.path === 'homestays');
    expect(homestayRoute).toBeDefined();
    expect(homestayRoute?.canActivate).toBeUndefined(); // No blocking guards
  });

  it('should redirect alias paths "/homestay", "/explore", and "/stays" to "/homestays"', async () => {
    await router.navigateByUrl('/homestay');
    expect(router.url).toBe('/homestays');

    await router.navigateByUrl('/explore');
    expect(router.url).toBe('/homestays');

    await router.navigateByUrl('/stays');
    expect(router.url).toBe('/homestays');
  });

  it('should redirect alias paths "/bike-rentals" and "/rentals" to "/bicycles"', async () => {
    await router.navigateByUrl('/bike-rentals');
    expect(router.url).toBe('/bicycles');

    await router.navigateByUrl('/rentals');
    expect(router.url).toBe('/bicycles');
  });

  it('should navigate to "/auth" and resolve AuthEntry component', async () => {
    await router.navigateByUrl('/auth');
    expect(router.url).toBe('/auth');

    const authRoute = routes.find((r) => r.path === 'auth');
    expect(authRoute?.component).toBe(AuthEntry);
  });

  it('should navigate to "/login" and resolve Login component', async () => {
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');

    const loginRoute = routes.find((r) => r.path === 'login');
    expect(loginRoute?.component).toBe(Login);
  });

  it('should navigate to "/register" and resolve Register component', async () => {
    await router.navigateByUrl('/register');
    expect(router.url).toBe('/register');

    const registerRoute = routes.find((r) => r.path === 'register');
    expect(registerRoute?.component).toBe(Register);
  });

  it('should redirect unknown wildcard routes ("/**") to "/homestays"', async () => {
    await router.navigateByUrl('/non-existent-traveler-path-xyz');
    expect(router.url).toBe('/homestays');
  });

  it('should lazily resolve HomestayDiscovery component for "/homestays"', async () => {
    const homestayRoute = routes.find((r) => r.path === 'homestays');
    expect(homestayRoute?.loadComponent).toBeDefined();

    if (homestayRoute?.loadComponent) {
      const comp = await (homestayRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayDiscovery);
    }
  });

  it('should register and lazily resolve HomestayDetail for "/homestays/:id"', async () => {
    const detailRoute = routes.find((r) => r.path === 'homestays/:id');
    expect(detailRoute).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();

    if (detailRoute?.loadComponent) {
      const { HomestayDetail } = await import('./pages/homestay-detail/homestay-detail');
      const comp = await (detailRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayDetail);
    }
  });

  it('should register and lazily resolve HomestayBookingReview for "/homestays/:id/booking"', async () => {
    const reviewRoute = routes.find((r) => r.path === 'homestays/:id/booking');
    expect(reviewRoute).toBeDefined();
    expect(reviewRoute?.loadComponent).toBeDefined();

    if (reviewRoute?.loadComponent) {
      const { HomestayBookingReview } = await import('./pages/homestay-booking-review/homestay-booking-review');
      const comp = await (reviewRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayBookingReview);
    }
  });
});

