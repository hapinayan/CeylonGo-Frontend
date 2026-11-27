export interface Coordinates { latitude: number; longitude: number }
export interface WeatherCondition { code: number; name: string; description: string; icon: string }
export interface WeatherMetadata { source: string; source_url: string; fetched_at: string; stale: boolean }
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
  advisory_notice: string;
}
export interface WeatherLocation extends Coordinates { name: string; region?: string | null; country: string }
export interface WeatherLocations extends WeatherMetadata { locations: WeatherLocation[] }

export function coordinatesOf(latitude: unknown, longitude: unknown): Coordinates | null {
  const toNumber = (value: unknown) => typeof value === 'number' ||
    (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180
    ? { latitude: lat, longitude: lon } : null;
}
