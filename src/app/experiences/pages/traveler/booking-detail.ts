import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, tap } from 'rxjs';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { Footer } from '../../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { ExperienceIcon } from '../../components/icon';
import { ExperiencePaymentStatus } from '../../components/payment-status';
import { TravelerHeader } from '../../components/traveler-header';
import { ActivityBookingDetailResponse, ActivityDetails } from '../../models/activity';
import { ActivitiesApi, extractApiErrorMessage } from '../../services/activities-api';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState, positiveId } from '../../services/workflow-state';
import {
  ResolvedBookingListing,
  resolveBookingListingMetadata,
} from './booking-listing-metadata';

interface BookingDetailView {
  booking: ActivityBookingDetailResponse;
  activity: ActivityDetails | null;
  listing: ResolvedBookingListing;
  locationLabel: string;
}

@Component({
  imports: [
    TravelerHeader,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    ExperiencePaymentStatus,
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
        <a routerLink="/experiences/bookings" class="workflow-back-link">
          <app-experience-icon name="previous" /> Back to My Experience Bookings
        </a>

        <div class="workflow-page-header">
          <h1>Booking details</h1>
          <p class="workflow-lead-p">View your booking status, schedule, and recorded payment information.</p>
        </div>

        @if (!session.account()) {
          <div class="workflow-card signin-prompt">
            <p>Sign in with your traveler account to view this booking.</p>
            <button type="button" class="outline-control workflow-primary" (click)="openAuthModal()">
              Sign in
            </button>
          </div>
        } @else if (state(); as result) {
          @if (message()) {
            <p role="status" class="workflow-state">{{ message() }}</p>
          }

          @if (result.status === 'loading') {
            <p role="status" class="workflow-state">Loading booking…</p>
          } @else if (result.status === 'error') {
            @if (result.code === 404 || result.code === 403) {
              <div class="workflow-state" role="alert">
                <p>Booking unavailable.</p>
                <a routerLink="/experiences/bookings" class="outline-control">Back to Bookings</a>
              </div>
            } @else {
              <div class="workflow-state" role="alert">
                <p>Could not load this booking.</p>
                <button type="button" class="outline-control" (click)="retry()">Retry</button>
              </div>
            }
          } @else if (result.status === 'ready' && result.owner === session.account()) {
            @let row = result.data.booking;

            <section class="workflow-card booking-detail-card">
              <div class="card-header-row">
                <div class="booking-ref-badge">
                  <span class="ref-label">Booking Reference</span>
                  <h2>{{ row.booking_reference || ('ACT-' + row.id) }}</h2>
                </div>
                <div class="workflow-statuses">
                  <span class="workflow-pill" [attr.data-status]="row.status">
                    Status: {{ row.status }}
                  </span>
                </div>
              </div>

              @if (row.status === 'pending') {
                <p class="workflow-state" role="status" style="margin-top: 0;">
                  Booking Request Submitted — Awaiting Provider Confirmation
                </p>
              } @else if (row.status === 'confirmed') {
                <p class="workflow-state" role="status" style="margin-top: 0;">
                  Booking Confirmed
                </p>
              }

              <div class="detail-info-grid">
                <div class="info-block">
                  <span class="info-label">{{ result.data.listing.isRental ? 'Rental Vehicle' : 'Experience' }}</span>
                  <strong>{{ result.data.listing.title }}</strong>
                  @if (result.data.locationLabel) {
                    <span style="font-size: 0.85rem; color: #64748b;">{{ result.data.locationLabel }}</span>
                  }
                </div>
                <div class="info-block">
                  <span class="info-label"><app-experience-icon name="calendar" /> {{ result.data.listing.isRental ? 'Pickup & Return' : 'Date & Time' }}</span>
                  <strong>
                    {{ row.starts_at | date:'medium':'GMT+0530' }} – {{ result.data.listing.isRental ? (row.ends_at | date:'medium':'GMT+0530') : (row.ends_at | date:'shortTime':'GMT+0530') }}
                    (Sri Lanka time)
                  </strong>
                </div>
                <div class="info-block">
                  <span class="info-label"><app-experience-icon name="group" /> {{ result.data.listing.isRental ? 'Rental Duration' : 'Participants' }}</span>
                  @if (result.data.listing.isRental) {
                    <strong>{{ row.quantity }} {{ row.quantity === 1 ? 'day' : 'days' }}</strong>
                  } @else {
                    <strong>{{ row.quantity }} {{ row.quantity === 1 ? 'participant' : 'participants' }}</strong>
                  }
                </div>
                <div class="info-block">
                  <span class="info-label">Total Amount</span>
                  <strong class="total-price">{{ row.currency }} {{ row.total_amount | number:'1.2-2' }}</strong>
                </div>
              </div>

              @if (result.data.listing.isRental) {
                <div class="workflow-state" style="text-align: left; margin-top: 1rem;">
                  <strong>Rental Requirements &amp; Pickup Notes</strong>
                  <p style="margin: 0.35rem 0 0; font-size: 0.88rem; color: #475569;">
                    @if (result.data.listing.isMotorizedRental) {
                      Valid motorcycle driving licence (or International Driving Permit) and national ID/passport required at pickup.
                    } @else {
                      No driving licence required for this bicycle. Present a valid national ID or passport at pickup.
                    }
                  </p>
                </div>
              }

              <div class="detail-actions-bar">
                @if (result.data.listing.viewRoute; as viewRoute) {
                  <a [routerLink]="viewRoute" class="outline-control">
                    {{ result.data.listing.viewLabel }}
                  </a>
                }

                @if (canCancel(row)) {
                  <button
                    #trigger
                    type="button"
                    class="outline-control btn-danger"
                    [disabled]="cancelling() || checkRequired()"
                    (click)="reason.reset(); dialog.showModal()"
                  >
                    Cancel booking
                  </button>

                  <dialog
                    #dialog
                    aria-labelledby="cancel-reservation-heading"
                    (close)="trigger.focus()"
                    (cancel)="cancelling() && $event.preventDefault()"
                  >
                    <form class="workflow-form" (submit)="$event.preventDefault(); cancel(row, dialog)">
                      <h2 id="cancel-reservation-heading">Cancel this booking?</h2>
                      <p>Pending and confirmed bookings can be cancelled according to CeylonGo rules.</p>
                      <label>
                        Reason (optional)
                        <textarea
                          rows="3"
                          maxlength="500"
                          [formControl]="reason"
                          placeholder="Please let the provider know why you are cancelling..."
                        ></textarea>
                      </label>
                      <div class="workflow-actions">
                        <button
                          class="outline-control"
                          type="button"
                          [disabled]="cancelling()"
                          (click)="dialog.close()"
                        >
                          Keep booking
                        </button>
                        <button
                          class="outline-control workflow-primary btn-confirm-cancel"
                          type="submit"
                          [disabled]="cancelling() || reason.invalid || checkRequired()"
                        >
                          {{ cancelling() ? 'Cancelling…' : 'Confirm cancellation' }}
                        </button>
                      </div>
                    </form>
                  </dialog>
                } @else {
                  <p class="cancellation-note">
                    @if (row.status === 'cancelled' || row.status === 'rejected' || row.status === 'completed') {
                      This booking is {{ row.status }} and can no longer be cancelled.
                    } @else {
                      Cancellation is unavailable for this booking.
                    }
                  </p>
                }

                @if (checkRequired()) {
                  <button type="button" class="outline-control" (click)="retry()">Refresh booking</button>
                }
              </div>
            </section>

            <app-experience-payment-status
              [booking]="row"
              [refreshing]="state()?.status === 'loading'"
              (refreshRequest)="retry()"
            />
          }
        }
      </main>
      <app-footer />
      <app-traveler-auth-modal />
    </div>
  `,
})
export class BookingDetail {
  readonly session = inject(TravelSession);
  private readonly http = inject(HttpClient);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly activities = inject(ActivitiesApi);
  private readonly authModal = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);

  readonly reason = new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) });
  readonly cancelling = signal(false);
  readonly checkRequired = signal(false);
  readonly message = signal('');
  readonly refresh = signal(0);

  private readonly scope = computed(() => ({
    owner: this.session.account(),
    refresh: this.refresh(),
  }));

  readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map((params) => positiveId(params.get('bookingId') ?? ''))),
      toObservable(this.scope),
    ]).pipe(
      switchMap(([id, { owner }]) => {
        if (!owner) return of({ status: 'idle' } as const);
        if (!id) return of({ status: 'error', code: 404 } as const);

        return loadState(
          this.source.booking(id).pipe(
            switchMap((booking) =>
              resolveBookingListingMetadata(this.http, this.activities, booking.listing_id).pipe(
                map(
                  (listing): BookingDetailView => ({
                    booking,
                    activity: listing.activity,
                    listing,
                    locationLabel: listing.location,
                  }),
                ),
              ),
            ),
          ),
        ).pipe(
          tap((result) => {
            if (result.status === 'ready' && owner === this.session.account()) {
              this.checkRequired.set(false);
            }
          }),
          map((result) => (result.status === 'ready' ? { ...result, owner } : result)),
        );
      }),
    ),
  );

  canCancel(row: ActivityBookingDetailResponse): boolean {
    return row.status === 'pending' || row.status === 'confirmed';
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

  cancel(row: ActivityBookingDetailResponse, dialog: HTMLDialogElement): void {
    const account = this.session.account();
    if (!account || !this.canCancel(row) || this.cancelling() || this.checkRequired() || this.reason.invalid) {
      return;
    }
    this.cancelling.set(true);
    this.message.set('');
    this.source
      .cancel(row.id, this.reason.value)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (fresh) => {
          this.cancelling.set(false);
          if (this.session.account() !== account) return;
          dialog.close();
          this.message.set(`Booking status updated to ${fresh.status}.`);
          this.retry();
        },
        error: (error: HttpErrorResponse) => {
          this.cancelling.set(false);
          if (this.session.account() !== account) return;
          dialog.close();
          if (error.status === 0 || error.status >= 500) {
            this.checkRequired.set(true);
            this.message.set(
              'The cancellation result is unknown. Refresh this booking before trying again.',
            );
          } else {
            this.message.set(
              extractApiErrorMessage(
                error,
                'Cancellation could not be completed. Refreshing booking status.',
              ),
            );
            if ([400, 403, 404, 409].includes(error.status)) {
              this.retry();
            }
          }
        },
      });
  }
}
