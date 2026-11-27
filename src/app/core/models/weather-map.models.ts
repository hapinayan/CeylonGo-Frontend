import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface WeatherCondition {
  code: number;
  name: string;
  description: string;
  icon: string;
}

export interface WeatherMetadata {
  source: string;
  source_url: string;
  fetched_at: string;
  stale: boolean;
}

export interface CurrentWeather extends WeatherMetadata {
  coordinates: Coordinates;
  temperature_c: number;
  feels_like_c: number;
  condition: WeatherCondition;
  humidity_percent: number;
  wind_speed_kmh: number;
  wind_direction_degrees: number | null;
  sunrise: string;
  sunset: string;
  observed_at: string;
}

export interface ForecastInterval {
  forecast_at: string;
  temperature_c: number;
  min_temperature_c: number;
  max_temperature_c: number;
  rain_probability_percent: number | null;
  wind_speed_kmh: number;
  condition: WeatherCondition;
}

export interface DailyForecast {
  date: string;
  interval_count: number;
  partial: boolean;
  min_temperature_c: number;
  max_temperature_c: number;
  rain_probability_percent: number | null;
  condition: WeatherCondition;
  recommendations: string[];
  cautions: string[];
}

export interface Forecast extends WeatherMetadata {
  coordinates: Coordinates;
  timezone: string;
  intervals: ForecastInterval[];
  days: DailyForecast[];
  daily_forecast?: DailyForecast[];
  advisory_notice: string;
}

export interface WeatherLocation extends Coordinates {
  name: string;
  region?: string | null;
  country: string;
}

export interface WeatherLocations extends WeatherMetadata {
  locations: WeatherLocation[];
}

export interface WeatherErrorInfo {
  status: number;
  message: string;
  retryAfterSeconds: number | null;
  code: string | null;
}

export type MapMarkerCategory =
  | 'homestay'
  | 'adventure'
  | 'guide'
  | 'bike'
  | 'bicycle'
  | 'artisan';

export interface MapMarker {
  listing_id: number;
  category: MapMarkerCategory;
  title: string;
  district: string;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  display_price: string | null;
  pricing_unit: string | null;
  currency: string;
  detail_url: string;
}

export interface MapMarkersQuery {
  category?: MapMarkerCategory | '';
  district?: string;
  q?: string;
  bbox?: string;
  limit?: number;
}

export const MAP_CATEGORY_META: Record<
  MapMarkerCategory,
  { label: string; shortLabel: string; color: string; bg: string }
> = {
  homestay: { label: 'Homestays', shortLabel: 'Homestay', color: '#0066FF', bg: '#EAF5FF' },
  adventure: { label: 'Adventures', shortLabel: 'Adventure', color: '#059669', bg: '#ECFDF5' },
  guide: { label: 'Tour Guides', shortLabel: 'Tour Guide', color: '#7C3AED', bg: '#F5F3FF' },
  bike: { label: 'Motorbikes & Scooters', shortLabel: 'Motorbike', color: '#D97706', bg: '#FFFBEB' },
  bicycle: { label: 'Bicycles', shortLabel: 'Bicycle', color: '#0284C7', bg: '#F0F9FF' },
  artisan: { label: 'Artisans', shortLabel: 'Artisan', color: '#DB2777', bg: '#FDF2F8' },
};

export function parseValidCoordinates(
  latitude: unknown,
  longitude: unknown
): Coordinates | null {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }
  if (typeof latitude === 'string' && !latitude.trim()) return null;
  if (typeof longitude === 'string' && !longitude.trim()) return null;

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }
  if (lat === 0 && lon === 0) {
    return null;
  }
  return { latitude: lat, longitude: lon };
}

export function normalizeWeatherSearchQuery(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function isValidWeatherSearchQuery(value: string): boolean {
  const normalized = normalizeWeatherSearchQuery(value);
  const len = [...normalized].length;
  return (
    len >= 2 &&
    len <= 80 &&
    /\p{L}/u.test(normalized) &&
    /^[\p{L}\p{M}\p{N} .’'-]+$/u.test(normalized)
  );
}

export function weatherIconUrl(icon: string | null | undefined): string | null {
  const clean = (icon || '').trim();
  if (!clean) return null;
  return `https://openweathermap.org/img/wn/${encodeURIComponent(clean)}@2x.png`;
}

export function weatherConditionGlyph(icon: string | null | undefined): string {
  const code = (icon || '').trim();
  if (code.startsWith('01')) return code.endsWith('n') ? '☾' : '☀';
  if (code.startsWith('02')) return '⛅';
  if (['09', '10'].includes(code.slice(0, 2))) return '🌧';
  if (code.startsWith('11')) return '⛈';
  if (code.startsWith('50')) return '🌫';
  return '☁';
}

export function parseWeatherApiError(error: unknown): WeatherErrorInfo {
  const httpErr = error as Partial<HttpErrorResponse> & {
    error?: { detail?: { code?: string; message?: string } | string };
  };
  const status = typeof httpErr?.status === 'number' ? httpErr.status : 0;
  const detail = httpErr?.error?.detail;
  const code =
    detail && typeof detail === 'object' && typeof detail.code === 'string' ? detail.code : null;
  const retryHeader = httpErr?.headers?.get?.('Retry-After');
  const parsedRetry = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : null;
  const limited = status === 429 || code === 'weather_upstream_rate_limited';
  const retryAfterSeconds =
    parsedRetry ?? (limited ? 60 : code === 'weather_busy' ? 2 : null);

  let message = 'Weather service is currently unavailable. Please try again.';
  if (status === 404 || code === 'weather_location_not_found') {
    message = 'No matching Sri Lankan destination was found for that search.';
  } else if (status === 422) {
    message = 'Please provide a valid destination name or coordinates.';
  } else if (limited) {
    message = 'Weather lookup limit reached temporarily. Please wait a moment and retry.';
  } else if (status === 504) {
    message = 'Weather service timed out. Please retry.';
  } else if (status === 502 || status === 503) {
    message = 'Live weather provider is temporarily unavailable. Please retry shortly.';
  } else if (status === 0) {
    message = 'Could not reach the weather service. Check your connection and retry.';
  }

  return {
    status,
    message,
    retryAfterSeconds,
    code,
  };
}

export function resolveApiMediaUrl(pathOrUrl: string | null | undefined): string | null {
  const raw = (pathOrUrl || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw;
  }
  const apiOrigin = new URL(environment.apiBaseUrl).origin;
  if (raw.startsWith('/')) {
    return `${apiOrigin}${raw}`;
  }
  return `${apiOrigin}/${raw}`;
}

export function getMapMarkerDetailRoute(marker: Pick<MapMarker, 'category' | 'listing_id'>): string[] {
  switch (marker.category) {
    case 'homestay':
      return ['/homestays', String(marker.listing_id)];
    case 'adventure':
      return ['/experiences', String(marker.listing_id)];
    case 'guide':
      return ['/tour-guides', String(marker.listing_id)];
    case 'bike':
    case 'bicycle':
      return ['/bicycles', String(marker.listing_id)];
    case 'artisan':
      return ['/artisans', String(marker.listing_id)];
  }
}

export function formatMapPricingUnit(unit: string | null | undefined): string {
  switch ((unit || '').toLowerCase()) {
    case 'per_night':
      return 'per night';
    case 'per_day':
      return 'per day';
    case 'per_participant':
    case 'per_person':
      return 'per person';
    case 'per_group':
      return 'per group';
    default:
      return unit ? unit.replace(/_/g, ' ') : '';
  }
}

export function buildDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${encodeURIComponent(
    `${latitude},${longitude}`
  )}#map=15/${latitude}/${longitude}`;
}
