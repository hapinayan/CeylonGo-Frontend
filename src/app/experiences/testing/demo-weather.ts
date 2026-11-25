import { HttpErrorResponse } from '@angular/common/http';
import { concatMap, map, throwError, timer } from 'rxjs';
import { WeatherSource } from '../services/weather-api';

const updated = '2026-11-24T03:00:00Z';
const metadata = { source: 'Development fixture', source_url: '', fetched_at: updated, stale: false };
const condition = { code: 801, name: 'Clouds', description: 'few clouds', icon: '02d' };
const places = [
  { name: 'Yala', region: 'Southern Province', latitude: 6.37, longitude: 81.52, temperature: 28 },
  { name: 'Yala area', region: 'Eastern Province', latitude: 6.53, longitude: 81.65, temperature: 28 },
  { name: 'Nuwara Eliya', latitude: 6.97, longitude: 80.77, temperature: 18 },
  { name: 'Habarana', latitude: 8.04, longitude: 80.75, temperature: 29 },
  { name: 'Trincomalee', latitude: 8.57, longitude: 81.23, temperature: 30 },
  { name: 'Kitulgala', latitude: 6.99, longitude: 80.41, temperature: 26 },
  { name: 'Ella', latitude: 6.87, longitude: 81.05, temperature: 22 },
  { name: 'Galle', latitude: 6.03, longitude: 80.22, temperature: 29 },
  { name: 'Bentota', latitude: 6.42, longitude: 79.99, temperature: 28 },
  { name: 'Sigiriya', latitude: 7.95, longitude: 80.76, temperature: 30 },
  { name: 'Colombo', latitude: 6.93, longitude: 79.86, temperature: 29 },
];

function sampleTemperature(latitude: number, longitude: number): number {
  return places.find(place => place.latitude === latitude && place.longitude === longitude)?.temperature ?? 28;
}

export const demoWeather: WeatherSource = {
  locations: query => timer(650).pipe(concatMap(() => {
    const term = query.trim().toLowerCase().replace(/ national park$/, '');
    const results = places.filter(place => place.name.toLowerCase().startsWith(term));
    if (!results.length) return throwError(() => new HttpErrorResponse({ status: 503 }));
    return [{ ...metadata, locations: results.map(({name, region, latitude, longitude}) => ({
      name, region, latitude, longitude, country: 'LK',
    })) }];
  })),
  current: coordinates => timer(650).pipe(map(() => ({
    ...metadata, coordinates, condition, temperature_c: sampleTemperature(coordinates.latitude, coordinates.longitude),
    feels_like_c: sampleTemperature(coordinates.latitude, coordinates.longitude) + 2,
    humidity_percent: 72, wind_speed_kmh: 13, wind_direction_degrees: null,
    sunrise: '2026-11-24T00:24:00Z', sunset: '2026-11-24T12:20:00Z', observed_at: updated,
  }))),
  forecast: coordinates => timer(650).pipe(map(() => ({
    ...metadata, coordinates, timezone: 'Asia/Colombo', intervals: [],
    advisory_notice: 'Development fixture',
    days: [{ date: '2026-11-24', interval_count: 5, partial: true,
      min_temperature_c: sampleTemperature(coordinates.latitude, coordinates.longitude) - 4,
      max_temperature_c: sampleTemperature(coordinates.latitude, coordinates.longitude) + 2, rain_probability_percent: 30,
      condition, recommendations: [], cautions: [] }],
  }))),
};
