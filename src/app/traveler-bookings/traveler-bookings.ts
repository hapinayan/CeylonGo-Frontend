import { DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injectable, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, filter, map, of, startWith, switchMap } from 'rxjs';

import { User } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import { ExperienceIcon } from '../experiences/components/icon';
import { AccountConfirmDialogComponent } from '../shared/account/account-confirm-dialog.component';
import { AccountEmptyStateComponent } from '../shared/account/account-empty-state.component';
import { AccountLoadingSkeletonComponent } from '../shared/account/account-loading-skeleton.component';
import { AccountPageHeaderComponent } from '../shared/account/account-page-header.component';
import { AccountStatusBadgeComponent } from '../shared/account/account-status-badge.component';
import { TravelerAccountLayoutComponent } from '../shared/account/traveler-account-layout.component';
import { ServiceBookings, TravelerBookingsApi } from './booking-api';
import {
  BookingContact,
  BookingFilter,
  BookingRefund,
  BookingService,
  TravelerBooking,
  bookingGroup,
  bookingKey,
  bookingServices,
  bookingTime,
  canCancelBookingStatus,
  isBookingService,
  matchesBooking,
  matchesBookingCategory,
  matchesBookingFilter,
  serviceLabels,
  statusLabel,
  uniqueBookings,
} from './booking-model';
import { bookingExamples, bookingPreviewEnabled, canSimulateCancellation } from './booking-preview';

const tabs: { key: BookingFilter; name: string }[] = [
  { key: 'all', name: 'All Bookings' },
  { key: 'upcoming', name: 'Upcoming' },
  { key: 'pending', name: 'Pending' },
  { key: 'completed', name: 'Completed' },
  { key: 'cancelled', name: 'Cancelled' },
];

type ServiceState =
  | { service: BookingService; kind: 'loading' }
  | { service: BookingService; kind: 'failed'; status: number }
  | ({ service: BookingService; kind: 'ready' } & ServiceBookings);

type Screen =
  | { kind: 'loading' | 'missing' | 'unauthorized' | 'denied' | 'error' | 'restricted' }
  | { kind: 'list'; sections: ServiceState[] }
  | { kind: 'detail'; booking: TravelerBooking };

type DetailRead<T> = { kind: 'idle' | 'loading' | 'unavailable' } | { kind: 'ready'; data: T };

const PREVIEW = Symbol('development preview');
type Session = User | typeof PREVIEW | null;

@Injectable()
export class BookingReturnPosition {
  value: { session: Session; url: string; y: number } | null = null;
  readonly cancelledSamples = signal<ReadonlySet<string>>(new Set());
}

@Component({
  selector: 'app-traveler-bookings',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    ExperienceIcon,
    TravelerAccountLayoutComponent,
    AccountPageHeaderComponent,
    AccountStatusBadgeComponent,
    AccountEmptyStateComponent,
    AccountConfirmDialogComponent,
    AccountLoadingSkeletonComponent,
  ],
  templateUrl: './traveler-bookings.html',
  styleUrl: './traveler-bookings.scss',
})
export class TravelerBookings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(TravelerBookingsApi);
  private readonly viewport = inject(ViewportScroller);
  private readonly returnPosition = inject(BookingReturnPosition);
  private readonly retries = signal(0);
  private readonly serviceRetries = new Subject<BookingService>();

  readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly preview = computed(() => bookingPreviewEnabled && this.query().get('preview') === '1');

  readonly session = computed<Session>(() => {
    if (this.preview()) return PREVIEW;
    const user = this.auth.currentUser();
    return this.auth.isAuthenticated() && user?.role === 'traveler' && user.is_active ? user : null;
  });

  readonly account = computed(() => {
    const session = this.session();
    return session && session !== PREVIEW ? session : null;
  });

  readonly detail = computed(() => this.params().has('service') || this.params().has('bookingId'));
  readonly filter = computed(() => tabs.find((tab) => tab.key === this.query().get('status'))?.key ?? 'all');
  readonly categoryFilter = computed(() => this.query().get('category') || 'all');
  readonly sortOrder = computed(() => (this.query().get('sort') === 'oldest' ? 'oldest' : 'newest'));
  readonly search = computed(() => (this.query().get('q') ?? '').slice(0, 120));

  readonly tabs = tabs;
  readonly labels = serviceLabels;
  readonly icons: Record<BookingService, string> = {
    homestay: 'home',
    activity: 'mountain',
    eco: 'leaf',
    guide: 'group',
    rental: 'bicycle',
  };
  readonly key = bookingKey;
  readonly label = statusLabel;

  private readonly statusOverrides = signal(new Map<number, string>());
  readonly cancelDialogOpen = signal(false);
  readonly cancelBusy = signal(false);
  readonly cancelError = signal<string | null>(null);
  readonly cancelSuccessMessage = signal<string | null>(null);

  private readonly request = computed(
    () =>
      ({
        session: this.session(),
        params: this.params(),
        retry: this.retries(),
      }) as const,
  );

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap((request) =>
        this.load(
          request.session,
          request.params.get('service'),
          request.params.get('id') ?? request.params.get('bookingId'),
        ).pipe(map((screen) => ({ request, screen }))),
      ),
    ),
  );

  readonly screen = computed<Screen>(() => {
    if (!this.session()) return { kind: 'restricted' };
    const result = this.result();
    if (result?.request !== this.request()) return { kind: 'loading' };
    const screen = result.screen;
    if (screen.kind === 'detail') {
      const overridden = this.statusOverrides().get(screen.booking.id);
      if (overridden) {
        return { ...screen, booking: { ...screen.booking, status: overridden } };
      }
      if (this.isSampleCancellation(screen.booking)) {
        return { ...screen, booking: { ...screen.booking, status: 'cancelled' } };
      }
    }
    if (screen.kind === 'list') {
      const overrides = this.statusOverrides();
      if (overrides.size > 0) {
        return {
          ...screen,
          sections: screen.sections.map((section) =>
            section.kind === 'ready'
              ? {
                  ...section,
                  rows: section.rows.map((r) => (overrides.has(r.id) ? { ...r, status: overrides.get(r.id)! } : r)),
                }
              : section,
          ),
        };
      }
    }
    return screen;
  });

  readonly contact = this.detailRead<BookingContact | null>((row) => this.api.contact(row));
  readonly refunds = this.detailRead<BookingRefund[]>((row) => this.api.refundHistory(row));

  readonly rows = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list'
      ? uniqueBookings(screen.sections.flatMap((section) => (section.kind === 'ready' ? section.rows : [])))
      : [];
  });

  readonly visible = computed(() => {
    const now = Date.now();
    const filtered = this.rows().filter(
      (booking) =>
        matchesBookingFilter(booking, this.filter(), now) &&
        matchesBookingCategory(booking, this.categoryFilter()) &&
        matchesBooking(booking, this.search()),
    );
    const dir = this.sortOrder() === 'oldest' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const tA = bookingTime(a.createdAt || a.start) || a.id;
      const tB = bookingTime(b.createdAt || b.start) || b.id;
      return (tA - tB) * dir || (a.id - b.id) * dir;
    });
  });

  readonly counts = computed(() => {
    const now = Date.now();
    const counts: Record<BookingFilter, number> = {
      all: this.rows().length,
      upcoming: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of this.rows()) {
      if (matchesBookingFilter(row, 'upcoming', now)) counts.upcoming++;
      if (matchesBookingFilter(row, 'pending', now)) counts.pending++;
      if (matchesBookingFilter(row, 'completed', now)) counts.completed++;
      if (matchesBookingFilter(row, 'cancelled', now)) counts.cancelled++;
      void bookingGroup(row, now);
    }
    return counts;
  });

  readonly loadingServices = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list' && screen.sections.some((section) => section.kind === 'loading');
  });

  readonly limited = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list'
      ? screen.sections
          .filter((section) => section.kind === 'ready' && section.limited)
          .map((section) => this.labels[section.service])
      : [];
  });

  readonly hasActiveFilters = computed(
    () => this.filter() !== 'all' || this.categoryFilter() !== 'all' || Boolean(this.search().trim()),
  );

  constructor() {
    effect((onCleanup) => {
      const state = this.screen();
      const saved = this.returnPosition.value;
      if (
        state.kind !== 'list' ||
        state.sections.some((section) => section.kind === 'loading') ||
        !saved ||
        saved.session !== this.session() ||
        saved.url !== this.router.url
      ) {
        return;
      }
      const frame = requestAnimationFrame(() => {
        this.returnPosition.value = null;
        this.viewport.scrollToPosition([0, saved.y]);
      });
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }

  canCancelLiveBooking(row: TravelerBooking): boolean {
    return !this.preview() && canCancelBookingStatus(row.status);
  }

  openCancelDialog(): void {
    this.cancelError.set(null);
    this.cancelDialogOpen.set(true);
  }

  confirmLiveCancellation(booking: TravelerBooking, reason: string): void {
    if (this.cancelBusy() || !this.canCancelLiveBooking(booking)) return;
    this.cancelBusy.set(true);
    this.cancelError.set(null);
    this.api.cancelBooking(booking.id, reason).subscribe({
      next: (updated) => {
        this.cancelBusy.set(false);
        this.cancelDialogOpen.set(false);
        this.statusOverrides.update((prev) => {
          const next = new Map(prev);
          next.set(booking.id, updated.status || 'cancelled');
          return next;
        });
        this.cancelSuccessMessage.set('Booking cancelled successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.cancelBusy.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.cancelError.set(
          detail || 'Could not cancel this booking right now. Please try again or contact support.',
        );
      },
    });
  }

  isSampleCancellation(row: TravelerBooking): boolean {
    return this.preview() && this.returnPosition.cancelledSamples().has(bookingKey(row));
  }

  canCancelSample(row: TravelerBooking): boolean {
    return this.preview() && !this.isSampleCancellation(row) && canSimulateCancellation(row);
  }

  confirmSampleCancellation(dialog: HTMLDialogElement, row: TravelerBooking): void {
    const view = this.screen();
    if (!dialog.open || view.kind !== 'detail' || view.booking !== row || !this.canCancelSample(row)) return;
    dialog.close();
    this.returnPosition.cancelledSamples.update((keys) => new Set([...keys, bookingKey(row)]));
    requestAnimationFrame(() => dialog.ownerDocument.getElementById('sample-cancel-result')?.focus());
  }

  rememberPosition(): void {
    this.returnPosition.value = {
      session: this.session(),
      url: this.router.url,
      y: this.viewport.getScrollPosition()[1],
    };
    this.viewport.scrollToPosition([0, 0]);
  }

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('field');

  focusSearch(): void {
    this.searchField()?.nativeElement.focus();
  }

  searchFor(value: string, event: Event): void {
    event.preventDefault();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value.trim().slice(0, 120) || null },
      queryParamsHandling: 'merge',
    });
  }

  updateQuery(param: string, value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [param]: value === 'all' || value === 'newest' ? null : value },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: null, category: null, q: null },
      queryParamsHandling: 'merge',
    });
  }

  retry(): void {
    this.retries.update((value) => value + 1);
  }

  retryService(service: BookingService): void {
    this.serviceRetries.next(service);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }

  date(value: string): string {
    if (value.length === 10) return value + 'T00:00:00+05:30';
    return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z';
  }

  categoryLabelFor(row: TravelerBooking): string {
    if (row.rawCategory === 'bike') return 'Motorbike / Scooter Rental';
    if (row.rawCategory === 'bicycle') return 'Bicycle Rental';
    return this.labels[row.service];
  }

  private detailRead<T>(read: (booking: TravelerBooking) => Observable<T> | undefined) {
    const run = new Subject<TravelerBooking>();
    const state = toSignal(
      toObservable(this.request).pipe(
        switchMap((request) =>
          run.pipe(
            switchMap((row) => {
              const source = read(row);
              if (!source) return of({ request, result: { kind: 'unavailable' } as DetailRead<T> });
              return source.pipe(
                map((data) => ({ request, result: { kind: 'ready', data } as DetailRead<T> })),
                catchError(() => of({ request, result: { kind: 'unavailable' } as DetailRead<T> })),
                startWith({ request, result: { kind: 'loading' } as DetailRead<T> }),
              );
            }),
          ),
        ),
      ),
    );
    return {
      state: computed<DetailRead<T>>(() => {
        const latest = state();
        return latest?.request === this.request() ? latest.result : { kind: 'idle' };
      }),
      load: () => {
        const view = this.screen();
        if (view.kind === 'detail' && this.account()) run.next(view.booking);
      },
    };
  }

  private previewRows(): TravelerBooking[] {
    const cancelled = this.returnPosition.cancelledSamples();
    return bookingExamples.map((row) => (cancelled.has(bookingKey(row)) ? { ...row, status: 'cancelled' } : row));
  }

  private load(session: Session, service: string | null, id: string | null) {
    if (!session) return of<Screen>({ kind: 'restricted' });
    if (id !== null) {
      const bookingId = Number(id);
      if ((service !== null && !isBookingService(service)) || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(bookingId)) {
        return of<Screen>({ kind: 'missing' });
      }
      const typedService = service && isBookingService(service) ? service : null;
      const source =
        session === PREVIEW
          ? of(this.previewRows().find((row) => (!typedService || row.service === typedService) && row.id === bookingId))
          : this.api.detail(typedService, bookingId);
      return source.pipe(
        map((booking): Screen => (booking?.id === bookingId ? { kind: 'detail', booking } : { kind: 'missing' })),
        catchError((error) =>
          of<Screen>({
            kind:
              error.status === 404
                ? 'missing'
                : error.status === 401
                  ? 'unauthorized'
                  : error.status === 403
                    ? 'denied'
                    : 'error',
          }),
        ),
        startWith<Screen>({ kind: 'loading' }),
      );
    }
    if (session === PREVIEW) {
      return of<Screen>({
        kind: 'list',
        sections: bookingServices.map((s) => ({
          service: s,
          kind: 'ready',
          rows: this.previewRows().filter((row) => row.service === s),
          limited: false,
        })),
      });
    }
    return combineLatest(
      bookingServices.map((s) =>
        this.serviceRetries.pipe(
          filter((requested) => requested === s),
          startWith(s),
          switchMap(() =>
            this.api.list(s).pipe(
              map((result): ServiceState => ({ service: s, kind: 'ready', ...result })),
              catchError((error) => of<ServiceState>({ service: s, kind: 'failed', status: error.status })),
              startWith<ServiceState>({ service: s, kind: 'loading' }),
            ),
          ),
        ),
      ),
    ).pipe(map((sections): Screen => ({ kind: 'list', sections })));
  }
}
