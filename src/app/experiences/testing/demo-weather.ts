import { HttpErrorResponse } from '@angular/common/http';
import { concatMap, map, throwError, timer } from 'rxjs';
import { WeatherSource } from '../services/weather-api';

const updated = '2026-11-24T03:00:00Z';
const metadata = { source: 'Development fixture', source_url: '', fetched_at: updated, stale: false };
const condition = { code: 801, name: 'Clouds', description: 'few clouds', icon: '02d' };

export const demoWeather: WeatherSource = {
  locations: query => timer(650).pipe(concatMap(() => {
    if (!query.toLowerCase().includes('yala')) {
      return throwError(() => new HttpErrorResponse({ status: 503 }));
    }
    return [{ ...metadata, locations: [
      { name: 'Yala', region: 'Southern Province', country: 'LK', latitude: 6.37, longitude: 81.52 },
      { name: 'Yala area', region: 'Eastern Province', country: 'LK', latitude: 6.53, longitude: 81.65 },
    ] }];
  })),
  current: coordinates => timer(650).pipe(map(() => ({
    ...metadata, coordinates, condition, temperature_c: 28, feels_like_c: 30,
    humidity_percent: 72, wind_speed_kmh: 13, wind_direction_degrees: null,
    sunrise: '2026-11-24T00:24:00Z', sunset: '2026-11-24T12:20:00Z', observed_at: updated,
  }))),
  forecast: coordinates => timer(650).pipe(map(() => ({
    ...metadata, coordinates, timezone: 'Asia/Colombo', intervals: [],
    advisory_notice: 'Development fixture',
    days: [{ date: '2026-11-24', interval_count: 5, partial: true,
      min_temperature_c: 24, max_temperature_c: 30, rain_probability_percent: 30,
      condition, recommendations: [], cautions: [] }],
  }))),
};
