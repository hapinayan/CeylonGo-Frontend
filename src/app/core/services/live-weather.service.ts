import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../interceptors/auth.interceptor';
import {
  Coordinates,
  CurrentWeather,
  Forecast,
  WeatherLocations,
  isValidWeatherSearchQuery,
  normalizeWeatherSearchQuery,
  parseValidCoordinates,
} from '../models/weather-map.models';

@Injectable({
  providedIn: 'root',
})
export class LiveWeatherService {
  private readonly http = inject(HttpClient);
  private readonly weatherBaseUrl = `${environment.apiBaseUrl}/weather`;

  private readonly anonymousContext = new HttpContext().set(ANONYMOUS_API_REQUEST, true);

  /**
   * Search Sri Lankan destinations for weather lookup.
   * Endpoint: GET /api/v1/weather/search?q=...
   */
  searchDestinations(query: string): Observable<WeatherLocations> {
    const normalized = normalizeWeatherSearchQuery(query);
    if (!isValidWeatherSearchQuery(normalized)) {
      return throwError(() => new HttpErrorResponse({ status: 422 }));
    }
    const params = new HttpParams().set('q', normalized);
    return this.http.get<WeatherLocations>(`${this.weatherBaseUrl}/search`, {
      params,
      context: this.anonymousContext,
    });
  }

  /**
   * Fetch current weather by coordinates or Sri Lankan destination name.
   * Endpoint: GET /api/v1/weather/current
   */
  getCurrentWeather(
    target: { coordinates: Coordinates } | { location: string }
  ): Observable<CurrentWeather> {
    const params = this.buildTargetParams(target);
    if (!params) {
      return throwError(() => new HttpErrorResponse({ status: 422 }));
    }
    return this.http.get<CurrentWeather>(`${this.weatherBaseUrl}/current`, {
      params,
      context: this.anonymousContext,
    });
  }

  /**
   * Fetch 5-day / 3-hour forecast by coordinates or Sri Lankan destination name.
   * Endpoint: GET /api/v1/weather/forecast
   */
  getForecast(
    target: { coordinates: Coordinates } | { location: string }
  ): Observable<Forecast> {
    const params = this.buildTargetParams(target);
    if (!params) {
      return throwError(() => new HttpErrorResponse({ status: 422 }));
    }
    return this.http.get<Forecast>(`${this.weatherBaseUrl}/forecast`, {
      params,
      context: this.anonymousContext,
    });
  }

  private buildTargetParams(
    target: { coordinates: Coordinates } | { location: string }
  ): HttpParams | null {
    if ('coordinates' in target) {
      const coords = parseValidCoordinates(
        target.coordinates.latitude,
        target.coordinates.longitude
      );
      if (!coords) return null;
      return new HttpParams()
        .set('lat', String(coords.latitude))
        .set('lon', String(coords.longitude));
    }
    const normalized = normalizeWeatherSearchQuery(target.location);
    if (!isValidWeatherSearchQuery(normalized)) return null;
    return new HttpParams().set('location', normalized);
  }
}
