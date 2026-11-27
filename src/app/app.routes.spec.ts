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
  const travelerChildren = routes.find((r) => r.path === '' && r.children)?.children ?? [];
  const findAppRoute = (path: string) =>
    routes.find((r) => r.path === path && !r.children) ?? travelerChildren.find((r) => r.path === path);

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
    const homestayRoute = findAppRoute('homestays');
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
    const homestayRoute = findAppRoute('homestays');
    expect(homestayRoute?.loadComponent).toBeDefined();

    if (homestayRoute?.loadComponent) {
      const comp = await (homestayRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayDiscovery);
    }
  });

  it('should register and lazily resolve HomestayDetail for "/homestays/:id"', async () => {
    const detailRoute = findAppRoute('homestays/:id');
    expect(detailRoute).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();

    if (detailRoute?.loadComponent) {
      const { HomestayDetail } = await import('./pages/homestay-detail/homestay-detail');
      const comp = await (detailRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayDetail);
    }
  });

  it('should register and lazily resolve HomestayBookingReview for "/homestays/:id/booking"', async () => {
    const reviewRoute = findAppRoute('homestays/:id/booking');
    expect(reviewRoute).toBeDefined();
    expect(reviewRoute?.loadComponent).toBeDefined();

    if (reviewRoute?.loadComponent) {
      const { HomestayBookingReview } = await import('./pages/homestay-booking-review/homestay-booking-review');
      const comp = await (reviewRoute.loadComponent as Function)();
      expect(comp).toBe(HomestayBookingReview);
    }
  });

  it('should register and resolve TourGuidesComponent, TourGuideDetailComponent, and TourGuideBookingComponent without redirecting to /homestays', async () => {
    await router.navigateByUrl('/tour-guides');
    expect(router.url).toBe('/tour-guides');

    await router.navigateByUrl('/tour-guides/guide-1');
    expect(router.url).toBe('/tour-guides/guide-1');

    await router.navigateByUrl('/tour-guides/guide-1/booking');
    expect(router.url).toBe('/tour-guides/guide-1/booking');

    const listRoute = findAppRoute('tour-guides');
    const detailRoute = findAppRoute('tour-guides/:id');
    const bookingRoute = findAppRoute('tour-guides/:id/booking');

    expect(listRoute?.loadComponent).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();
    expect(bookingRoute?.loadComponent).toBeDefined();

    const [{ TourGuidesComponent }, { TourGuideDetailComponent }, { TourGuideBookingComponent }] =
      await Promise.all([
        import('./pages/tour-guides/tour-guides.component'),
        import('./pages/tour-guides/guide-detail/tour-guide-detail.component'),
        import('./pages/tour-guides/guide-booking/tour-guide-booking.component'),
      ]);

    expect(await (listRoute!.loadComponent as Function)()).toBe(TourGuidesComponent);
    expect(await (detailRoute!.loadComponent as Function)()).toBe(TourGuideDetailComponent);
    expect(await (bookingRoute!.loadComponent as Function)()).toBe(TourGuideBookingComponent);
  });

  it('should navigate directly to "/artisans" and "/artisans/discover" without authentication requirement', async () => {
    const artisanRoute = findAppRoute('artisans');
    expect(artisanRoute).toBeDefined();
    expect(artisanRoute?.canActivate).toBeUndefined();

    await router.navigateByUrl('/artisans');
    expect(router.url).toBe('/artisans');

    await router.navigateByUrl('/artisans/discover');
    expect(router.url).toBe('/artisans/discover');
  });

  it('should configure public "/community" feed & details and protected "/community/my-posts" and "/community/saved" plus "/provider/community"', async () => {
    const communityRoute = findAppRoute('community');
    expect(communityRoute).toBeDefined();
    expect(communityRoute?.canActivate).toBeUndefined();

    await router.navigateByUrl('/community');
    expect(router.url).toBe('/community');

    await router.navigateByUrl('/community/posts/21');
    expect(router.url).toBe('/community/posts/21');

    const { communityRoutes } = await import('./features/community/community.routes');
    const myPostsChild = communityRoutes.find((r) => r.path === 'my-posts');
    const savedChild = communityRoutes.find((r) => r.path === 'saved');
    expect(myPostsChild?.canActivate?.length).toBeGreaterThan(0);
    expect(savedChild?.canActivate?.length).toBeGreaterThan(0);

    const providerRoute = routes.find(
      (r) => r.path === 'provider' && r.children?.some((c) => c.path === 'community'),
    );
    const providerCommunity = providerRoute?.children?.find((r) => r.path === 'community');
    expect(providerCommunity?.loadComponent).toBeDefined();
    const { ProviderCommunityComponent } = await import('./provider/community/provider-community.component');
    expect(await (providerCommunity!.loadComponent as Function)()).toBe(ProviderCommunityComponent);
  });

  it('should configure public "/ai-planner" and protected "/ai-planner/chat/:conversationId" and "/ai-planner/saved"', async () => {
    const aiRoute = findAppRoute('ai-planner');
    expect(aiRoute).toBeDefined();
    expect(aiRoute?.canActivate).toBeUndefined();

    await router.navigateByUrl('/ai-planner');
    expect(router.url).toBe('/ai-planner');

    const { aiPlannerRoutes } = await import('./features/ai-planner/ai-planner.routes');
    const chatChild = aiPlannerRoutes.find((r) => r.path === 'chat/:conversationId');
    const savedChild = aiPlannerRoutes.find((r) => r.path === 'saved');
    const savedDetailChild = aiPlannerRoutes.find((r) => r.path === 'saved/:tripId');
    expect(chatChild?.canActivate?.length).toBeGreaterThan(0);
    expect(savedChild?.canActivate?.length).toBeGreaterThan(0);
    expect(savedDetailChild?.canActivate?.length).toBeGreaterThan(0);
  });

  it('should protect "/profile", "/notifications", and "/settings" under TravelerLayoutComponent', () => {
    for (const p of ['profile', 'notifications', 'settings']) {
      const route = findAppRoute(p);
      expect(route).toBeDefined();
      expect(route?.canActivate?.length).toBeGreaterThan(0);
    }
  });

  it('should expose public "/weather" and "/map" routes under TravelerLayoutComponent', async () => {
    const weatherRoute = findAppRoute('weather');
    const mapRoute = findAppRoute('map');

    expect(weatherRoute).toBeDefined();
    expect(weatherRoute?.canActivate).toBeUndefined();
    expect(mapRoute).toBeDefined();
    expect(mapRoute?.canActivate).toBeUndefined();

    await router.navigateByUrl('/weather');
    expect(router.url).toBe('/weather');

    await router.navigateByUrl('/map');
    expect(router.url).toBe('/map');
  }, 15000);
});

