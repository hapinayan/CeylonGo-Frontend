import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface DiscoveryNavigationState {
  category?: string | null;
  district?: string | null;
  sort?: string;
  page?: number;
  view?: 'grid' | 'list';
  search?: string;
  demo?: string;
  scrollY?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ArtisanNavigationService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private previousUrl: string | null = null;
  private currentUrl: string | null = null;
  private historyStack: string[] = [];

  private lastDiscoveryParams: Record<string, string | number> = {};
  private lastDiscoveryScrollY = 0;
  private lastArtisanId: number | null = null;

  constructor() {
    this.currentUrl = this.router.url;
    this.historyStack.push(this.currentUrl);

    this.router.events
      ?.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.urlAfterRedirects || event.url;
        this.historyStack.push(this.currentUrl);

        // If on discovery, track URL
        if (this.currentUrl.startsWith('/artisans/discover')) {
          this.parseDiscoveryParamsFromUrl(this.currentUrl);
        }
      });
  }

  /**
   * Save discovery query parameters and scroll position before navigating away.
   */
  recordDiscoveryState(params: Record<string, any>, scrollY = 0): void {
    const cleaned: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') {
        cleaned[k] = v;
      }
    }
    this.lastDiscoveryParams = cleaned;
    this.lastDiscoveryScrollY = scrollY;
  }

  getLastDiscoveryParams(): Record<string, string | number> {
    return { ...this.lastDiscoveryParams };
  }

  getLastDiscoveryScrollY(): number {
    return this.lastDiscoveryScrollY;
  }

  setLastArtisanId(id: number): void {
    this.lastArtisanId = id;
  }

  getLastArtisanId(): number | null {
    return this.lastArtisanId;
  }

  getPreviousUrl(): string | null {
    return this.previousUrl;
  }

  /**
   * Safe back navigation from Contact Artisan to Artisan Profile.
   * Prevents the Contact -> Profile -> Contact history loop.
   */
  navigateBackFromContact(artisanId: number, isDemo: boolean): void {
    const qp: Record<string, string> = isDemo ? { demo: 'true' } : {};

    // Check if the previous route was the artisan profile itself
    const cameFromProfile =
      this.previousUrl &&
      this.previousUrl.includes(`/artisans/${artisanId}`) &&
      !this.previousUrl.includes('/contact');

    if (cameFromProfile) {
      this.location.back();
    } else {
      // Fallback for direct URL or page reload: replaceUrl prevents pushing duplicate history
      this.router.navigate(['/artisans', artisanId], {
        queryParams: qp,
        replaceUrl: true,
      });
    }
  }

  /**
   * Safe back navigation from Product Details to Artisan Profile (Products tab).
   */
  navigateBackFromProduct(artisanId: number, isDemo: boolean): void {
    const qp: Record<string, string> = { tab: 'products' };
    if (isDemo) qp['demo'] = 'true';

    const cameFromProfile =
      this.previousUrl &&
      this.previousUrl.includes(`/artisans/${artisanId}`) &&
      !this.previousUrl.includes('/products/');

    if (cameFromProfile) {
      this.location.back();
    } else {
      this.router.navigate(['/artisans', artisanId], {
        queryParams: qp,
        replaceUrl: true,
      });
    }
  }

  /**
   * Safe back navigation from Artisan Profile to previous context (Discovery, Landing, or Favorites).
   * Preserves all discovery filters, sorting, demo mode, and scroll position.
   */
  navigateBackFromProfile(isDemo: boolean): void {
    // If the user came from Favorites
    if (this.previousUrl && this.previousUrl.includes('/artisans/favorites')) {
      this.location.back();
      return;
    }

    // If the user came directly from Landing (/artisans) without going through discover
    if (
      this.previousUrl &&
      (this.previousUrl === '/artisans' || this.previousUrl.startsWith('/artisans?')) &&
      !this.previousUrl.includes('/discover')
    ) {
      this.location.back();
      return;
    }

    // If the user came from Discovery
    const cameFromDiscovery =
      this.previousUrl && this.previousUrl.includes('/artisans/discover');

    if (cameFromDiscovery) {
      this.location.back();
      return;
    }

    // Fallback: navigate to /artisans/discover with preserved discovery params
    const qp = { ...this.lastDiscoveryParams };
    if (isDemo && !qp['demo']) {
      qp['demo'] = 'true';
    }

    this.router.navigate(['/artisans/discover'], {
      queryParams: qp,
    });
  }

  private parseDiscoveryParamsFromUrl(url: string): void {
    try {
      const qIndex = url.indexOf('?');
      if (qIndex === -1) return;
      const queryString = url.substring(qIndex + 1);
      const searchParams = new URLSearchParams(queryString);
      const parsed: Record<string, string | number> = {};

      searchParams.forEach((val, key) => {
        if (key === 'page') {
          parsed[key] = parseInt(val, 10) || 1;
        } else {
          parsed[key] = val;
        }
      });

      this.lastDiscoveryParams = { ...this.lastDiscoveryParams, ...parsed };
    } catch {
      // Ignore parsing errors
    }
  }
}

