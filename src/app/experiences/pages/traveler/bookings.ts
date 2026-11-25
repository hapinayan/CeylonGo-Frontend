import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ExperienceIcon } from '../../components/icon';
import { TravelerHeader } from '../../components/traveler-header';
import { Footer } from '../../../shared/components/footer/footer';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, DatePipe, DecimalPipe, ExperienceIcon, Footer],
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
          <h1>My Experience Bookings</h1>
          <p class="workflow-lead-p">Manage and view details for all your booked activities across Sri Lanka.</p>
        </div>

        @if (catalog.preview) {
          <p class="workflow-note">Development preview · Sample reservations.</p>
        }

        @if (!catalog.preview && !session.account()) {
          <div class="workflow-card signin-prompt">
            <h2>Sign in to view your bookings</h2>
            <p>You need to be logged in to access your activity reservations and payment receipts.</p>
            <a routerLink="/auth" class="outline-control workflow-primary">Sign in</a>
          </div>
        } @else if (state(); as result) {
          @if (result.status === 'loading') {
            <p role="status" class="workflow-state">Loading reservations…</p>
          }
          @if (result.status === 'error') {
            <div class="workflow-state" role="alert">
              <p>Could not load bookings.</p>
              <button class="outline-control" (click)="retry()">Retry</button>
            </div>
          }
          @if (result.status === 'ready' && (catalog.preview || result.owner === session.account())) {
            <div class="bookings-list">
              @for (row of result.data; track row.id) {
                <article class="workflow-card booking-item-card">
                  <div class="card-header-row">
                    <div class="booking-ref-badge">
                      <span class="ref-label">Reference</span>
                      <h2>{{ row.reference }}</h2>
                    </div>
                    <div class="workflow-statuses">
                      <span class="workflow-pill" [attr.data-status]="row.status">Reservation: {{ row.status }}</span>
                      <span class="workflow-pill" [attr.data-status]="row.payment_status">Payment: {{ row.payment_status.replaceAll('_', ' ') }}</span>
                    </div>
                  </div>

                  <div class="booking-item-body">
                    <p class="booking-time">
                      <app-experience-icon name="calendar" />
                      <span>{{ row.starts_at | date:'medium':'GMT+0530' }} (Sri Lanka time) · {{ row.participants }} travelers</span>
                    </p>
                    <div class="booking-price-row">
                      <span class="price-val">{{ row.currency }} {{ row.total | number:'1.2-2' }}</span>
                      <a [routerLink]="['/experiences/bookings', row.id]" class="outline-control btn-view-booking">
                        View reservation {{ row.reference }}
                      </a>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="workflow-card empty-bookings-card">
                  <app-experience-icon name="mountain" class="empty-icon" />
                  <h3>No reservations on this page.</h3>
                  <p>You haven't made any experience bookings yet. Explore top Sri Lankan adventures today!</p>
                  <a routerLink="/experiences" class="outline-control workflow-primary" style="margin-top: 1rem;">Explore Experiences</a>
                </div>
              }
            </div>

            @if (result.data.length > 0 || page() > 1) {
              <nav class="workflow-actions booking-pagination" aria-label="Booking pages">
                <button class="outline-control" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
                <span aria-live="polite">Page {{ page() }}</span>
                <button class="outline-control" [disabled]="result.data.length < pageSize" (click)="page.set(page() + 1)">Next</button>
              </nav>
            }
          }
        }
      </main>
      <app-footer />
    </div>
  `,
})
export class MyExperienceBookings {
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly session = inject(TravelSession);
  private readonly source = inject(TRAVEL_SOURCE);
  readonly page = signal(1);
  readonly pageSize = 8;
  private readonly refresh = signal(0);
  private readonly request = computed(() => ({ owner: this.session.account(), page: this.page(), refresh: this.refresh() }));
  readonly state = toSignal(toObservable(this.request).pipe(switchMap(({owner, page}) =>
    this.catalog.preview || owner ? loadState(this.source.bookings(page, this.pageSize)).pipe(
      map(result => result.status === 'ready' ? {...result, owner} : result),
    ) : of({status: 'idle'} as const),
  )));
  retry(): void { this.refresh.update(value => value + 1); }
}
