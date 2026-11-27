import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MapMarker, buildDirectionsUrl, getMapMarkerDetailRoute } from '../../core/models/weather-map.models';
import { InteractiveMapService } from '../../core/services/interactive-map.service';
import { InteractiveMapComponent } from './interactive-map';

describe('InteractiveMapComponent (/map)', () => {
  const sampleMarkers: MapMarker[] = [
    {
      listing_id: 11,
      category: 'homestay',
      title: 'Kandy Hill Villa',
      district: 'Kandy',
      latitude: 7.2906,
      longitude: 80.6337,
      cover_image_url: '/uploads/kandy-villa.jpg',
      display_price: '12500.00',
      pricing_unit: 'per_night',
      currency: 'LKR',
      detail_url: '/homestays/11',
    },
    {
      listing_id: 22,
      category: 'adventure',
      title: 'Knuckles Mist Hike',
      district: 'Matale',
      latitude: 7.456,
      longitude: 80.789,
      cover_image_url: null,
      display_price: '8500.00',
      pricing_unit: 'per_person',
      currency: 'LKR',
      detail_url: '/experiences/22',
    },
    {
      listing_id: 33,
      category: 'artisan',
      title: 'Ambalangoda Mask Studio',
      district: 'Galle',
      latitude: 6.2355,
      longitude: 80.0538,
      cover_image_url: null,
      display_price: null,
      pricing_unit: null,
      currency: 'LKR',
      detail_url: '/artisans/33',
    },
  ];

  it('loads real markers, filters by category/district/keyword, and resets filters', () => {
    const mapServiceMock = {
      getMarkers: vi.fn().mockReturnValue(of(sampleMarkers)),
    };

    TestBed.configureTestingModule({
      imports: [InteractiveMapComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InteractiveMapService, useValue: mapServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(InteractiveMapComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    expect(mapServiceMock.getMarkers).toHaveBeenCalledWith({
      category: undefined,
      district: undefined,
      q: undefined,
      bbox: undefined,
      limit: 200,
    });
    expect(component.markers().length).toBe(3);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Kandy Hill Villa');
    expect(el.textContent).toContain('LKR 12,500.00 · per night');
    expect(el.textContent).toContain('Ambalangoda Mask Studio');

    component.selectCategory('adventure');
    expect(mapServiceMock.getMarkers).toHaveBeenLastCalledWith({
      category: 'adventure',
      district: undefined,
      q: undefined,
      bbox: undefined,
      limit: 200,
    });

    component.onDistrictChange('Matale');
    component.searchKeyword = 'Knuckles';
    component.submitKeywordSearch();
    expect(mapServiceMock.getMarkers).toHaveBeenLastCalledWith({
      category: 'adventure',
      district: 'Matale',
      q: 'Knuckles',
      bbox: undefined,
      limit: 200,
    });

    component.resetFiltersAndView();
    expect(component.selectedCategory()).toBe('');
    expect(component.selectedDistrict()).toBe('');
    expect(component.searchKeyword).toBe('');

    component.setMobileView('list');
    expect(component.mobileView()).toBe('list');

    component.navigateToDetail(sampleMarkers[1]);
    expect(navSpy).toHaveBeenCalledWith(['/experiences', '22']);
  });

  it('maps all six categories to existing service detail routes and builds OSM directions', () => {
    expect(getMapMarkerDetailRoute({ category: 'homestay', listing_id: 1 })).toEqual(['/homestays', '1']);
    expect(getMapMarkerDetailRoute({ category: 'adventure', listing_id: 2 })).toEqual(['/experiences', '2']);
    expect(getMapMarkerDetailRoute({ category: 'guide', listing_id: 3 })).toEqual(['/tour-guides', '3']);
    expect(getMapMarkerDetailRoute({ category: 'bike', listing_id: 4 })).toEqual(['/bicycles', '4']);
    expect(getMapMarkerDetailRoute({ category: 'bicycle', listing_id: 5 })).toEqual(['/bicycles', '5']);
    expect(getMapMarkerDetailRoute({ category: 'artisan', listing_id: 6 })).toEqual(['/artisans', '6']);

    const dirUrl = buildDirectionsUrl(6.8667, 81.0466);
    expect(dirUrl).toContain('https://www.openstreetmap.org/directions');
    expect(dirUrl).toContain('6.8667');
    expect(dirUrl).toContain('81.0466');
  });

  it('shows error banner and retries when marker load fails', () => {
    const mapServiceMock = {
      getMarkers: vi
        .fn()
        .mockReturnValueOnce(throwError(() => ({ status: 500 })))
        .mockReturnValueOnce(of(sampleMarkers)),
    };

    TestBed.configureTestingModule({
      imports: [InteractiveMapComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: InteractiveMapService, useValue: mapServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(InteractiveMapComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Could not load Sri Lanka service markers');
    component.loadMarkers();
    expect(component.errorMessage()).toBeNull();
    expect(component.markers().length).toBe(3);
  });
});
