import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { Coordinates, coordinatesOf, WeatherLocation } from '../../models/weather';
import { locationQuery, trackWeather, validLocationQuery, WEATHER_SOURCE } from '../../services/weather-api';

@Component({
  selector: 'app-weather-panel',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './weather-panel.html',
  styleUrl: './weather-panel.scss',
})
export class WeatherPanel {
  readonly locationName = input.required<string>();
  readonly coordinates = input<Coordinates | null>(null);
  readonly preview = input(false);
  private readonly source = inject(WEATHER_SOURCE);
  private readonly context = computed(() => JSON.stringify([this.locationName(), this.coordinates()]));
  private readonly chosen = signal<{ context: string; place: WeatherLocation } | null>(null);
  private readonly search = signal<{ context: string; query: string } | null>(null);
  private readonly refresh = signal(0);
  private readonly searchRefresh = signal(0);
  readonly validation = signal('');
  readonly explicit = computed(() => coordinatesOf(this.coordinates()?.latitude, this.coordinates()?.longitude));
  readonly selection = computed(() => {
    const choice = this.chosen();
    return choice?.context === this.context() ? choice.place : null;
  });
  readonly target = computed(() => this.explicit() ?? this.selection());
  readonly weatherName = computed(() => this.selection()?.name ?? this.locationName());
  readonly query = computed(() => {
    const search = this.search();
    return search?.context === this.context() ? search.query : locationQuery(this.locationName());
  });
  private readonly lookup = computed(() => ({
    query: this.target() ? '' : this.query(), refresh: this.searchRefresh(),
  }));
  readonly places = toSignal(toObservable(this.lookup).pipe(
    distinctUntilChanged((a, b) => a.query === b.query && a.refresh === b.refresh),
    switchMap(({ query }) => validLocationQuery(query) ? trackWeather(this.source.locations(query)) : of({ status: 'idle' } as const)),
  ));

  private readonly request = computed(() => ({
    latitude: this.target()?.latitude, longitude: this.target()?.longitude, refresh: this.refresh(),
  }));
  private readonly weatherRequests = toObservable(this.request).pipe(
    distinctUntilChanged((a, b) => a.latitude === b.latitude && a.longitude === b.longitude && a.refresh === b.refresh),
  );
  readonly current = toSignal(this.weatherRequests.pipe(switchMap(({ latitude, longitude }) => {
    const value = coordinatesOf(latitude, longitude);
    return value ? trackWeather(this.source.current(value)) : of({ status: 'idle' } as const);
  })));
  readonly forecast = toSignal(this.weatherRequests.pipe(switchMap(({ latitude, longitude }) => {
    const value = coordinatesOf(latitude, longitude);
    return value ? trackWeather(this.source.forecast(value)) : of({ status: 'idle' } as const);
  })));

  private readonly deadline = computed(() => {
    const places = this.places();
    const current = this.current();
    const forecast = this.forecast();
    return Math.max(
      places?.status === 'error' ? places.retryAt : 0,
      current?.status === 'error' ? current.retryAt : 0,
      forecast?.status === 'error' ? forecast.retryAt : 0,
    );
  });
  private readonly cooldownElapsed = toSignal(toObservable(this.deadline).pipe(
    switchMap(deadline => deadline > Date.now() ? timer(deadline - Date.now()).pipe(map(() => deadline)) : of(deadline)),
  ));

  find(value: string): void {
    const query = locationQuery(value);
    if (!validLocationQuery(query)) {
      this.validation.set('Enter a place name containing 2 to 80 characters.');
      return;
    }
    this.validation.set('');
    this.search.set({ context: this.context(), query });
  }

  select(place: WeatherLocation): void {
    if (coordinatesOf(place.latitude, place.longitude)) {
      this.chosen.set({ context: this.context(), place });
    }
  }

  changeLocation(): void { this.chosen.set(null); }

  retryWeather(): void { this.refresh.update(value => value + 1); }
  retryPlaces(): void { this.searchRefresh.update(value => value + 1); }

  retryAllowed(deadline: number): boolean {
    this.cooldownElapsed();
    return Date.now() >= deadline;
  }

  weatherRetryAllowed(): boolean {
    const current = this.current();
    const forecast = this.forecast();
    return this.retryAllowed(Math.max(
      current?.status === 'error' ? current.retryAt : 0,
      forecast?.status === 'error' ? forecast.retryAt : 0,
    ));
  }

  icon(code: string): string {
    if (code.startsWith('01')) return code.endsWith('n') ? '☾' : '☀';
    if (['09', '10', '11'].includes(code.slice(0, 2))) return '☂';
    return '☁';
  }
}
