import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, Observable, of, startWith, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { Coordinates, coordinatesOf, CurrentWeather, Forecast, WeatherLocations } from '../models/weather';

export interface WeatherSource {
  current(coordinates: Coordinates): Observable<CurrentWeather>;
  forecast(coordinates: Coordinates): Observable<Forecast>;
  locations(query: string): Observable<WeatherLocations>;
}

export function locationQuery(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validLocationQuery(value: string): boolean {
  const length = [...value].length;
  return length >= 2 && length <= 80 && /\p{L}/u.test(value) && /^[\p{L}\p{M}\p{N} .’'-]+$/u.test(value);
}

@Injectable({ providedIn: 'root' })
export class WeatherApi implements WeatherSource {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiBaseUrl + '/weather';

  current(coordinates: Coordinates) { return this.conditions<CurrentWeather>('current', coordinates); }
  forecast(coordinates: Coordinates) { return this.conditions<Forecast>('forecast', coordinates); }

  locations(query: string): Observable<WeatherLocations> {
    const value = locationQuery(query);
    if (!validLocationQuery(value)) return throwError(() => new HttpErrorResponse({ status: 422 }));
    return this.get<WeatherLocations>('locations', new HttpParams().set('q', value));
  }

  private conditions<T>(endpoint: string, supplied: Coordinates): Observable<T> {
    const coordinates = coordinatesOf(supplied.latitude, supplied.longitude);
    if (!coordinates) return throwError(() => new HttpErrorResponse({ status: 422 }));
    return this.get<T>(endpoint, new HttpParams().set('lat', coordinates.latitude).set('lon', coordinates.longitude));
  }

  private get<T>(endpoint: string, params: HttpParams): Observable<T> {
    return this.http.get<T>(this.url + '/' + endpoint, {
      params, context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }
}

export const WEATHER_SOURCE = new InjectionToken<WeatherSource>('Experience weather source', {
  factory: () => inject(WeatherApi),
});

export type WeatherState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'error'; message: string; retryAt: number };

export function trackWeather<T>(request: Observable<T>): Observable<WeatherState<T>> {
  return request.pipe(
    map((value): WeatherState<T> => ({ status: 'ready', value })),
    startWith({ status: 'loading' } as WeatherState<T>),
    catchError((error: HttpErrorResponse): Observable<WeatherState<T>> => {
      const code = error.error?.detail?.code;
      const limited = error.status === 429 || code === 'weather_upstream_rate_limited';
      const header = error.headers?.get('Retry-After');
      const seconds = header && /^\d+$/.test(header) ? Number(header) : null;
      const retrySeconds = seconds ?? (limited ? 60 : code === 'weather_busy' ? 1 : 0);
      const message = limited ? 'Weather requests are temporarily rate limited.'
        : error.status === 422 ? 'This location could not be used for weather.'
        : error.status === 0 ? 'Could not reach the weather service. Check your connection.'
        : error.status === 504 ? 'The weather service timed out.'
        : 'The weather service is currently unavailable.';
      return of({ status: 'error', message, retryAt: Date.now() + retrySeconds * 1000 });
    }),
  );
}
