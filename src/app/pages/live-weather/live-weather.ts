import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of } from 'rxjs';

import {
  Coordinates,
  CurrentWeather,
  DailyForecast,
  Forecast,
  WeatherLocation,
  isValidWeatherSearchQuery,
  normalizeWeatherSearchQuery,
  parseValidCoordinates,
  parseWeatherApiError,
  weatherConditionGlyph,
  weatherIconUrl,
} from '../../core/models/weather-map.models';
import { LiveWeatherService } from '../../core/services/live-weather.service';

@Component({
  selector: 'app-live-weather',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './live-weather.html',
  styleUrl: './live-weather.scss',
})
export class LiveWeatherComponent implements OnInit, OnDestroy {
  private readonly weatherService = inject(LiveWeatherService);
  private readonly route = inject(ActivatedRoute);

  private readonly searchInput$ = new Subject<string>();
  private searchSub?: Subscription;
  private currentSub?: Subscription;
  private forecastSub?: Subscription;
  private cooldownTimer?: ReturnType<typeof setInterval>;

  readonly quickDestinations: readonly string[] = [
    'Colombo',
    'Kandy',
    'Ella',
    'Galle',
    'Jaffna',
    'Nuwara Eliya',
    'Trincomalee',
    'Sigiriya',
  ];

  searchQuery = 'Colombo';
  readonly activeDestinationLabel = signal<string>('Colombo');
  readonly activeTarget = signal<{ coordinates: Coordinates } | { location: string }>({
    location: 'Colombo',
  });

  // Search suggestions state
  readonly isSearching = signal<boolean>(false);
  readonly searchSuggestions = signal<WeatherLocation[]>([]);
  readonly searchDone = signal<boolean>(false);
  readonly searchError = signal<string | null>(null);
  readonly searchValidationError = signal<string | null>(null);

  // Current weather state
  readonly isLoadingCurrent = signal<boolean>(true);
  readonly currentWeather = signal<CurrentWeather | null>(null);
  readonly currentError = signal<string | null>(null);

  // Forecast state
  readonly isLoadingForecast = signal<boolean>(true);
  readonly forecast = signal<Forecast | null>(null);
  readonly forecastError = signal<string | null>(null);

  // Rate limit / retry cooldown
  readonly retryCooldownSeconds = signal<number>(0);
  readonly brokenIcons = signal<Set<string>>(new Set());

  readonly fiveDayForecast = computed<DailyForecast[]>(() => {
    const fc = this.forecast();
    if (!fc) return [];
    const list = Array.isArray(fc.daily_forecast) && fc.daily_forecast.length > 0
      ? fc.daily_forecast
      : fc.days;
    return Array.isArray(list) ? list.slice(0, 5) : [];
  });

  readonly currentRainProbability = computed<number | null>(() => {
    const fc = this.forecast();
    if (!fc) return null;
    const firstIntervalProb = fc.intervals?.[0]?.rain_probability_percent;
    if (firstIntervalProb !== null && firstIntervalProb !== undefined) {
      return firstIntervalProb;
    }
    const firstDayProb = this.fiveDayForecast()[0]?.rain_probability_percent;
    return firstDayProb !== null && firstDayProb !== undefined ? firstDayProb : null;
  });

  readonly travelCautions = computed<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const day of this.fiveDayForecast()) {
      for (const caution of day.cautions || []) {
        const clean = caution.trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          out.push(clean);
        }
      }
    }
    return out;
  });

  readonly lastUpdatedAt = computed<string | null>(() => {
    return (
      this.currentWeather()?.observed_at ||
      this.currentWeather()?.fetched_at ||
      this.forecast()?.fetched_at ||
      null
    );
  });

  ngOnInit(): void {
    this.setupSearchDebounce();

    const params = this.route.snapshot.queryParamMap;
    const coords = parseValidCoordinates(params.get('lat'), params.get('lon'));
    const nameParam = params.get('name')?.trim() || params.get('location')?.trim() || '';

    if (coords) {
      const label = nameParam || `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
      this.searchQuery = nameParam || '';
      this.activeDestinationLabel.set(label);
      this.activeTarget.set({ coordinates: coords });
    } else if (nameParam && isValidWeatherSearchQuery(nameParam)) {
      const clean = normalizeWeatherSearchQuery(nameParam);
      this.searchQuery = clean;
      this.activeDestinationLabel.set(clean);
      this.activeTarget.set({ location: clean });
    }

    this.loadWeather();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.currentSub?.unsubscribe();
    this.forecastSub?.unsubscribe();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  private setupSearchDebounce(): void {
    this.searchSub = this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => isValidWeatherSearchQuery(q)),
        switchMap((q) => {
          this.isSearching.set(true);
          this.searchError.set(null);
          return this.weatherService.searchDestinations(q).pipe(
            catchError((err) => {
              const info = parseWeatherApiError(err);
              this.searchError.set(info.message);
              this.applyCooldown(info.retryAfterSeconds);
              return of(null);
            })
          );
        })
      )
      .subscribe((res) => {
        this.isSearching.set(false);
        if (res) {
          this.searchSuggestions.set(res.locations || []);
          this.searchDone.set(true);
        }
      });
  }

  onSearchInputChange(value: string): void {
    this.searchQuery = value;
    this.searchValidationError.set(null);
    const normalized = normalizeWeatherSearchQuery(value);
    if (!normalized) {
      this.searchSuggestions.set([]);
      this.searchDone.set(false);
      this.searchError.set(null);
      return;
    }
    if (isValidWeatherSearchQuery(normalized)) {
      this.searchInput$.next(normalized);
    } else {
      this.searchSuggestions.set([]);
      this.searchDone.set(false);
    }
  }

  submitSearch(): void {
    const normalized = normalizeWeatherSearchQuery(this.searchQuery);
    if (!isValidWeatherSearchQuery(normalized)) {
      this.searchValidationError.set(
        'Enter a Sri Lankan destination name between 2 and 80 characters.'
      );
      return;
    }
    this.searchValidationError.set(null);
    this.isSearching.set(true);
    this.searchError.set(null);

    this.weatherService.searchDestinations(normalized).subscribe({
      next: (res) => {
        this.isSearching.set(false);
        const matches = res.locations || [];
        this.searchSuggestions.set(matches);
        this.searchDone.set(true);

        if (matches.length === 1) {
          this.selectLocation(matches[0]);
        } else if (matches.length === 0) {
          // Allow direct lookup attempt if user pressed search; backend returns 404 if unmatched
          this.activeDestinationLabel.set(normalized);
          this.activeTarget.set({ location: normalized });
          this.loadWeather();
        }
      },
      error: (err) => {
        this.isSearching.set(false);
        const info = parseWeatherApiError(err);
        this.searchError.set(info.message);
        this.applyCooldown(info.retryAfterSeconds);
      },
    });
  }

  selectLocation(place: WeatherLocation): void {
    const coords = parseValidCoordinates(place.latitude, place.longitude);
    if (!coords) return;
    const label = place.region ? `${place.name}, ${place.region}` : place.name;
    this.searchQuery = place.name;
    this.searchSuggestions.set([]);
    this.searchDone.set(false);
    this.searchError.set(null);
    this.searchValidationError.set(null);
    this.activeDestinationLabel.set(label);
    this.activeTarget.set({ coordinates: coords });
    this.loadWeather();
  }

  selectQuickDestination(name: string): void {
    this.searchQuery = name;
    this.searchSuggestions.set([]);
    this.searchDone.set(false);
    this.searchError.set(null);
    this.searchValidationError.set(null);
    this.activeDestinationLabel.set(name);
    this.activeTarget.set({ location: name });
    this.loadWeather();
  }

  loadWeather(): void {
    if (this.retryCooldownSeconds() > 0) return;

    const target = this.activeTarget();
    this.currentSub?.unsubscribe();
    this.forecastSub?.unsubscribe();

    this.isLoadingCurrent.set(true);
    this.currentError.set(null);
    this.isLoadingForecast.set(true);
    this.forecastError.set(null);

    this.currentSub = this.weatherService.getCurrentWeather(target).subscribe({
      next: (data) => {
        this.currentWeather.set(data);
        this.isLoadingCurrent.set(false);
      },
      error: (err) => {
        const info = parseWeatherApiError(err);
        this.currentWeather.set(null);
        this.currentError.set(info.message);
        this.isLoadingCurrent.set(false);
        this.applyCooldown(info.retryAfterSeconds);
      },
    });

    this.forecastSub = this.weatherService.getForecast(target).subscribe({
      next: (data) => {
        this.forecast.set(data);
        this.isLoadingForecast.set(false);
      },
      error: (err) => {
        const info = parseWeatherApiError(err);
        this.forecast.set(null);
        this.forecastError.set(info.message);
        this.isLoadingForecast.set(false);
        this.applyCooldown(info.retryAfterSeconds);
      },
    });
  }

  private applyCooldown(seconds: number | null): void {
    if (!seconds || seconds <= 0) return;
    this.retryCooldownSeconds.set(seconds);
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownTimer = setInterval(() => {
      const next = this.retryCooldownSeconds() - 1;
      if (next <= 0) {
        this.retryCooldownSeconds.set(0);
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = undefined;
        }
      } else {
        this.retryCooldownSeconds.set(next);
      }
    }, 1000);
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
