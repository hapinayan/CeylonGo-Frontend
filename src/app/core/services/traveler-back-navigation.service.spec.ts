import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanNavigationService } from '../../features/artisan/services/artisan-navigation.service';
import { AuthService } from './auth.service';
import { TravelerBackNavigationService } from './traveler-back-navigation.service';

@Component({ standalone: true, template: '' })
class DummyRouteComponent {}

describe('TravelerBackNavigationService', () => {
  let service: TravelerBackNavigationService;
  let router: Router;
  let artisanNav: ArtisanNavigationService;
  const authState = signal(true);

  beforeEach(async () => {
    authState.set(true);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: DummyRouteComponent },
          { path: 'homestays', component: DummyRouteComponent },
          { path: 'homestays/:id', component: DummyRouteComponent },
          { path: 'homestays/:id/booking', component: DummyRouteComponent },
          { path: 'experiences', component: DummyRouteComponent },
          { path: 'experiences/:id', component: DummyRouteComponent },
          { path: 'experiences/:id/book', component: DummyRouteComponent },
          { path: 'tour-guides', component: DummyRouteComponent },
          { path: 'tour-guides/:id', component: DummyRouteComponent },
          { path: 'bicycles', component: DummyRouteComponent },
          { path: 'bicycles/:id', component: DummyRouteComponent },
          { path: 'artisans/discover', component: DummyRouteComponent },
          { path: 'artisans/products/:productId', component: DummyRouteComponent },
          { path: 'artisans/:id', component: DummyRouteComponent },
          { path: 'community', component: DummyRouteComponent },
          { path: 'community/posts/:id', component: DummyRouteComponent },
          { path: 'my-bookings', component: DummyRouteComponent },
          { path: 'my-bookings/:service/:id', component: DummyRouteComponent },
          { path: 'wishlist', component: DummyRouteComponent },
        ]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => authState() },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    artisanNav = TestBed.inject(ArtisanNavigationService);
    service = TestBed.inject(TravelerBackNavigationService);
  });

  it('hides Back button on Homepage and shows it on non-homepage routes', async () => {
    await router.navigateByUrl('/');
    expect(service.showBackButton()).toBe(false);

    await router.navigateByUrl('/homestays');
    expect(service.showBackButton()).toBe(true);
  });

  it('resolves deterministic direct URL parent fallbacks without prior internal history', () => {
    artisanNav.setLastArtisanId(7);

    expect(service.resolveFallbackUrl('/homestays/12')).toBe('/homestays');
    expect(service.resolveFallbackUrl('/homestays/12/booking')).toBe('/homestays/12');
    expect(service.resolveFallbackUrl('/experiences/5')).toBe('/experiences');
    expect(service.resolveFallbackUrl('/tour-guides/3')).toBe('/tour-guides');
    expect(service.resolveFallbackUrl('/bicycles/9?type=scooter&city=Ella')).toBe('/bicycles?type=scooter&city=Ella');
    expect(service.resolveFallbackUrl('/artisans/4')).toBe('/artisans/discover');
    expect(service.resolveFallbackUrl('/artisans/products/22')).toBe('/artisans/7');
    expect(service.resolveFallbackUrl('/community/posts/21')).toBe('/community');
    expect(service.resolveFallbackUrl('/my-bookings/homestay/101')).toBe('/my-bookings');
    expect(service.resolveFallbackUrl('/homestays')).toBe('/');
  });

  it('preserves search filters and pagination when navigating back across internal routes', async () => {
    await router.navigateByUrl('/homestays?city=Kandy&page=2');
    await router.navigateByUrl('/homestays/15');

    const navSpy = vi.spyOn(router, 'navigateByUrl');
    service.goBack();
    expect(navSpy).toHaveBeenCalledWith('/homestays?city=Kandy&page=2');
  });

  it('routes safely from completed booking confirmation to My Bookings and skips protected history after logout', async () => {
    await router.navigateByUrl('/my-bookings');
    await router.navigateByUrl('/homestays/15');
    authState.set(false); // Traveler logs out before pressing Back

    const navSpy = vi.spyOn(router, 'navigateByUrl');
    service.goBack();
    // Must skip /my-bookings after logout and never land on a protected route
    expect(navSpy).toHaveBeenCalledWith('/');
    expect(navSpy).not.toHaveBeenCalledWith('/my-bookings');

    authState.set(true);
    await router.navigateByUrl('/homestays/15/booking');
    service.markBookingConfirmed('/homestays/15/booking');
    service.goBack();
    expect(navSpy).toHaveBeenCalledWith('/my-bookings');
  });

  it('blocks external URL manipulation and returns safely to internal fallback', () => {
    expect(service.resolveFallbackUrl('https://evil.example.com/phish')).toBe('/');
    expect(service.resolveFallbackUrl('//evil.example.com/phish')).toBe('/');
  });

  it('resolves deterministic fallback routes for AI Planner pages', () => {
    expect(service.resolveFallbackUrl('/ai-planner/saved/12')).toBe('/ai-planner/saved');
    expect(service.resolveFallbackUrl('/ai-planner/saved')).toBe('/ai-planner');
    expect(service.resolveFallbackUrl('/ai-planner/chat/9')).toBe('/ai-planner');
    expect(service.resolveFallbackUrl('/ai-planner')).toBe('/');
  });

  it('resolves deterministic fallback routes for Traveler Account pages and Booking Details', () => {
    expect(service.resolveFallbackUrl('/profile')).toBe('/');
    expect(service.resolveFallbackUrl('/notifications')).toBe('/');
    expect(service.resolveFallbackUrl('/settings')).toBe('/');
    expect(service.resolveFallbackUrl('/wishlist')).toBe('/');
    expect(service.resolveFallbackUrl('/my-bookings')).toBe('/');
    expect(service.resolveFallbackUrl('/my-bookings/42?status=pending')).toBe('/my-bookings?status=pending');
    expect(service.resolveFallbackUrl('/my-bookings/rental/42?status=completed')).toBe('/my-bookings?status=completed');
  });
});
