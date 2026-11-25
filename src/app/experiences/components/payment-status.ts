import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { EXPERIENCE_CATALOG } from '../services/catalog';
import { TRAVEL_SOURCE } from '../services/travel-api';
import { TravelSession } from '../services/travel-session';
import { loadState } from '../services/workflow-state';

@Component({
  selector: 'app-experience-payment-status',
  imports: [DatePipe, DecimalPipe],
  template: `
    <section class="workflow-card">
      <h2>Payment status</h2>
      @if (state(); as result) {
        @if (result.status === 'loading') { <p role="status">Loading payment status…</p> }
        @if (result.status === 'error') { <p role="alert">Payment status could not be loaded.</p> }
        @if (result.status === 'ready' && (catalog.preview || result.owner === session.account())) {
          <p>{{ result.data.currency }} {{ result.data.total_price | number:'1.2-2' }} · {{ result.data.payment_method.replaceAll('_', ' ') }}</p>
          <div class="workflow-statuses">
            <span class="workflow-pill" [attr.data-status]="result.data.booking_status">Reservation: {{ result.data.booking_status }}</span>
            <span class="workflow-pill" [attr.data-status]="result.data.payment_status">Payment: {{ result.data.payment_status.replaceAll('_', ' ') }}</span>
          </div>
          @if (result.data.paid_at) { <p>Recorded payment time: {{ result.data.paid_at | date:'medium':'GMT+0530' }} (Sri Lanka time)</p> }
          @if (result.data.transaction_id != null) { <p>Transaction reference: {{ result.data.transaction_id }}</p> }
          @if (result.data.payment_status === 'pending') { <p>Payment is pending verification. Refresh to check for an update.</p> }
        }
      }
      <div class="workflow-actions">
        <button class="outline-control" type="button" (click)="retry()" [disabled]="state()?.status === 'loading'">Refresh payment status</button>
        <button class="outline-control" type="button" disabled>Online checkout unavailable</button>
      </div>
    </section>
  `,
})
export class ExperiencePaymentStatus {
  readonly bookingId = input.required<number>();
  readonly revision = input(0);
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly session = inject(TravelSession);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly refresh = signal(0);
  private readonly request = computed(() => ({
    id: this.bookingId(), owner: this.session.account(), refresh: this.refresh(), revision: this.revision(),
  }));
  readonly state = toSignal(toObservable(this.request).pipe(switchMap(({id, owner}) =>
    this.catalog.preview || owner ? loadState(this.source.payment(id)).pipe(map(result =>
      result.status === 'ready' ? {...result, owner} : result,
    )) : of({status: 'idle'} as const),
  )));

  retry(): void { this.refresh.update(value => value + 1); }
}
