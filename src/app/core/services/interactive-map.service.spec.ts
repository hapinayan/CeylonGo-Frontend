import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../interceptors/auth.interceptor';
import { InteractiveMapService } from './interactive-map.service';

describe('InteractiveMapService', () => {
  let service: InteractiveMapService;
  let httpMock: HttpTestingController;
  const markersUrl = `${environment.apiBaseUrl}/map/markers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InteractiveMapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches GET /api/v1/map/markers with ANONYMOUS_API_REQUEST context and filter params', () => {
    let result: unknown[] = [];
    service
      .getMarkers({
        category: 'guide',
        district: 'Badulla',
        q: 'Ella',
        bbox: '80.9,6.7,81.2,7.0',
        limit: 250,
      })
      .subscribe((res) => (result = res));

    const req = httpMock.expectOne((r) => r.url === markersUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    expect(req.request.params.get('category')).toBe('guide');
    expect(req.request.params.get('district')).toBe('Badulla');
    expect(req.request.params.get('q')).toBe('Ella');
    expect(req.request.params.get('bbox')).toBe('80.9,6.7,81.2,7.0');
    expect(req.request.params.get('limit')).toBe('200');

    const sample = [
      {
        listing_id: 41,
        category: 'guide',
        title: 'Ella Trek Guide',
        district: 'Badulla',
        latitude: 6.8667,
        longitude: 81.0466,
        cover_image_url: null,
        display_price: '4500.00',
        pricing_unit: 'per_day',
      },
    ];
    req.flush(sample);
    expect(result).toEqual(sample);
  });

  it('returns empty array when backend responds with non-array payload', () => {
    let result: unknown[] | undefined;
    service.getMarkers().subscribe((res) => (result = res));

    const req = httpMock.expectOne(markersUrl);
    req.flush(null);
    expect(result).toEqual([]);
  });
});
