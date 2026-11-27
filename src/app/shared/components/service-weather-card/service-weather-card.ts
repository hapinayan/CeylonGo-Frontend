import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnChanges, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  Coordinates,
  CurrentWeather,
  DailyForecast,
  Forecast,
  parseValidCoordinates,
  parseWeatherApiError,
  weatherConditionGlyph,
  weatherIconUrl,
} from '../../../core/models/weather-map.models';
import { LiveWeatherService } from '../../../core/services/live-weather.service';

@Component({
  selector: 'app-service-weather-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './service-weather-card.html',
  styleUrl: './service-weather-card.scss',
})
export class ServiceWeatherCardComponent implements OnChanges {
  private readonly weatherService = inject(LiveWeatherService);

  readonly locationName = input<string>('Destination');
  readonly latitude = input<unknown>(null);
  readonly longitude = input<unknown>(null);

  private currentSub?: Subscription;
  private forecastSub?: Subscription;
  private lastCoordKey = '';

  readonly validCoords = computed<Coordinates | null>(() =>
    parseValidCoordinates(this.latitude(), this.longitude())
  );

  readonly isLoading = signal<boolean>(false);
  readonly current = signal<CurrentWeather | null>(null);
  readonly forecast = signal<Forecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly brokenIcons = signal<Set<string>>(new Set());

  readonly upcomingDays = computed<DailyForecast[]>(() => {
    const fc = this.forecast();
    if (!fc) return [];
    const list = Array.isArray(fc.daily_forecast) && fc.daily_forecast.length > 0
      ? fc.daily_forecast
      : fc.days;
    return Array.isArray(list) ? list.slice(0, 3) : [];
  });

  readonly topCautions = computed<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const day of this.upcomingDays()) {
      for (const c of day.cautions || []) {
        const clean = c.trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          out.push(clean);
        }
      }
    }
    return out.slice(0, 2);
  });

  readonly rainProbability = computed<number | null>(() => {
    const fc = this.forecast();
    if (!fc) return null;
    const p = fc.intervals?.[0]?.rain_probability_percent ?? this.upcomingDays()[0]?.rain_probability_percent;
    return p !== null && p !== undefined ? p : null;
  });

  ngOnChanges(_changes: SimpleChanges): void {
    const coords = this.validCoords();
    const key = coords ? `${coords.latitude}:${coords.longitude}` : '';
    if (key === this.lastCoordKey) return;
    this.lastCoordKey = key;
    if (coords) {
      this.fetchWeather(coords);
    }
  }

  retry(): void {
    const coords = this.validCoords();
    if (coords) {
      this.fetchWeather(coords);
    }
  }

  private fetchWeather(coords: Coordinates): void {
    this.currentSub?.unsubscribe();
    this.forecastSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.currentSub = this.weatherService.getCurrentWeather({ coordinates: coords }).subscribe({
      next: (data) => {
        this.current.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        const info = parseWeatherApiError(err);
        this.errorMessage.set(info.message);
        this.isLoading.set(false);
      },
    });

    this.forecastSub = this.weatherService.getForecast({ coordinates: coords }).subscribe({
      next: (data) => {
        this.forecast.set(data);
      },
      error: () => {
        // Forecast failure is tolerated if current weather loaded
      },
    });
  }

  iconSrc(icon: string | null | undefined): string | null {
    const clean = (icon || '').trim();
    if (!clean || this.brokenIcons().has(clean)) return null;
    return weatherIconUrl(clean);
  }

  markIconBroken(icon: string | null | undefined): void {
    const clean = (icon || '').trim();
    if (!clean) return;
    this.brokenIcons.update((prev) => new Set([...prev, clean]));
  }

  glyph(icon: string | null | undefined): string {
    return weatherConditionGlyph(icon);
  }
}
