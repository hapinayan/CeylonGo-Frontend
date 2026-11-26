import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { Footer } from '../../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { ExperienceIcon } from '../../components/icon';
import { TravelerHeader } from '../../components/traveler-header';
import {
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityDetails,
  ActivityPaymentResponse,
} from '../../models/activity';
import { ActivitiesApi } from '../../services/activities-api';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState } from '../../services/workflow-state';
import {
  ResolvedBookingListing,
  resolveBookingListingMetadata,
} from './booking-listing-metadata';

export type BookingCategoryTab = 'adventure' | 'rentals' | 'guides';

export interface EnrichedBookingItem {
  booking: ActivityBookingResponse;
  detail: ActivityBookingDetailResponse | null;
  activity: ActivityDetails | null;
  listing: ResolvedBookingListing | null;
  latestPayment: ActivityPaymentResponse | null;
  experienceTitle: string;
  experienceLocation: string;
  paymentMethodLabel: string;
  paymentStatus: string;
}

@Component({
  imports: [
    TravelerHeader,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ExperienceIcon,
    Footer,
    TravelerAuthModal,
  ],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell">
      <app-traveler-header />
      <main class="discover traveler-workflow">
        <a routerLink="/experiences" class="workflow-back-link">
          <app-experience-icon name="previous" /> Back to Discover
        </a>

        <div class="workflow-page-header">
          <h1>My Bookings</h1>
          <p class="workflow-lead-p">View and manage your adventure, bike rental and tour guide booking requests across Sri Lanka.</p>
        </div>

        <nav class="booking-category-tabs" aria-label="Booking categories" style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <button
            type="button"
            class="outline-control"
            [class.workflow-primary]="selectedCategory() === 'adventure'"
            (click)="selectCategory('adventure')"
          >
            Adventures
          </button>
          <button
            type="button"
            class="outline-control"
            [class.workflow-primary]="selectedCategory() === 'rentals'"
            (click)="selectCategory('rentals')"
          >
            Bike &amp; Bicycle Rentals
          </button>
          <button
            type="button"
            class="outline-control"
            [class.workflow-primary]="selectedCategory() === 'guides'"
            (click)="selectCategory('guides')"
          >
            Tour Guides
          </button>
        </nav>

        @if (!session.account()) {
          <div class="workflow-card signin-prompt">
            <h2>Sign in to view your bookings</h2>
            <p>You need to be signed in as a traveler to access your adventure bookings.</p>
            <button type="button" class="outline-control workflow-primary" (click)="openAuthModal()">
              Sign in
            </button>
          </div>
        } @else if (state(); as result) {
          @if (result.status === 'loading') {
            <p role="status" class="workflow-state">Loading your bookings…</p>
          } @else if (result.status === 'error') {
            <div class="workflow-state" role="alert">
              <p>Could not load bookings.</p>
              <button type="button" class="outline-control" (click)="retry()">Retry</button>
            </div>
          } @else if (result.status === 'ready' && result.owner === session.account()) {
            <div class="bookings-list">
              @for (item of result.data; track item.booking.id) {
                <article class="workflow-card booking-item-card">
                  <div class="card-header-row">
                    <div class="booking-ref-badge">
                      <span class="ref-label">Booking Reference</span>
                      <h2>{{ item.booking.booking_reference || ('ACT-' + item.booking.id) }}</h2>
                    </div>
                    <div class="workflow-statuses">
                      <span class="workflow-pill" [attr.data-status]="item.booking.status">
                        Status: {{ item.booking.status }}
                      </span>
                      <span class="workflow-pill" [attr.data-status]="item.paymentStatus">
                        Payment: {{ item.paymentStatus.replaceAll('_', ' ') }}
                      </span>
                    </div>
                  </div>

                  <div class="booking-item-body">
                    <p style="margin: 0 0 0.45rem; font-weight: 700; color: #082b5c;">
                      {{ item.experienceTitle }}
                      @if (item.experienceLocation) {
                        <span style="font-weight: 500; color: #64748b;"> · {{ item.experienceLocation }}</span>
                      }
                    </p>
                    <p class="booking-time">
                      <app-experience-icon name="calendar" />
                      <span>
                        {{ item.booking.starts_at | date:'medium':'GMT+0530' }}
                        @if (item.listing?.isRental) {
                          &rarr; {{ item.booking.ends_at | date:'medium':'GMT+0530' }} ·
                          {{ item.booking.quantity }} {{ item.booking.quantity === 1 ? 'day' : 'days' }}
                        } @else {
                          (Sri Lanka time) ·
                          {{ item.booking.quantity }} {{ item.booking.quantity === 1 ? 'participant' : 'participants' }}
                        }
                      </span>
                    </p>
                    <p style="margin: 0.35rem 0 0.65rem; font-size: 0.85rem; color: #475569;">
                      Payment Method: <strong>{{ item.paymentMethodLabel }}</strong>
                      @if (item.booking.status === 'pending') {
                        <span> · Booking Request Submitted — Awaiting Provider Confirmation</span>
                      }
                    </p>
                    <div class="booking-price-row">
                      <span class="price-val">
                        {{ item.booking.currency }} {{ item.booking.total_amount | number:'1.2-2' }}
                      </span>
                      <a [routerLink]="['/experiences/bookings', item.booking.id]" class="outline-control btn-view-booking">
                        View booking {{ item.booking.booking_reference || ('ACT-' + item.booking.id) }}
                      </a>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="workflow-card empty-bookings-card">
                  <app-experience-icon name="mountain" class="empty-icon" />
                  @if (selectedCategory() === 'rentals') {
                    <h3>No bike or bicycle rental bookings found.</h3>
                    <p>You have not submitted any bike or bicycle rental requests yet.</p>
                    <a routerLink="/bicycles" class="outline-control workflow-primary" style="margin-top: 1rem;">
                      Browse Rentals
                    </a>
                  } @else if (selectedCategory() === 'guides') {
                    <h3>No tour guide bookings found.</h3>
                    <p>You have not submitted any tour guide requests yet.</p>
                    <a routerLink="/tour-guides" class="outline-control workflow-primary" style="margin-top: 1rem;">
                      Browse Tour Guides
                    </a>
                  } @else {
                    <h3>No adventure bookings found.</h3>
                    <p>You have not submitted any adventure activity bookings on this page yet.</p>
                    <a routerLink="/experiences" class="outline-control workflow-primary" style="margin-top: 1rem;">
                      Explore Experiences
                    </a>
                  }
                </div>
              }
            </div>

            @if (result.data.length > 0 || page() > 1) {
              <nav class="workflow-actions booking-pagination" aria-label="Booking pages">
                <button
                  type="button"
                  class="outline-control"
                  [disabled]="page() === 1"
                  (click)="previousPage()"
                >
                  Previous
                </button>
                <span aria-live="polite">Page {{ page() }}</span>
                <button
                  type="button"
                  class="outline-control"
                  [disabled]="result.data.length < pageSize"
                  (click)="nextPage(result.data)"
                >
                  Next
                </button>
              </nav>
            }
          }
        }
      </main>
      <app-footer />
      <app-traveler-auth-modal />
    </div>
  `,
})
export class MyExperienceBookings {
  readonly session = inject(TravelSession);
  private readonly http = inject(HttpClient);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly activities = inject(ActivitiesApi);
  private readonly authModal = inject(AuthModalService);

  readonly selectedCategory = signal<BookingCategoryTab>('adventure');
  readonly pageSize = 8;
  readonly page = signal(1);
  readonly beforeIdHistory = signal<(number | null)[]>([null]);
  private readonly refresh = signal(0);

  private readonly currentBeforeId = computed(
    () => this.beforeIdHistory()[this.page() - 1] ?? null,
  );

  private readonly request = computed(() => ({
    owner: this.session.account(),
    beforeId: this.currentBeforeId(),
    category: this.selectedCategory(),
    refresh: this.refresh(),
  }));

  private fetchCategoryBookings(category: BookingCategoryTab, beforeId: number | null) {
    if (category === 'adventure') {
      return this.source.bookings(this.pageSize, beforeId);
    }

    const categories = category === 'rentals' ? ['bike', 'bicycle'] : ['guide'];
    return forkJoin(
      categories.map((cat) => {
        let params = new HttpParams()
          .set('category', cat)
          .set('limit', String(this.pageSize));
        if (beforeId) params = params.set('before_id', String(beforeId));
        return this.http
          .get<ActivityBookingResponse[]>(`${environment.apiBaseUrl}/bookings/my`, { params })
          .pipe(catchError(() => of([] as ActivityBookingResponse[])));
      }),
    ).pipe(
      map((groups) =>
        groups
          .flat()
          .sort((a, b) => b.id - a.id)
          .slice(0, this.pageSize),
      ),
    );
  }

  readonly state = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ owner, beforeId, category }) => {
        if (!owner) return of({ status: 'idle' } as const);
        return loadState(
          this.fetchCategoryBookings(category, beforeId).pipe(
            switchMap((rows) => {
              if (!rows.length) return of([] as EnrichedBookingItem[]);
              const uniqueListingIds = [...new Set(rows.map((r) => r.listing_id))];
              return forkJoin({
                details: forkJoin(
                  rows.map((r) =>
                    this.source.booking(r.id).pipe(catchError(() => of(null))),
                  ),
                ),
                listings: forkJoin(
                  uniqueListingIds.map((id) =>
                    resolveBookingListingMetadata(this.http, this.activities, id).pipe(
                      map((meta) => [id, meta] as const),
                    ),
                  ),
                ),
              }).pipe(
                map(({ details, listings }) => {
                  const listingMap = new Map<number, ResolvedBookingListing>(listings);
                  return rows.map((booking, index): EnrichedBookingItem => {
                    const detail = details[index];
                    const listing = listingMap.get(booking.listing_id) ?? null;
                    const payments = detail?.payments ?? [];
                    const latestPayment = payments.length
                      ? [...payments].sort((a, b) => b.attempt_no - a.attempt_no || b.id - a.id)[0]
                      : null;

                    return {
                      booking,
                      detail,
                      activity: listing?.activity ?? null,
                      listing,
                      latestPayment,
                      experienceTitle: listing?.title ?? `Activity #${booking.listing_id}`,
                      experienceLocation: listing?.location ?? '',
                      paymentMethodLabel:
                        latestPayment?.method === 'simulated'
                          ? 'Academic Demo Online Payment'
                          : latestPayment?.method === 'at_location'
                            ? 'Pay at Location'
                            : 'Not selected',
                      paymentStatus: latestPayment?.status ?? 'unpaid',
                    };
                  });
                }),
              );
            }),
          ),
        ).pipe(map((result) => (result.status === 'ready' ? { ...result, owner } : result)));
      }),
    ),
  );

  selectCategory(category: BookingCategoryTab): void {
    this.selectedCategory.set(category);
    this.page.set(1);
    this.beforeIdHistory.set([null]);
  }

  nextPage(items: EnrichedBookingItem[]): void {
    if (items.length < this.pageSize) return;
    const lastId = items[items.length - 1]?.booking.id;
    if (!lastId) return;
    this.beforeIdHistory.update((h) => [...h, lastId]);
    this.page.update((p) => p + 1);
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.beforeIdHistory.update((h) => h.slice(0, -1));
    this.page.update((p) => p - 1);
  }

  openAuthModal(): void {
    this.authModal.open('login', undefined, {
      type: 'navigation',
      resumeCallback: () => this.retry(),
    });
  }

  retry(): void {
    this.refresh.update((value) => value + 1);
  }
}
