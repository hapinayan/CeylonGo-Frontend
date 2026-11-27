import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CurrentWeather, Forecast, WeatherLocations } from '../../core/models/weather-map.models';
import { LiveWeatherService } from '../../core/services/live-weather.service';
import { LiveWeatherComponent } from './live-weather';

describe('LiveWeatherComponent (/weather)', () => {
  const sampleCurrent: CurrentWeather = {
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
    temperature_c: 30.2,
    feels_like_c: 34.0,
    condition: { code: 500, name: 'Rain', description: 'Light coastal shower', icon: '10d' },
    humidity_percent: 82,
    wind_speed_kmh: 14.2,
    wind_direction_degrees: 220,
    sunrise: '2026-11-27T00:35:00Z',
    sunset: '2026-11-27T12:28:00Z',
    observed_at: '2026-11-27T07:00:00Z',
    source: 'openweather',
    source_url: 'https://openweathermap.org',
    fetched_at: '2026-11-27T07:02:00Z',
    stale: false,
  };

  const sampleForecast: Forecast = {
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
    timezone: 'Asia/Colombo',
    intervals: [
      {
        forecast_at: '2026-11-27T09:00:00Z',
        temperature_c: 30,
        min_temperature_c: 29,
        max_temperature_c: 31,
        rain_probability_percent: 65,
        wind_speed_kmh: 15,
        condition: { code: 500, name: 'Rain', description: 'Light coastal shower', icon: '10d' },
      },
    ],
    days: [],
    daily_forecast: [
      {
        date: '2026-11-27',
        interval_count: 4,
        partial: true,
        min_temperature_c: 25,
        max_temperature_c: 31,
        rain_probability_percent: 65,
        condition: { code: 500, name: 'Rain', description: 'Light coastal shower', icon: '10d' },
        recommendations: ['Pack a light raincoat'],
        cautions: ['High coastal humidity midday'],
      },
      {
        date: '2026-11-28',
        interval_count: 8,
        partial: false,
        min_temperature_c: 24,
        max_temperature_c: 30,
        rain_probability_percent: null,
        condition: { code: 801, name: 'Clouds', description: 'Few clouds', icon: '02d' },
        recommendations: [],
        cautions: [],
      },
    ],
    advisory_notice: 'Forecast times shown in Asia/Colombo.',
    source: 'openweather',
    source_url: 'https://openweathermap.org',
    fetched_at: '2026-11-27T07:02:00Z',
    stale: false,
  };

  it('loads default Colombo weather, renders Celsius + GMT+0530 + cautions, and searches destinations', () => {
    const searchResponse: WeatherLocations = {
      source: 'openweather',
      source_url: 'https://openweathermap.org',
      fetched_at: '2026-11-27T07:03:00Z',
      stale: false,
      locations: [
        { name: 'Ella', region: 'Uva Province', country: 'LK', latitude: 6.8667, longitude: 81.0466 },
      ],
    };

    const weatherMock = {
      searchDestinations: vi.fn().mockReturnValue(of(searchResponse)),
      getCurrentWeather: vi.fn().mockReturnValue(of(sampleCurrent)),
      getForecast: vi.fn().mockReturnValue(of(sampleForecast)),
    };

    TestBed.configureTestingModule({
      imports: [LiveWeatherComponent],
      providers: [
        provideRouter([]),
        { provide: LiveWeatherService, useValue: weatherMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(LiveWeatherComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(weatherMock.getCurrentWeather).toHaveBeenCalledWith({ location: 'Colombo' });
    expect(weatherMock.getForecast).toHaveBeenCalledWith({ location: 'Colombo' });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('30.2');
    expect(el.textContent).toContain('Feels Like');
    expect(el.textContent).toContain('34 °C');
    expect(el.textContent).toContain('82%');
    expect(el.textContent).toContain('65%');
    expect(el.textContent).toContain('High coastal humidity midday');
    expect(el.textContent).toContain('GMT+05:30');

    component.searchQuery = 'Ella';
    component.submitSearch();
    fixture.detectChanges();

    expect(weatherMock.searchDestinations).toHaveBeenCalledWith('Ella');
    expect(weatherMock.getCurrentWeather).toHaveBeenLastCalledWith({
      coordinates: { latitude: 6.8667, longitude: 81.0466 },
    });
    expect(component.activeDestinationLabel()).toBe('Ella, Uva Province');
  });

  it('displays error message and allows manual retry when backend fails', () => {
    const weatherMock = {
      searchDestinations: vi.fn(),
      getCurrentWeather: vi.fn().mockReturnValueOnce(throwError(() => ({ status: 502 }))).mockReturnValueOnce(of(sampleCurrent)),
      getForecast: vi.fn().mockReturnValueOnce(throwError(() => ({ status: 502 }))).mockReturnValueOnce(of(sampleForecast)),
    };

    TestBed.configureTestingModule({
      imports: [LiveWeatherComponent],
      providers: [
        provideRouter([]),
        { provide: LiveWeatherService, useValue: weatherMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(LiveWeatherComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.currentError()).toContain('temporarily unavailable');
    component.loadWeather();
    fixture.detectChanges();

    expect(component.currentError()).toBeNull();
    expect(component.currentWeather()?.temperature_c).toBe(30.2);
  });
});
