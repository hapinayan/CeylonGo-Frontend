import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  filter,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../core/interceptors/auth.interceptor';
import { AuthService } from '../core/services/auth.service';
import {
  ActivityResult,
  Filters,
  Group,
  Home,
  Kind,
  Search,
  Settings,
  Unit,
  View,
} from './recommendation.models';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = environment.apiBaseUrl + '/recommendations';
  private readonly guest = new HttpContext().set(ANONYMOUS_API_REQUEST, true);
  readonly session = computed(() => {
    const user = this.auth.currentUser();
    return user?.role === 'traveler' ? this.auth.getToken() : null;
  });
  readonly session$ = toObservable(this.session);
  readonly revision = signal(0);
  readonly revision$ = toObservable(this.revision);
  private readonly consentRevision = signal(0);
  private readonly seen = new Map<string, number>();
  private owner: string | null = null;
  private settingsRequest?: { session: string | null; request: Observable<Settings> };
  private retryAt = 0;
  private readonly consentState = toSignal(
    combineLatest([this.session$, toObservable(this.consentRevision)]).pipe(
      switchMap(([session]) =>
        session
          ? this.getSettings().pipe(
              map((value) => ({ session, enabled: value.behavioral_personalization })),
              catchError(() => of({ session, enabled: false })),
              startWith(null),
            )
          : of(null),
      ),
    ),
  );
  private readonly consentOverride = signal<{ session: string; enabled: boolean } | null>(null);
  readonly enabled = computed(() => {
    const override = this.consentOverride();
    if (override && override.session === this.session()) return override.enabled;
    const consent = this.consentState();
    return !!consent && consent.session === this.session() && consent.enabled;
  });

  constructor() {
    effect(() => {
      const session = this.session();
      this.resetTracking(session);
      const override = this.consentOverride();
      if (override && override.session !== session) this.consentOverride.set(null);
    });
  }

  private resetTracking(session: string | null) {
    if (session !== this.owner) {
      this.owner = session;
      this.seen.clear();
      this.retryAt = 0;
    }
  }

  popular(filters: Filters = {}) {
    return this.http.get<Group>(this.url + '/popular', {
      params: { ...filters },
      context: this.guest,
    });
  }
  me(filters: Filters & { recommendation_type?: Kind } = {}) {
    return this.http.get<Group>(this.url + '/me', { params: { ...filters } });
  }
  home(filters: Filters = {}, anonymous = !this.session()) {
    return this.http.get<Home>(this.url + '/home', {
      params: { ...filters },
      context: anonymous ? this.guest : undefined,
    });
  }
  similar(id: number, filters: Filters = {}) {
    return this.http.get<Group>(this.url + '/similar/' + id, {
      params: { ...filters },
      context: this.guest,
    });
  }
  getSettings() {
    const session = this.session();
    const pending = this.settingsRequest;
    if (pending?.session === session) return pending.request;
    const request = this.http.get<Settings>(this.url + '/settings').pipe(
      finalize(() => {
        if (this.settingsRequest?.request === request) this.settingsRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.settingsRequest = { session, request };
    return request;
  }
  updateSettings(enabled: boolean) {
    const session = this.session();
    return this.http
      .patch<Settings>(this.url + '/settings', {
        behavioral_personalization: enabled,
      })
      .pipe(
        tap((value) => {
          if (session && session === this.session()) {
            this.consentOverride.set({ session, enabled: value.behavioral_personalization });
            this.invalidate();
          }
        }),
      );
  }
  clearHistory() {
    return this.http.delete<void>(this.url + '/history').pipe(
      tap(() => {
        this.seen.clear();
        this.invalidate();
      }),
    );
  }
  invalidate() {
    this.revision.update((value) => value + 1);
  }

  track(event: Search | View) {
    const session = this.session();
    if (!session || !this.enabled()) return;
    if (
      event.event_type === 'view' &&
      (!Number.isSafeInteger(event.listing_id) || event.listing_id < 1)
    )
      return;
    this.resetTracking(session);
    const now = Date.now();
    if (now < this.retryAt) return;
    for (const [key, at] of this.seen) {
      if (now - at >= 600_000) this.seen.delete(key);
    }
    const key = JSON.stringify(event);
    if (
      this.seen.has(key) ||
      [...this.seen.values()].filter((at) => now - at < 60_000).length >= 20
    )
      return;
    this.seen.set(key, now);
    this.http
      .post<ActivityResult>(this.url + '/activity', event)
      .pipe(
        takeUntil(this.session$.pipe(filter((current) => current !== session))),
        take(1),
        tap((result) => {
          if (result.reason === 'personalization_disabled' && this.session() === session) {
            this.consentOverride.set({ session, enabled: false });
            this.consentRevision.update((value) => value + 1);
            this.invalidate();
          }
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 429 && this.session() === session) {
            this.retryAt = Date.now() + 1000 * (Number(error.headers.get('Retry-After')) || 60);
          }
          return of(null);
        }),
      )
      .subscribe();
  }

  price(unit: Unit, min?: number | null, max?: number | null): Search['filters'] {
    const valid = (value?: number | null): value is number =>
      value != null && Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
    const min_price = valid(min) ? min : undefined;
    const max_price = valid(max) ? max : undefined;
    if (
      (min_price === undefined && max_price === undefined) ||
      (min_price != null && max_price != null && min_price > max_price)
    )
      return undefined;
    return { pricing_unit: unit, min_price, max_price };
  }

  search(event: Omit<Search, 'event_type'>) {
    const clean = (value: string | undefined, limit: number) => {
      const text = value?.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
      if (
        !text ||
        text.length > limit ||
        !/^[\p{L}\p{M}\p{Nd} '\u2019-]+$/u.test(text) ||
        (text.match(/\p{Nd}/gu)?.length ?? 0) > 4 ||
        text.split(' ').some((word) => word.length > 32)
      )
        return undefined;
      return text;
    };
    const search_query = clean(event.search_query, 120);
    const district = clean(event.district, 80);
    const destination = clean(event.destination, 80);
    if (search_query || district || destination || event.filters) {
      this.track({
        event_type: 'search',
        category: event.category,
        search_query,
        district,
        destination,
        filters: event.filters,
      });
    }
  }
}
