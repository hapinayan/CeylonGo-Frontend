import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../interceptors/auth.interceptor';
import { LiveWeatherService } from './live-weather.service';

describe('LiveWeatherService', () => {
  let service: LiveWeatherService;
  let httpMock: HttpTestingController;
  const apiBase = `${environment.apiBaseUrl}/weather`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LiveWeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('queries GET /api/v1/weather/search with normalized q and ANONYMOUS_API_REQUEST context', () => {
    let result: unknown;
    service.searchDestinations('  Nuwara   Eliya ').subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      (r) => r.url === `${apiBase}/search` && r.params.get('q') === 'Nuwara Eliya'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);

    const payload = {
      source: 'openweather',
      source_url: 'https://openweathermap.org',
      fetched_at: '2026-11-27T06:00:00Z',
      stale: false,
      locations: [{ name: 'Nuwara Eliya', region: 'Central Province', country: 'LK', latitude: 6.9497, longitude: 80.7891 }],
    };
    req.flush(payload);
    expect(result).toEqual(payload);
  });

  it('rejects invalid 1-char destination search before sending HTTP request', () => {
    let status: number | undefined;
    service.searchDestinations('A').subscribe({
      error: (err) => (status = err.status),
    });
    expect(status).toBe(422);
    httpMock.expectNone(`${apiBase}/search`);
  });

  it('queries current weather and 5-day forecast by coordinates and location name', () => {
    let currentRes: unknown;
    service.getCurrentWeather({ location: 'Colombo' }).subscribe((res) => (currentRes = res));

    const currentReq = httpMock.expectOne(
      (r) => r.url === `${apiBase}/current` && r.params.get('location') === 'Colombo'
    );
    expect(currentReq.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    currentReq.flush({ temperature_c: 30.5 });
    expect(currentRes).toEqual({ temperature_c: 30.5 });

    let forecastRes: unknown;
    service
      .getForecast({ coordinates: { latitude: 6.8667, longitude: 81.0466 } })
      .subscribe((res) => (forecastRes = res));

    const fcReq = httpMock.expectOne(
      (r) =>
        r.url === `${apiBase}/forecast` &&
        r.params.get('lat') === '6.8667' &&
        r.params.get('lon') === '81.0466'
    );
    expect(fcReq.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    fcReq.flush({ timezone: 'Asia/Colombo', daily_forecast: [] });
    expect(forecastRes).toEqual({ timezone: 'Asia/Colombo', daily_forecast: [] });
  });

  it('rejects zero coordinates (0, 0) client-side without calling backend', () => {
    let status: number | undefined;
    service
      .getCurrentWeather({ coordinates: { latitude: 0, longitude: 0 } })
      .subscribe({ error: (err) => (status = err.status) });
    expect(status).toBe(422);
    httpMock.expectNone(`${apiBase}/current`);
  });
});
