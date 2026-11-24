import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, tap } from 'rxjs';
import { ExperiencePaymentStatus } from '../../components/payment-status';
import { TravelerHeader } from '../../components/traveler-header';
import { Reservation } from '../../models/travel';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState, positiveId } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule, ExperiencePaymentStatus],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell"><app-traveler-header />
    <main class="discover traveler-workflow">
      <a routerLink="/experiences/bookings">Back to My Experience Bookings</a>
      <h1>Reservation details</h1>
      @if (catalog.preview) { <p>Development preview · Sample reservation and payment status.</p> }
      @if (!catalog.preview && !session.account()) {
        <p>Sign in to view this reservation.</p><a routerLink="/auth" class="outline-control">Sign in</a>
      } @else if (state(); as result) {
        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (result.status === 'loading') { <p role="status" class="workflow-state">Loading reservation…</p> }
        @if (result.status === 'error') {
          @if (result.code === 404 || result.code === 403) { <p>Reservation unavailable.</p> }
          @else { <p role="alert">Could not load this reservation.</p><button class="outline-control" (click)="retry()">Retry</button> }
        }
        @if (result.status === 'ready' && (catalog.preview || result.owner === session.account())) {
          @let row = result.data;
          <section class="workflow-card">
            <h2>{{ row.reference }}</h2>
            @if (experienceLink(row); as id) { <a [routerLink]="['/experiences', id]">View experience</a> }
            <p>{{ row.starts_at | date:'medium':'GMT+0530' }} (Sri Lanka time) · {{ row.participants }} travelers</p>
            <p>Reservation: {{ row.status }} · Payment: {{ row.payment_status.replaceAll('_', ' ') }}</p>
            <p>Reservation total: {{ row.currency }} {{ row.total | number:'1.2-2' }}</p>
            @if (canCancel(row)) {
              <button #trigger type="button" class="outline-control" [disabled]="cancelling() || checkRequired()"
                (click)="reason.reset(); dialog.showModal()">Cancel reservation</button>
              <dialog #dialog aria-labelledby="cancel-reservation-heading"
                (close)="trigger.focus()" (cancel)="cancelling() && $event.preventDefault()">
                <form class="workflow-form" (submit)="$event.preventDefault(); cancel(row, dialog)">
                  <h2 id="cancel-reservation-heading">Cancel this reservation?</h2>
                  <p>The backend checks the cancellation window and current reservation status.</p>
                  <label>Reason (optional) <textarea rows="3" maxlength="500" [formControl]="reason"></textarea></label>
                  <div class="workflow-actions">
                    <button class="outline-control" type="button" [disabled]="cancelling()" (click)="dialog.close()">Keep reservation</button>
                    <button class="outline-control" type="submit" [disabled]="cancelling() || reason.invalid || checkRequired()">{{ cancelling() ? 'Cancelling…' : 'Confirm cancellation' }}</button>
                  </div>
                </form>
              </dialog>
            } @else { <p>Cancellation is currently unavailable through this page.</p> }
            @if (checkRequired()) { <button class="outline-control" (click)="retry()">Refresh reservation</button> }
          </section>
          <app-experience-payment-status [bookingId]="row.id" [revision]="refresh()" />
        }
      }
    </main></div>
  `,
})
export class BookingDetail {
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly session = inject(TravelSession);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly reason = new FormControl('', {nonNullable: true, validators: Validators.maxLength(500)});
  readonly cancelling = signal(false);
  readonly checkRequired = signal(false);
  readonly message = signal('');
  readonly refresh = signal(0);
  private readonly scope = computed(() => ({owner: this.session.account(), refresh: this.refresh()}));
  readonly state = toSignal(combineLatest([
    this.route.paramMap.pipe(map(params => positiveId(params.get('bookingId') ?? ''))), toObservable(this.scope),
  ]).pipe(switchMap(([id, {owner}]) => {
    if (!this.catalog.preview && !owner) return of({status: 'idle'} as const);
    if (!id) return of({status: 'error', code: 404} as const);
    return loadState(this.source.booking(id)).pipe(
      tap(result => {
        if (result.status === 'ready' && (this.catalog.preview || owner === this.session.account())) this.checkRequired.set(false);
      }),
      map(result => result.status === 'ready' ? {...result, owner} : result),
    );
  })));

  experienceLink(row: Reservation): string | undefined {
    return this.catalog.preview ? this.catalog.experiences[row.experience_id - 1]?.id : String(row.experience_id);
  }

  canCancel(row: Reservation): boolean {
    return ['pending', 'confirmed'].includes(row.status) && row.payment_status === 'unpaid' &&
      Date.parse(row.starts_at) > Date.now();
  }

  retry(): void { this.refresh.update(value => value + 1); }

  cancel(row: Reservation, dialog: HTMLDialogElement): void {
    const account = this.session.account();
    if ((!account && !this.catalog.preview) || !this.canCancel(row) || this.cancelling() || this.checkRequired() || this.reason.invalid) return;
    this.cancelling.set(true);
    this.message.set('');
    this.source.cancel(row.id, this.reason.value).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: fresh => {
        this.cancelling.set(false);
        if (!this.catalog.preview && this.session.account() !== account) return;
        dialog.close();
        this.message.set('Reservation status: ' + fresh.status + '.');
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.cancelling.set(false);
        if (!this.catalog.preview && this.session.account() !== account) return;
        dialog.close();
        if (error.status === 0 || error.status >= 500) {
          this.checkRequired.set(true);
          this.message.set('The cancellation result is unknown. Refresh this reservation before trying again.');
        } else {
          this.message.set('Cancellation could not be completed. The reservation may be outside its cancellation window.');
          if ([403, 404, 409].includes(error.status)) this.retry();
        }
      },
    });
  }
}
