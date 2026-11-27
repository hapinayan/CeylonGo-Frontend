import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { LiveWeatherService } from '../../../core/services/live-weather.service';
import { ServiceWeatherCardComponent } from './service-weather-card';

describe('ServiceWeatherCardComponent', () => {
  it('does not request weather or render when listing coordinates are missing or (0, 0)', () => {
    const weatherMock = {
      getCurrentWeather: vi.fn(),
      getForecast: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ServiceWeatherCardComponent],
      providers: [provideRouter([]), { provide: LiveWeatherService, useValue: weatherMock }],
    });

    const fixture = TestBed.createComponent(ServiceWeatherCardComponent);
    fixture.componentRef.setInput('locationName', 'Unknown Place');
    fixture.componentRef.setInput('latitude', null);
    fixture.componentRef.setInput('longitude', null);
    fixture.detectChanges();

    expect(weatherMock.getCurrentWeather).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent.trim()).toBe('');

    fixture.componentRef.setInput('latitude', '0');
    fixture.componentRef.setInput('longitude', '0');
    fixture.detectChanges();

    expect(weatherMock.getCurrentWeather).not.toHaveBeenCalled();
  });

  it('renders live weather for valid listing coordinates and omits null rain probability', () => {
    const weatherMock = {
      getCurrentWeather: vi.fn().mockReturnValue(
        of({
          coordinates: { latitude: 7.2906, longitude: 80.6337 },
          temperature_c: 24.4,
          feels_like_c: 25.1,
          condition: { code: 802, name: 'Clouds', description: 'Scattered clouds', icon: '03d' },
          humidity_percent: 78,
          wind_speed_kmh: 9.5,
          wind_direction_degrees: 180,
          sunrise: '2026-11-27T00:35:00Z',
          sunset: '2026-11-27T12:25:00Z',
          observed_at: '2026-11-27T06:30:00Z',
          source: 'openweather',
          source_url: 'https://openweathermap.org',
          fetched_at: '2026-11-27T06:32:00Z',
          stale: false,
        })
      ),
      getForecast: vi.fn().mockReturnValue(
        of({
          coordinates: { latitude: 7.2906, longitude: 80.6337 },
          timezone: 'Asia/Colombo',
          intervals: [],
          days: [],
          daily_forecast: [
            {
              date: '2026-11-28',
              interval_count: 8,
              partial: false,
              min_temperature_c: 19,
              max_temperature_c: 27,
              rain_probability_percent: null,
              condition: { code: 802, name: 'Clouds', description: 'Scattered clouds', icon: '03d' },
              recommendations: [],
              cautions: ['Evening mist near hill roads'],
            },
          ],
          advisory_notice: '',
          source: 'openweather',
          source_url: 'https://openweathermap.org',
          fetched_at: '2026-11-27T06:32:00Z',
          stale: false,
        })
      ),
    };

    TestBed.configureTestingModule({
      imports: [ServiceWeatherCardComponent],
      providers: [provideRouter([]), { provide: LiveWeatherService, useValue: weatherMock }],
    });

    const fixture = TestBed.createComponent(ServiceWeatherCardComponent);
    fixture.componentRef.setInput('locationName', 'Kandy');
    fixture.componentRef.setInput('latitude', '7.2906');
    fixture.componentRef.setInput('longitude', '80.6337');
    fixture.detectChanges();

    expect(weatherMock.getCurrentWeather).toHaveBeenCalledWith({
      coordinates: { latitude: 7.2906, longitude: 80.6337 },
    });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Kandy');
    expect(text).toContain('24.4 °C');
    expect(text).toContain('Scattered clouds');
    expect(text).toContain('78%');
    expect(text).toContain('Evening mist near hill roads');
    expect(text).not.toContain('Rain chance');
  });

  it('shows retry error state when backend fails to respond', () => {
    const weatherMock = {
      getCurrentWeather: vi.fn().mockReturnValue(throwError(() => ({ status: 503 }))),
      getForecast: vi.fn().mockReturnValue(throwError(() => ({ status: 503 }))),
    };

    TestBed.configureTestingModule({
      imports: [ServiceWeatherCardComponent],
      providers: [provideRouter([]), { provide: LiveWeatherService, useValue: weatherMock }],
    });

    const fixture = TestBed.createComponent(ServiceWeatherCardComponent);
    fixture.componentRef.setInput('locationName', 'Galle');
    fixture.componentRef.setInput('latitude', 6.0535);
    fixture.componentRef.setInput('longitude', 80.221);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
  });
});
