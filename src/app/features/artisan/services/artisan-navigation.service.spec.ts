import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { ArtisanNavigationService } from './artisan-navigation.service';

@Component({ template: '' })
class DummyComponent {}

describe('ArtisanNavigationService', () => {
  let service: ArtisanNavigationService;
  let router: Router;
  let location: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        {
          provide: Location,
          useValue: {
            back: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(ArtisanNavigationService);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('records and returns discovery state including category, district, and scroll position', () => {
    service.recordDiscoveryState(
      { category: 'Pottery & Ceramics', district: 'Matara', sort: 'rating', page: 2 },
      350
    );

    const params = service.getLastDiscoveryParams();
    expect(params['category']).toBe('Pottery & Ceramics');
    expect(params['district']).toBe('Matara');
    expect(params['sort']).toBe('rating');
    expect(params['page']).toBe(2);
    expect(service.getLastDiscoveryScrollY()).toBe(350);
  });

  it('navigates back from contact using location.back() when came from profile', () => {
    (service as any).previousUrl = '/artisans/1?demo=true';
    service.navigateBackFromContact(1, true);

    expect(location.back).toHaveBeenCalled();
  });

  it('navigates back from contact using router.navigate with replaceUrl when opened directly', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    (service as any).previousUrl = null;

    service.navigateBackFromContact(2, true);

    expect(navigateSpy).toHaveBeenCalledWith(['/artisans', 2], {
      queryParams: { demo: 'true' },
      replaceUrl: true,
    });
  });

  it('navigates back from product using location.back() when came from profile', () => {
    (service as any).previousUrl = '/artisans/3?tab=products&demo=true';
    service.navigateBackFromProduct(3, true);

    expect(location.back).toHaveBeenCalled();
  });

  it('navigates back from product using router.navigate with tab=products and replaceUrl when opened directly', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    (service as any).previousUrl = null;

    service.navigateBackFromProduct(4, true);

    expect(navigateSpy).toHaveBeenCalledWith(['/artisans', 4], {
      queryParams: { tab: 'products', demo: 'true' },
      replaceUrl: true,
    });
  });

  it('navigates back from profile to discovery using location.back() when came from discovery', () => {
    (service as any).previousUrl = '/artisans/discover?demo=true';
    service.navigateBackFromProfile(true);

    expect(location.back).toHaveBeenCalled();
  });

  it('navigates back from profile to discovery with preserved filters when no history exists', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    (service as any).previousUrl = null;
    service.recordDiscoveryState({ category: 'Batik & Textiles', district: 'Galle' });

    service.navigateBackFromProfile(true);

    expect(navigateSpy).toHaveBeenCalledWith(['/artisans/discover'], {
      queryParams: {
        category: 'Batik & Textiles',
        district: 'Galle',
        demo: 'true',
      },
    });
  });

  it('tracks and retrieves last viewed artisan ID', () => {
    service.setLastArtisanId(7);
    expect(service.getLastArtisanId()).toBe(7);
  });
});
