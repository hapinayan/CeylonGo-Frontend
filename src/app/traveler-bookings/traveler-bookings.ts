import { DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { Component, ElementRef, Injectable, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, filter, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/auth.models';
import { ExperienceIcon } from '../experiences/components/icon';
import { Footer } from '../shared/components/footer/footer';
import { TravelerAccountSidebar } from '../shared/components/traveler-account-sidebar/traveler-account-sidebar';
import { TravelerNavbar } from '../shared/components/traveler-navbar/traveler-navbar';
import { TravelerAuthModal } from '../shared/components/traveler-auth-modal/traveler-auth-modal';
import { TravelerBookingsApi, ServiceBookings } from './booking-api';
import { BookingContact, BookingFilter, BookingRefund, BookingService, TravelerBooking, bookingGroup, bookingKey, bookingServices, isBookingService, matchesBooking, serviceLabels, statusLabel, uniqueBookings } from './booking-model';
import { bookingExamples, bookingPreviewEnabled, canSimulateCancellation } from './booking-preview';

const tabs: { key: BookingFilter; name: string }[] = [
  { key: 'all', name: 'All Bookings' }, { key: 'upcoming', name: 'Upcoming' },
  { key: 'completed', name: 'Completed' }, { key: 'cancelled', name: 'Cancelled' },
];

type ServiceState = { service: BookingService; kind: 'loading' } |
  { service: BookingService; kind: 'failed'; status: number } |
  ({ service: BookingService; kind: 'ready' } & ServiceBookings);
type Screen = { kind: 'loading' | 'missing' | 'unauthorized' | 'denied' | 'error' | 'restricted' } |
  { kind: 'list'; sections: ServiceState[] } | { kind: 'detail'; booking: TravelerBooking };
type DetailRead<T> = { kind: 'idle' | 'loading' | 'unavailable' } | { kind: 'ready'; data: T };
const PREVIEW = Symbol('development preview');
type Session = User | typeof PREVIEW | null;

@Injectable()
export class BookingReturnPosition {
  value: { session: Session; url: string; y: number } | null = null;
  readonly cancelledSamples = signal<ReadonlySet<string>>(new Set());

}

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, ExperienceIcon, Footer, TravelerNavbar, TravelerAccountSidebar, TravelerAuthModal],
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
  readonly detail = computed(() => this.params().has('service'));
  readonly filter = computed(() => tabs.find(tab => tab.key === this.query().get('status'))?.key ?? 'all');
  readonly search = computed(() => (this.query().get('q') ?? '').slice(0, 120));
  readonly tabs = tabs;
  readonly labels = serviceLabels;
  readonly icons = { homestay: 'home', activity: 'mountain', eco: 'leaf', guide: 'group', rental: 'bicycle', artisan: 'culture' };
  readonly key = bookingKey;
  readonly label = statusLabel;

  private readonly request = computed(() => ({
    session: this.session(), params: this.params(), retry: this.retries(),
  } as const));
  private readonly result = toSignal(toObservable(this.request).pipe(
    switchMap(request => this.load(request.session, request.params.get('service'), request.params.get('id')).pipe(
      map(screen => ({ request, screen })),
    )),
  ));
  readonly screen = computed<Screen>(() => {
    if (!this.session()) return { kind: 'restricted' };
    const result = this.result();
    if (result?.request !== this.request()) return { kind: 'loading' };
    const screen = result.screen;
    if (screen.kind === 'detail' && this.isSampleCancellation(screen.booking)) {
      return { ...screen, booking: { ...screen.booking, status: 'cancelled' } };
    }
    return screen;
  });
  readonly contact = this.detailRead<BookingContact | null>(row => this.api.contact(row));
  readonly refunds = this.detailRead<BookingRefund[]>(row => this.api.refundHistory(row));
  readonly rows = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list' ? uniqueBookings(screen.sections.flatMap(section => section.kind === 'ready' ? section.rows : [])) : [];
  });
  readonly visible = computed(() => this.rows().filter(booking =>
    (this.filter() === 'all' || bookingGroup(booking) === this.filter()) && matchesBooking(booking, this.search())));
  readonly counts = computed(() => {
    const counts = { all: this.rows().length, upcoming: 0, completed: 0, cancelled: 0 };
    for (const row of this.rows()) {
      const group = bookingGroup(row);
      if (group !== 'all') counts[group]++;
    }
    return counts;
  });
  readonly loadingServices = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list' && screen.sections.some(section => section.kind === 'loading');
  });
  readonly limited = computed(() => {
    const screen = this.screen();
    return screen.kind === 'list' ? screen.sections.filter(section => section.kind === 'ready' && section.limited).map(section => this.labels[section.service]) : [];
  });

  constructor() {
    effect(onCleanup => {
      const state = this.screen();
      const saved = this.returnPosition.value;
      if (state.kind !== 'list' || state.sections.some(section => section.kind === 'loading') ||
          !saved || saved.session !== this.session() || saved.url !== this.router.url) return;
      const frame = requestAnimationFrame(() => {
        this.returnPosition.value = null;
        this.viewport.scrollToPosition([0, saved.y]);
      });
      onCleanup(() => cancelAnimationFrame(frame));
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
    this.returnPosition.cancelledSamples.update(keys => new Set([...keys, bookingKey(row)]));
    requestAnimationFrame(() => dialog.ownerDocument.getElementById('sample-cancel-result')?.focus());
  }

  rememberPosition(): void {
    this.returnPosition.value = { session: this.session(), url: this.router.url, y: this.viewport.getScrollPosition()[1] };
    this.viewport.scrollToPosition([0, 0]);
  }

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('field');

  focusSearch(): void {
    this.searchField()?.nativeElement.focus();
  }

  searchFor(value: string, event: Event): void {
    event.preventDefault();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: value.trim().slice(0, 120) || null }, queryParamsHandling: 'merge' });
  }

  retry(): void { this.retries.update(value => value + 1); }
  retryService(service: BookingService): void { this.serviceRetries.next(service); }
  logout(): void { this.auth.logout(); void this.router.navigate(['/']); }

  date(value: string): string {
    if (value.length === 10) return value + 'T00:00:00+05:30';
    return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z';
  }

  private detailRead<T>(read: (booking: TravelerBooking) => Observable<T> | undefined) {
    const run = new Subject<TravelerBooking>();
    const state = toSignal(toObservable(this.request).pipe(switchMap(request =>
      run.pipe(switchMap(row => {
        const source = read(row);
        if (!source) return of({ request, result: { kind: 'unavailable' } as DetailRead<T> });
        return source.pipe(
          map(data => ({ request, result: { kind: 'ready', data } as DetailRead<T> })),
          catchError(() => of({ request, result: { kind: 'unavailable' } as DetailRead<T> })),
          startWith({ request, result: { kind: 'loading' } as DetailRead<T> }),
        );
      })),
    )));
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
    return bookingExamples.map(row => cancelled.has(bookingKey(row)) ? { ...row, status: 'cancelled' } : row);
  }

  private load(session: Session, service: string | null, id: string | null) {
    if (!session) return of<Screen>({ kind: 'restricted' });
    if (service !== null) {
      const bookingId = Number(id);
      if (!isBookingService(service) || !/^[1-9]\d*$/.test(id ?? '') || !Number.isSafeInteger(bookingId)) {
        return of<Screen>({ kind: 'missing' });
      }
      const source = session === PREVIEW
        ? of(this.previewRows().find(row => row.service === service && row.id === bookingId))
        : this.api.detail(service, bookingId);
      return source.pipe(
        map((booking): Screen => booking?.id === bookingId ? { kind: 'detail', booking } : { kind: 'missing' }),
        catchError(error => of<Screen>({ kind: error.status === 404 ? 'missing' : error.status === 401 ? 'unauthorized' : error.status === 403 ? 'denied' : 'error' })),
        startWith<Screen>({ kind: 'loading' }),
      );
    }
    if (session === PREVIEW) return of<Screen>({ kind: 'list', sections: bookingServices.map(service => ({
      service, kind: 'ready', rows: this.previewRows().filter(row => row.service === service), limited: false,
    })) });
    return combineLatest(bookingServices.map(service => this.serviceRetries.pipe(
      filter(requested => requested === service),
      startWith(service),
      switchMap(() => this.api.list(service).pipe(
        map((result): ServiceState => ({ service, kind: 'ready', ...result })),
        catchError(error => of<ServiceState>({ service, kind: 'failed', status: error.status })),
        startWith<ServiceState>({ service, kind: 'loading' }),
      )),
    ))).pipe(map((sections): Screen => ({ kind: 'list', sections })));
  }
}
