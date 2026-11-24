import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { TravelerHeader } from '../../components/traveler-header';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, DatePipe, DecimalPipe],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell"><app-traveler-header />
    <main class="discover traveler-workflow">
      <a routerLink="/experiences">Back to Discover</a>
      <h1>My Experience Bookings</h1>
      @if (catalog.preview) { <p>Development preview · Sample reservations.</p> }
      @if (!catalog.preview && !session.account()) {
        <p>Sign in to view your bookings.</p><a routerLink="/auth" class="outline-control">Sign in</a>
      } @else if (state(); as result) {
        @if (result.status === 'loading') { <p role="status" class="workflow-state">Loading reservations…</p> }
        @if (result.status === 'error') {
          <p role="alert">Could not load bookings.</p><button class="outline-control" (click)="retry()">Retry</button>
        }
        @if (result.status === 'ready' && (catalog.preview || result.owner === session.account())) {
          @for (row of result.data; track row.id) {
            <article class="workflow-card">
              <h2>{{ row.reference }}</h2>
              <p>{{ row.starts_at | date:'medium':'GMT+0530' }} (Sri Lanka time) · {{ row.participants }} travelers</p>
              <div class="workflow-statuses">
                <span class="workflow-pill" [attr.data-status]="row.status">Reservation: {{ row.status }}</span>
                <span class="workflow-pill" [attr.data-status]="row.payment_status">Payment: {{ row.payment_status.replaceAll('_', ' ') }}</span>
              </div>
              <p>{{ row.currency }} {{ row.total | number:'1.2-2' }}</p>
              <a [routerLink]="['/experiences/bookings', row.id]">View reservation {{ row.reference }}</a>
            </article>
          } @empty { <p>No reservations on this page.</p> }
          <nav class="workflow-actions" aria-label="Booking pages">
            <button class="outline-control" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
            <span aria-live="polite">Page {{ page() }}</span>
            <button class="outline-control" [disabled]="result.data.length < pageSize" (click)="page.set(page() + 1)">Next</button>
          </nav>
        }
      }
    </main></div>
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
