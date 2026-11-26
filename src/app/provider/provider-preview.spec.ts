import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderAuthService } from '../core/services/provider-auth.service';
import { ProviderService } from '../core/services/provider.service';
import { ProviderDashboard } from '../pages/provider-dashboard/provider-dashboard';
import { ProviderLayout } from './layout/provider-layout';
import {
  PREVIEW_BOOKINGS,
  PREVIEW_DASHBOARD_BOOKINGS,
  PREVIEW_DASHBOARD_STATS,
  PREVIEW_LISTINGS,
  PREVIEW_PROVIDER_USER,
} from './provider-preview.development';
import { providerPreviewEnabled } from './provider-preview';
import { ProviderPreviewService } from './provider-preview.service';

describe('Provider Preview Mode', () => {
  it('activates preview mode in development only when preview=true is requested', () => {
    expect(providerPreviewEnabled).toBe(true);
    TestBed.configureTestingModule({});
    const previewService = TestBed.inject(ProviderPreviewService);

    expect(previewService.isPreview()).toBe(false);
    expect(previewService.syncFromNavigation('/provider/dashboard', null)).toBe(false);
    expect(previewService.syncFromNavigation('/provider/dashboard?preview=true', 'true')).toBe(true);
    expect(previewService.isPreview()).toBe(true);
    expect(previewService.queryParams()).toEqual({ preview: 'true' });

    // Preserved across internal provider routes once active
    expect(previewService.syncFromNavigation('/provider/listings')).toBe(true);

    // Cleared when leaving provider portal or explicitly disabled
    expect(previewService.syncFromNavigation('/provider/dashboard?preview=false', 'false')).toBe(false);
    expect(previewService.isPreview()).toBe(false);
  });

  describe('Preview Service HTTP isolation and mutation blocking', () => {
    let service: ProviderService;
    let httpMock: HttpTestingController;
    let authService: ProviderAuthService;

    const activePreviewStub: Partial<ProviderPreviewService> = {
      isPreview: (() => true) as any,
      canUsePreview: () => true,
      queryParams: (() => ({ preview: 'true' })) as any,
      previewUser: PREVIEW_PROVIDER_USER,
      dashboardStats: PREVIEW_DASHBOARD_STATS,
      dashboardBookings: PREVIEW_DASHBOARD_BOOKINGS,
      sampleListings: PREVIEW_LISTINGS,
      sampleBookings: PREVIEW_BOOKINGS,
      sampleSlotsMap: {},
      getSamplePhotoBlob: () => new Blob(['svg'], { type: 'image/svg+xml' }),
    };

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ProviderPreviewService, useValue: activePreviewStub },
        ],
      });
      service = TestBed.inject(ProviderService);
      httpMock = TestBed.inject(HttpTestingController);
      authService = TestBed.inject(ProviderAuthService);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('returns sample data with zero HTTP requests and creates no fake JWT tokens', async () => {
      expect(authService.getToken()).toBeNull();

      const stats = await firstValueFrom(service.getDashboardStats());
      expect(stats.total_listings).toBe(PREVIEW_LISTINGS.length);

      const listings = await firstValueFrom(service.getProviderListings());
      expect(listings.length).toBe(PREVIEW_LISTINGS.length);

      const bookings = await firstValueFrom(service.getProviderBookings());
      expect(bookings.length).toBe(PREVIEW_BOOKINGS.length);

      httpMock.expectNone(() => true);
      expect(authService.getToken()).toBeNull();
    });

    it('blocks uploads, submissions, publishing, and booking updates without HTTP calls', async () => {
      await expect(firstValueFrom(service.submitListing(9002))).rejects.toMatchObject({
        status: 403,
      });
      await expect(firstValueFrom(service.publishListing(9002))).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        firstValueFrom(
          service.updateBookingStatus(9801, { to_status: 'confirmed', reason: null })
        )
      ).rejects.toMatchObject({ status: 403 });

      httpMock.expectNone(() => true);
    });
  });

  describe('ProviderLayout & ProviderDashboard in Preview Mode', () => {
    let layoutFixture: ComponentFixture<ProviderLayout>;
    let dashboardFixture: ComponentFixture<ProviderDashboard>;
    let router: Router;

    const previewStub: Partial<ProviderPreviewService> = {
      isPreview: (() => true) as any,
      queryParams: (() => ({ preview: 'true' })) as any,
      previewUser: PREVIEW_PROVIDER_USER,
      dashboardStats: PREVIEW_DASHBOARD_STATS,
      dashboardBookings: PREVIEW_DASHBOARD_BOOKINGS,
      sampleListings: PREVIEW_LISTINGS,
      syncFromNavigation: vi.fn().mockReturnValue(true),
      disable: vi.fn(),
    };

    const authStub = {
      currentProviderUser: vi.fn().mockReturnValue(null),
      getProfile: vi.fn(),
      logout: vi.fn(),
      getToken: vi.fn().mockReturnValue(null),
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ProviderLayout, ProviderDashboard],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ProviderPreviewService, useValue: previewStub },
          { provide: ProviderAuthService, useValue: authStub },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { queryParamMap: convertToParamMap({ preview: 'true' }) },
            },
          },
        ],
      }).compileComponents();

      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      layoutFixture = TestBed.createComponent(ProviderLayout);
      layoutFixture.detectChanges();

      dashboardFixture = TestBed.createComponent(ProviderDashboard);
      dashboardFixture.detectChanges();
    });

    it('renders Preview Mode badge and preserves ?preview=true on sidebar navigation links', () => {
      const layoutEl = layoutFixture.nativeElement as HTMLElement;
      expect(layoutEl.textContent).toContain('Preview Mode');
      const listingsLink = layoutEl.querySelector('a[href*="/provider/listings"]');
      expect(listingsLink?.getAttribute('href')).toContain('preview=true');
    });

    it('loads sample stats and recent bookings on Dashboard without calling getProfile or backend logout', () => {
      expect(authStub.getProfile).not.toHaveBeenCalled();

      const dashEl = dashboardFixture.nativeElement as HTMLElement;
      expect(dashEl.textContent).toContain('Preview Mode');
      expect(dashEl.textContent).toContain('Sample: Knuckles Sunrise Forest Trek');

      dashboardFixture.componentInstance.onLogout();
      expect(authStub.logout).not.toHaveBeenCalled();
      expect(previewStub.disable).toHaveBeenCalled();
    });
  });
});
