import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { WeatherPanel } from '../components/weather-panel/weather-panel';
import { coordinatesOf } from '../models/weather';
import { WeatherApi, WEATHER_SOURCE } from '../services/weather-api';

const url = environment.apiBaseUrl + '/weather';
const coordinates = { latitude: 6.5, longitude: 81.2 };
const metadata = { source: 'HTTP test', source_url: '', stale: false, fetched_at: '2026-11-24T00:00:00Z' };
const condition = { code: 800, name: 'Clear', description: 'clear sky', icon: '01d' };
const current = { ...metadata, coordinates, condition, temperature_c: 26, humidity_percent: 72,
  wind_speed_kmh: 12, wind_direction_degrees: null };
const forecast = { ...metadata, coordinates, timezone: 'Asia/Colombo', intervals: [],
  days: [{ date: '2026-11-24', min_temperature_c: 22, max_temperature_c: 29, condition,
    rain_probability_percent: 0, partial: true }] };

describe('Experience weather', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function panel(withCoordinates = true): ComponentFixture<WeatherPanel> {
    const fixture = TestBed.createComponent(WeatherPanel);
    fixture.componentRef.setInput('locationName', 'Ella');
    if (withCoordinates) fixture.componentRef.setInput('coordinates', coordinates);
    fixture.detectChanges();
    return fixture;
  }

  it('uses the configured anonymous API source and validates coordinates and search without HTTP', () => {
    const api = TestBed.inject(WeatherApi);
    expect(TestBed.inject(WEATHER_SOURCE)).toBe(api);
    expect(coordinatesOf('0', '180')).toEqual({ latitude: 0, longitude: 180 });
    expect(coordinatesOf(null, 0)).toBeNull();
    expect(coordinatesOf(' ', 0)).toBeNull();
    api.current({ latitude: NaN, longitude: 181 }).subscribe({
      next: () => { throw new Error('Invalid coordinates accepted'); }, error: (error: HttpErrorResponse) => expect(error.status).toBe(422),
    });
    api.locations('1').subscribe({ error: (error: HttpErrorResponse) => expect(error.status).toBe(422) });
    http.expectNone(request => request.url.startsWith(url));
  });

  it('renders independent current and forecast states, nullable fields, and stale data', () => {
    const fixture = panel();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Loading current weather');
    const request = http.expectOne(req => req.url === url + '/current');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lat')).toBe('6.5');
    expect(request.request.params.get('lon')).toBe('81.2');
    expect(request.request.context.get(ANONYMOUS_API_REQUEST)).toBe(true);
    request.flush({ ...current, stale: true });
    fixture.detectChanges();
    expect(element.textContent).toContain('26 °C');
    expect(element.textContent).toContain('Cached conditions');
    expect(element.textContent).toContain('HTTP test');
    expect(element.textContent).toContain('12 km/h');
    expect(element.textContent).toContain('Loading forecast');
    http.expectOne(req => req.url === url + '/forecast').flush(forecast);
    fixture.detectChanges();
    expect(element.textContent).toContain('0% chance of rain');
    expect(element.textContent).toContain('Partial day');
    expect(element.textContent).not.toContain('Sample weather');
  });

  it('cancels a stale location lookup and waits for a choice among ambiguous results', () => {
    const fixture = panel(false);
    const original = http.expectOne(req => req.url === url + '/locations' && req.params.get('q') === 'Ella');
    fixture.componentInstance.find('  Nuwara   Eliya ');
    fixture.detectChanges();
    expect(original.cancelled).toBe(true);
    http.expectOne(req => req.url === url + '/locations' && req.params.get('q') === 'Nuwara Eliya').flush({
      ...metadata, locations: [
        { ...coordinates, name: 'Place A', country: 'LK' },
        { latitude: 7, longitude: 80, name: 'Place B', region: 'Central', country: 'LK' },
      ],
    });
    fixture.detectChanges();
    http.expectNone(req => req.url === url + '/current');
    const choices = fixture.nativeElement.querySelectorAll('.weather-places button');
    expect(choices).toHaveLength(2);
    choices[1].click();
    fixture.detectChanges();
    http.expectOne(req => req.url === url + '/current' && req.params.get('lat') === '7').flush(current);
    http.expectOne(req => req.url === url + '/forecast' && req.params.get('lon') === '80').flush({ ...forecast, days: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No forecast is available');
  });

  it('cancels stale conditions, handles service failures and permits manual retry', () => {
    const fixture = panel();
    const oldCurrent = http.expectOne(req => req.url === url + '/current');
    const oldForecast = http.expectOne(req => req.url === url + '/forecast');
    fixture.componentRef.setInput('coordinates', { latitude: 7, longitude: 80 });
    fixture.detectChanges();
    expect(oldCurrent.cancelled).toBe(true);
    expect(oldForecast.cancelled).toBe(true);
    http.expectOne(req => req.url === url + '/current').error(new ProgressEvent('error'));
    http.expectOne(req => req.url === url + '/forecast').flush({}, { status: 504, statusText: 'Timeout' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check your connection');
    expect(fixture.nativeElement.textContent).toContain('timed out');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    http.expectOne(req => req.url === url + '/current').flush(current);
    http.expectOne(req => req.url === url + '/forecast').flush(forecast);
  });

  it('blocks retry during rate limiting and does not automatically send another request', () => {
    const fixture = panel();
    http.expectOne(req => req.url === url + '/current').flush({}, {
      status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '30' },
    });
    http.expectOne(req => req.url === url + '/forecast').flush({}, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('temporarily rate limited');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    http.expectNone(req => req.url.startsWith(url));
  });
});
