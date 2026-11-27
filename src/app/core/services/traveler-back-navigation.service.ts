import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { ArtisanNavigationService } from '../../features/artisan/services/artisan-navigation.service';

export interface InternalRouteEntry {
  url: string;
  path: string;
  scrollY: number;
}

const EXCLUDED_RETURN_PREFIXES = [
  '/provider',
  '/admin',
  '/auth',
  '/login',
  '/register',
  '/forgot-password',
  '/check-email',
  '/reset-password',
  '/login-success',
  '/register-success',
  '/reset-success',
];

const PROTECTED_ROUTE_PREFIXES = [
  '/my-bookings',
  '/wishlist',
  '/community/my-posts',
  '/community/saved',
  '/artisans/favorites',
  '/experiences/bookings',
  '/experiences/wishlist',
  '/profile',
  '/notifications',
  '/settings',
];

@Injectable({
  providedIn: 'root',
})
export class TravelerBackNavigationService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly artisanNav = inject(ArtisanNavigationService);

  private readonly historyStack: InternalRouteEntry[] = [];
  private readonly currentUrlSignal = signal<string>('/');
  private readonly confirmedBookingUrls = new Set<string>();
  private pendingRestoreScrollY: number | null = null;
  private navigatingBack = false;

  readonly currentUrl = this.currentUrlSignal.asReadonly();

  readonly isHomepage = computed(() => this.isHomePath(this.normalizePath(this.currentUrlSignal())));

  readonly showBackButton = computed(() => !this.isHomepage());

  constructor() {
    const initialUrl = this.sanitizeInternalUrl(this.router.url || '/');
    this.currentUrlSignal.set(initialUrl);
    if (!this.isExcludedRoute(this.normalizePath(initialUrl))) {
      this.historyStack.push({
        url: initialUrl,
        path: this.normalizePath(initialUrl),
        scrollY: 0,
      });
    }

    this.router.events
      ?.pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => {
        if (this.historyStack.length > 0 && typeof window !== 'undefined') {
          this.historyStack[this.historyStack.length - 1].scrollY = window.scrollY || 0;
        }
      });

    this.router.events
      ?.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const rawNext = event.urlAfterRedirects || event.url || '/';
        const nextUrl = this.sanitizeInternalUrl(rawNext);
        const nextPath = this.normalizePath(nextUrl);
        this.currentUrlSignal.set(nextUrl);

        if (this.navigatingBack) {
          this.navigatingBack = false;
          this.restoreScrollIfRequested();
          return;
        }

        if (!this.isExcludedRoute(nextPath)) {
          const top = this.historyStack[this.historyStack.length - 1];
          if (!top || top.url !== nextUrl) {
            // Collapse immediate A -> B -> A loops if user navigated back via link.
            if (this.historyStack.length >= 2 && this.historyStack[this.historyStack.length - 2].url === nextUrl) {
              this.historyStack.pop();
            } else {
              this.historyStack.push({ url: nextUrl, path: nextPath, scrollY: 0 });
            }
          }
        }
      });
  }

  markBookingConfirmed(url?: string): void {
    const targetPath = this.normalizePath(url ?? this.currentUrlSignal());
    this.confirmedBookingUrls.add(targetPath);
  }

  clearBookingConfirmed(url?: string): void {
    const targetPath = this.normalizePath(url ?? this.currentUrlSignal());
    this.confirmedBookingUrls.delete(targetPath);
  }

  /**
   * Navigates back cleanly inside the CeylonGo Traveler portal:
   * - Respects authentication & logout state.
   * - Prevents loops, external redirects, and returning to completed payment steps.
   * - Preserves query parameters and restores scroll position when returning to prior pages.
   * - Falls back to hierarchical parent routes when accessed directly by URL.
   */
  goBack(): void {
    const currentUrl = this.currentUrlSignal();
    const currentPath = this.normalizePath(currentUrl);
    if (this.isHomePath(currentPath)) {
      return;
    }

    // Completed booking confirmation pages must safely route to My Bookings (or discovery if guest).
    if (this.isConfirmedBookingScreen(currentUrl, currentPath)) {
      const safePostBooking = this.authService.isAuthenticated() ? '/my-bookings' : this.resolveFallbackUrl(currentUrl);
      this.navigateSafely(safePostBooking, null);
      return;
    }

    // Walk backward in internal history stack skipping same page, unsafe payment routes,
    // excluded portal routes, or protected routes after logout.
    if (this.historyStack.length > 1) {
      for (let i = this.historyStack.length - 2; i >= 0; i -= 1) {
        const candidate = this.historyStack[i];
        if (!this.isSafeReturnCandidate(candidate, currentUrl, currentPath)) {
          continue;
        }
        this.historyStack.splice(i + 1);
        this.navigateSafely(candidate.url, candidate.scrollY);
        return;
      }
    }

    // No valid internal history: resolve deterministic hierarchical parent route.
    const fallbackUrl = this.resolveFallbackUrl(currentUrl);
    this.navigateSafely(fallbackUrl, null);
  }

  resolveFallbackUrl(currentUrl: string): string {
    const path = this.normalizePath(currentUrl);
    const querySuffix = this.buildPreservedQueryString(currentUrl);

    // Booking & Checkout flows
    if (/^\/homestays\/([^/]+)\/booking$/.test(path)) {
      const id = path.match(/^\/homestays\/([^/]+)\/booking$/)![1];
      return `/homestays/${id}${querySuffix}`;
    }
    if (/^\/homestays\/[^/]+$/.test(path)) {
      return this.withSavedDiscoveryParams('/homestays', querySuffix);
    }
    if (/^\/homestays?$/.test(path) || path === '/explore' || path === '/stays') {
      return '/';
    }

    if (/^\/experiences\/bookings\/[^/]+$/.test(path)) {
      return `/experiences/bookings${querySuffix}`;
    }
    if (path === '/experiences/bookings' || path === '/experiences/wishlist') {
      return `/experiences${querySuffix}`;
    }
    if (/^\/experiences\/([^/]+)\/book$/.test(path)) {
      const id = path.match(/^\/experiences\/([^/]+)\/book$/)![1];
      return `/experiences/${id}${querySuffix}`;
    }
    if (/^\/experiences\/[^/]+$/.test(path)) {
      return `/experiences${querySuffix}`;
    }
    if (path === '/experiences') {
      return '/';
    }

    if (/^\/tour-guides\/([^/]+)\/booking$/.test(path)) {
      const id = path.match(/^\/tour-guides\/([^/]+)\/booking$/)![1];
      return `/tour-guides/${id}${querySuffix}`;
    }
    if (/^\/tour-guides\/[^/]+$/.test(path)) {
      return `/tour-guides${querySuffix}`;
    }
    if (path === '/tour-guides' || path === '/tour-guide') {
      return '/';
    }

    if (/^\/bicycles\/([^/]+)\/booking$/.test(path)) {
      const id = path.match(/^\/bicycles\/([^/]+)\/booking$/)![1];
      return `/bicycles/${id}${querySuffix}`;
    }
    if (/^\/bicycles\/[^/]+$/.test(path)) {
      return `/bicycles${querySuffix}`;
    }
    if (path === '/bicycles' || path === '/bike-rentals' || path === '/rentals') {
      return '/';
    }

    // Artisans
    if (/^\/artisans\/products\/[^/]+$/.test(path)) {
      const artisanId = this.artisanNav.getLastArtisanId();
      if (artisanId) {
        return `/artisans/${artisanId}${querySuffix}`;
      }
      return this.withSavedArtisanDiscoveryParams(querySuffix);
    }
    if (/^\/artisans\/([^/]+)\/contact$/.test(path)) {
      const id = path.match(/^\/artisans\/([^/]+)\/contact$/)![1];
      return `/artisans/${id}${querySuffix}`;
    }
    if (path === '/artisans/favorites') {
      return this.withSavedArtisanDiscoveryParams(querySuffix);
    }
    if (/^\/artisans\/[^/]+$/.test(path) && path !== '/artisans/discover') {
      return this.withSavedArtisanDiscoveryParams(querySuffix);
    }
    if (path === '/artisans/discover' || path === '/artisans') {
      return '/';
    }

    // Community
    if (/^\/community\/posts\/[^/]+$/.test(path) || path === '/community/my-posts' || path === '/community/saved') {
      return `/community${querySuffix}`;
    }
    if (path === '/community') {
      return '/';
    }

    // AI Smart Travel Planner
    if (/^\/ai-planner\/saved\/[^/]+$/.test(path)) {
      return `/ai-planner/saved${querySuffix}`;
    }
    if (path === '/ai-planner/saved' || /^\/ai-planner\/chat\/[^/]+$/.test(path)) {
      return '/ai-planner';
    }
    if (path === '/ai-planner') {
      return '/';
    }

    // Traveler Account Management, Bookings & Wishlist
    if (/^\/my-bookings\/[^/]+(?:\/[^/]+)?$/.test(path)) {
      return `/my-bookings${querySuffix}`;
    }
    if (
      path === '/my-bookings' ||
      path === '/wishlist' ||
      path === '/profile' ||
      path === '/notifications' ||
      path === '/settings'
    ) {
      return '/';
    }

    return '/';
  }

  private navigateSafely(targetUrl: string, scrollY: number | null): void {
    const cleanUrl = this.sanitizeInternalUrl(targetUrl);
    this.navigatingBack = true;
    this.pendingRestoreScrollY = scrollY;

    this.router.navigateByUrl(cleanUrl).then((navigated) => {
      if (!navigated) {
        // Guard (e.g. CanDeactivate unsaved-form prompt or auth guard) prevented navigation.
        this.navigatingBack = false;
        this.pendingRestoreScrollY = null;
      } else {
        this.restoreScrollIfRequested();
      }
    });
  }

  private restoreScrollIfRequested(): void {
    if (this.pendingRestoreScrollY === null || typeof window === 'undefined') {
      return;
    }
    const y = this.pendingRestoreScrollY;
    this.pendingRestoreScrollY = null;
    if (typeof window.scrollTo === 'function') {
      setTimeout(() => window.scrollTo({ top: y, behavior: 'auto' }), 0);
    }
  }

  private isSafeReturnCandidate(
    candidate: InternalRouteEntry,
    currentUrl: string,
    currentPath: string,
  ): boolean {
    if (candidate.url === currentUrl || candidate.path === currentPath) {
      return false;
    }
    if (this.isExcludedRoute(candidate.path)) {
      return false;
    }
    if (this.isConfirmedBookingScreen(candidate.url, candidate.path)) {
      return false;
    }
    if (this.isProtectedRoute(candidate.path) && !this.authService.isAuthenticated()) {
      return false;
    }
    return true;
  }

  private isConfirmedBookingScreen(url: string, path: string): boolean {
    if (this.confirmedBookingUrls.has(path)) {
      return true;
    }
    if (/booking-confirmation|payment\/complete|checkout\/complete/i.test(path)) {
      return true;
    }
    return /[?&](confirmed|paymentStatus)=(1|true|confirmed|paid)/i.test(url);
  }

  private isExcludedRoute(path: string): boolean {
    return EXCLUDED_RETURN_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private isProtectedRoute(path: string): boolean {
    return PROTECTED_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private isHomePath(path: string): boolean {
    return path === '/' || path === '' || path === '/home' || path === '/traveler' || path === '/traveler/home';
  }

  private normalizePath(url: string): string {
    const clean = (url || '/').split('?')[0].split('#')[0];
    return clean.startsWith('/') ? clean : `/${clean}`;
  }

  private sanitizeInternalUrl(url: string): string {
    if (!url || /^https?:\/\//i.test(url) || url.startsWith('//')) {
      return '/';
    }
    return url.startsWith('/') ? url : `/${url}`;
  }

  private buildPreservedQueryString(currentUrl: string): string {
    const qIndex = currentUrl.indexOf('?');
    if (qIndex === -1) return '';
    const search = currentUrl.slice(qIndex + 1).split('#')[0];
    const params = new URLSearchParams(search);
    params.delete('confirmed');
    params.delete('paymentStatus');
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }

  private withSavedDiscoveryParams(basePath: string, querySuffix: string): string {
    return `${basePath}${querySuffix}`;
  }

  private withSavedArtisanDiscoveryParams(querySuffix: string): string {
    if (querySuffix) {
      return `/artisans/discover${querySuffix}`;
    }
    const saved = this.artisanNav.getLastDiscoveryParams();
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(saved)) {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        params.set(key, String(val));
      }
    }
    const qs = params.toString();
    return qs ? `/artisans/discover?${qs}` : '/artisans/discover';
  }
}
