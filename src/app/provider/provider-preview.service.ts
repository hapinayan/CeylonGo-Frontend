import { Injectable, computed, signal } from '@angular/core';
import { Params } from '@angular/router';

import {
  PREVIEW_BOOKINGS,
  PREVIEW_COMMUNITY_POSTS,
  PREVIEW_DASHBOARD_BOOKINGS,
  PREVIEW_DASHBOARD_STATS,
  PREVIEW_LISTINGS,
  PREVIEW_PROVIDER_USER,
  PREVIEW_SLOTS,
  createPreviewPhotoBlob,
  providerPreviewEnabled,
} from './provider-preview';

/**
 * Manages development-only UI Preview Mode for the Provider Portal.
 * In production builds, Angular fileReplacements keep `providerPreviewEnabled = false`,
 * preventing any bypass of `providerAuthGuard` and stripping sample data.
 */
@Injectable({
  providedIn: 'root',
})
export class ProviderPreviewService {
  private readonly activeSignal = signal<boolean>(false);

  readonly isPreview = computed(() => providerPreviewEnabled && this.activeSignal());
  readonly queryParams = computed<Params>(() =>
    this.isPreview() ? { preview: 'true' } : {}
  );

  readonly previewUser = PREVIEW_PROVIDER_USER;
  readonly dashboardStats = PREVIEW_DASHBOARD_STATS;
  readonly dashboardBookings = PREVIEW_DASHBOARD_BOOKINGS;
  readonly sampleListings = PREVIEW_LISTINGS;
  readonly sampleSlotsMap = PREVIEW_SLOTS;
  readonly sampleBookings = PREVIEW_BOOKINGS;
  readonly sampleCommunityPosts = PREVIEW_COMMUNITY_POSTS;

  canUsePreview(): boolean {
    return providerPreviewEnabled;
  }

  /**
   * Synchronize preview state from a URL string or query parameter map.
   * Only activates in local development builds when `preview=true` is requested
   * (or stays active across subsequent `/provider/*` navigations once entered).
   */
  syncFromNavigation(url?: string, previewParam?: string | null): boolean {
    if (!providerPreviewEnabled) {
      this.activeSignal.set(false);
      return false;
    }

    const explicitParam =
      previewParam !== undefined
        ? previewParam
        : this.extractPreviewQueryParam(url ?? '');

    if (explicitParam === 'true') {
      this.activeSignal.set(true);
      return true;
    }

    if (explicitParam === 'false') {
      this.activeSignal.set(false);
      return false;
    }

    if (url && !url.startsWith('/provider')) {
      this.activeSignal.set(false);
      return false;
    }

    return this.activeSignal();
  }

  disable(): void {
    this.activeSignal.set(false);
  }

  getSamplePhotoBlob(): Blob {
    return createPreviewPhotoBlob();
  }

  private extractPreviewQueryParam(url: string): string | null {
    const queryIdx = url.indexOf('?');
    if (queryIdx === -1) return null;
    try {
      const search = new URLSearchParams(url.slice(queryIdx + 1));
      return search.get('preview');
    } catch {
      return null;
    }
  }
}
