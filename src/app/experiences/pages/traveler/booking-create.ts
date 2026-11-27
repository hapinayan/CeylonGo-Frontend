import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';

import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { TravelerBackNavigationService } from '../../../core/services/traveler-back-navigation.service';
import { ExperienceIcon } from '../../components/icon';
import {
  ActivityBookingCreateRequest,
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityDetails,
  ActivityPaymentResponse,
  ActivitySlotDetails,
} from '../../models/activity';
import {
  ActivitiesApi,
  activityImageUrl,
  extractApiErrorMessage,
  formatDurationMinutes,
  formatLocation,
  newRequestKey,
} from '../../services/activities-api';
import { ReservationWriteLock } from '../../services/reservation-write-lock';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { loadState, positiveId, publishDate } from '../../services/workflow-state';

@Component({
  selector: 'app-booking-create',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    ExperienceIcon,
  ],
  templateUrl: './booking-create.html',
  styleUrls: ['../discover/discover.scss', './traveler.scss', './booking-create.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BookingCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly activities = inject(ActivitiesApi);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  readonly session = inject(TravelSession);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly writeLock = inject(ReservationWriteLock);
  private readonly backNav = inject(TravelerBackNavigationService, { optional: true });
  private readonly cleanupBackConfirmation = this.destroy.onDestroy(() =>
    this.backNav?.clearBookingConfirmed('/experiences'),
  );

  readonly firstDay = publishDate();
  readonly lastDay = publishDate(365);

  readonly refreshListing = signal(0);
  readonly refreshSlotsCount = signal(0);
  readonly step = signal<1 | 2 | 3>(1);
  readonly isEditing = signal<boolean>(false);

  readonly day = signal<string>('');
  readonly slotId = signal<number | null>(null);
  readonly travelers = signal<number>(1);

  readonly acceptSafetyRules = signal<boolean>(false);
  readonly paymentMethod = signal<'at_location' | 'simulated'>('at_location');
  readonly simulateOutcome = signal<'success' | 'failure'>('success');
  readonly paymentAttemptNo = signal<number>(1);

  readonly bookingRequestKey = signal<string>(newRequestKey());
  readonly paymentRequestKey = signal<string>(newRequestKey());
  private lastSubmittedPayloadSignature = '';

  readonly submitting = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly paymentError = signal<string>('');
  readonly createdBooking = signal<ActivityBookingResponse | null>(null);
  readonly confirmedBooking = signal<ActivityBookingDetailResponse | null>(null);
  readonly recordedPayment = signal<ActivityPaymentResponse | null>(null);
  readonly imageFailed = signal<boolean>(false);

  readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      toObservable(this.refreshListing),
    ]).pipe(
      switchMap(([id]) => {
        const key = positiveId(id);
        if (!key) return of({ status: 'error', code: 404 } as const);
        return loadState(this.activities.detail(key)).pipe(
          map((result) => (result.status === 'ready' ? { ...result, id } : result)),
        );
      }),
    ),
  );

  readonly listing = computed<ActivityDetails | null>(() => {
    const s = this.state();
    return s && s.status === 'ready' ? s.data : null;
  });

  readonly isNotFoundError = computed<boolean>(() => {
    const s = this.state();
    return Boolean(s && 'code' in s && s.code === 404);
  });

  readonly routeId = computed<string>(() => {
    const s = this.state();
    return s && s.status === 'ready' ? s.id : '';
  });

  readonly minParticipants = computed(() => this.listing()?.activity?.min_participants ?? 1);
  readonly maxParticipants = computed(() => this.listing()?.activity?.max_participants ?? 1);
  readonly durationLabel = computed(
    () => formatDurationMinutes(this.listing()?.activity?.duration_minutes) ?? 'Not specified',
  );
  readonly locationLabel = computed(() => {
    const l = this.listing();
    return l ? formatLocation(l.locality, l.district) : '';
  });

  private readonly slotsQuery = computed(() => {
    const l = this.listing();
    const d = this.day();
    const p = this.travelers();
    const min = this.minParticipants();
    const max = this.maxParticipants();
    const r = this.refreshSlotsCount();
    if (!l || !l.activity || !d || !Number.isInteger(p) || p < min || p > max) return null;
    return { id: l.id, day: d, participants: p, refresh: r };
  });

  readonly slotsState = toSignal(
    toObservable(this.slotsQuery).pipe(
      switchMap((q) =>
        q
          ? loadState(this.source.slots(q.id, q.day, q.participants, 50, 0))
          : of({ status: 'idle' } as const),
      ),
    ),
  );

  readonly slots = computed<ActivitySlotDetails[]>(() => {
    const s = this.slotsState();
    return s && s.status === 'ready' ? s.data : [];
  });

  readonly slotsLoading = computed<boolean>(() => this.slotsState()?.status === 'loading');
  readonly slotsError = computed<boolean>(() => this.slotsState()?.status === 'error');

  readonly selectedSlot = computed<ActivitySlotDetails | undefined>(() => {
    const sList = this.slots();
    const id = this.slotId();
    return sList.find((item) => item.id === id);
  });

  readonly maxAllowedTravelers = computed<number>(() => {
    const l = this.listing();
    const s = this.selectedSlot();
    if (!l?.activity) return 1;
    const maxP = l.activity.max_participants;
    return s ? Math.min(maxP, Math.max(l.activity.min_participants, s.remaining_capacity)) : maxP;
  });

  readonly hasSafetyConsentRequirement = computed<boolean>(() => {
    const meta = this.listing()?.activity;
    return Boolean(meta && (meta.safety_instructions || meta.restrictions));
  });

  readonly serverTotal = computed<string | null>(() => {
    const slot = this.selectedSlot();
    if (slot && this.isSlotSelectable(slot)) {
      return String(slot.total_amount);
    }
    const created = this.createdBooking();
    return created ? String(created.total_amount) : null;
  });

  readonly coverUrl = computed<string | undefined>(() => {
    if (this.imageFailed()) return undefined;
    const firstImg = this.listing()?.photos?.[0]?.image_url;
    return activityImageUrl(firstImg);
  });

  readonly formattedDate = computed<string>(() => {
    const d = this.day();
    if (!d || !this.validDay(d)) return 'Date not selected';
    const [year, month, day] = d.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  });

  readonly formattedTimeSlot = computed<string>(() => {
    const s = this.selectedSlot();
    const source = s ?? this.createdBooking();
    if (!source) return 'No time slot selected';
    const start = new Date(source.starts_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    });
    const end = new Date(source.ends_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    });
    return `${start} – ${end} (Sri Lanka Time)`;
  });

  readonly travelerProfile = computed(() => this.authService.currentUser());

  readonly isBookingValid = computed<boolean>(() => {
    const l = this.listing();
    if (!l || !l.activity) return false;
    if (this.createdBooking()) return Boolean(this.session.account());
    if (!this.validDay(this.day())) return false;
    const s = this.selectedSlot();
    if (!s || !this.isSlotSelectable(s)) return false;
    const count = this.travelers();
    if (
      !Number.isInteger(count) ||
      count < l.activity.min_participants ||
      count > Math.min(l.activity.max_participants, s.remaining_capacity)
    ) {
      return false;
    }
    if (this.hasSafetyConsentRequirement() && !this.acceptSafetyRules()) return false;
    return true;
  });

  readonly confirmationHeading = computed<string>(() => {
    const conf = this.confirmedBooking();
    if (conf?.status === 'confirmed') return 'Booking Confirmed';
    return 'Booking Request Submitted — Awaiting Provider Confirmation';
  });

  readonly confirmedPayment = computed<ActivityPaymentResponse | null>(() => {
    const conf = this.confirmedBooking();
    if (conf?.payments?.length) {
      return conf.payments[conf.payments.length - 1];
    }
    return this.recordedPayment();
  });

  constructor() {
    if (this.authService.isAuthenticated() && !this.authService.currentUser()) {
      this.authService.getCurrentUser().subscribe({ error: () => {} });
    }

    effect(() => {
      const l = this.listing();
      if (!l) return;
      untracked(() => {
        const queryParams = this.route.snapshot.queryParamMap;
        const qDay = queryParams.get('day') ?? '';
        const qSlot = positiveId(queryParams.get('slot') ?? '');
        const qTravelers = Number(queryParams.get('travelers'));

        if (this.validDay(qDay)) {
          this.day.set(qDay);
        } else {
          this.day.set(this.firstDay);
          this.isEditing.set(true);
        }

        if (qSlot) {
          this.slotId.set(qSlot);
        } else {
          this.isEditing.set(true);
        }

        const min = l.activity?.min_participants ?? 1;
        const max = l.activity?.max_participants ?? 1;
        const count =
          Number.isInteger(qTravelers) && qTravelers >= min && qTravelers <= max
            ? qTravelers
            : min;
        this.travelers.set(count);
      });
    });

    effect(() => {
      const sList = this.slots();
      const currentSlotId = this.slotId();
      if (sList.length > 0 && !this.createdBooking()) {
        untracked(() => {
          if (
            !currentSlotId ||
            !sList.some((s) => s.id === currentSlotId && this.isSlotSelectable(s))
          ) {
            const firstOpen = sList.find((s) => this.isSlotSelectable(s));
            this.slotId.set(firstOpen ? firstOpen.id : null);
          }
        });
      }
    });
  }

  retryListing(): void {
    this.refreshListing.update((v) => v + 1);
  }

  validDay(day: string): boolean {
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const [year, month, d] = day.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, d));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === d &&
      day >= this.firstDay &&
      day <= this.lastDay
    );
  }

  isSlotSelectable(slot: ActivitySlotDetails): boolean {
    return (
      slot.available &&
      slot.remaining_capacity >= this.travelers() &&
      Date.parse(slot.starts_at) > Date.now()
    );
  }

  private resetBookingKeyIfModified(): void {
    if (!this.createdBooking()) {
      this.bookingRequestKey.set(newRequestKey());
      this.lastSubmittedPayloadSignature = '';
    }
  }

  startEditing(): void {
    if (this.createdBooking()) return;
    this.isEditing.set(true);
    this.error.set('');
  }

  saveEditing(): void {
    if (!this.validDay(this.day())) {
      this.error.set('Please select a valid upcoming date.');
      return;
    }
    const slot = this.selectedSlot();
    if (!slot || !this.isSlotSelectable(slot)) {
      this.error.set('Please select an available time slot.');
      return;
    }
    this.isEditing.set(false);
    this.error.set('');
  }

  onDateChange(newDate: string): void {
    if (this.createdBooking()) return;
    if (this.validDay(newDate)) {
      this.day.set(newDate);
      this.slotId.set(null);
      this.error.set('');
      this.resetBookingKeyIfModified();
    } else {
      this.error.set('Please select a valid upcoming date within the next year.');
    }
  }

  onSlotChange(newSlotId: string | number): void {
    if (this.createdBooking()) return;
    const id = Number(newSlotId);
    if (id) {
      this.slotId.set(id);
      this.error.set('');
      this.resetBookingKeyIfModified();
    }
  }

  decrementTravelers(): void {
    if (this.createdBooking()) return;
    const min = this.minParticipants();
    const current = this.travelers();
    if (current > min) {
      this.travelers.set(current - 1);
      this.resetBookingKeyIfModified();
    }
  }

  incrementTravelers(): void {
    if (this.createdBooking()) return;
    const max = this.maxAllowedTravelers();
    const current = this.travelers();
    if (current < max) {
      this.travelers.set(current + 1);
      this.resetBookingKeyIfModified();
    }
  }

  retrySlots(): void {
    this.refreshSlotsCount.update((v) => v + 1);
  }

  selectPaymentMethod(method: 'at_location' | 'simulated'): void {
    this.paymentMethod.set(method);
    this.paymentError.set('');
    this.paymentRequestKey.set(newRequestKey());
  }

  setSimulateOutcome(outcome: 'success' | 'failure'): void {
    this.simulateOutcome.set(outcome);
    this.paymentError.set('');
    this.paymentRequestKey.set(newRequestKey());
  }

  openAuthModal(): void {
    this.authModalService.open('login', undefined, {
      type: 'booking',
      resumeCallback: () => {
        if (this.authService.isAuthenticated() && !this.authService.currentUser()) {
          this.authService.getCurrentUser().subscribe({ error: () => {} });
        }
      },
    });
  }

  continueToPayment(): void {
    this.error.set('');
    this.paymentError.set('');

    if (!this.session.account()) {
      this.authModalService.open('login', undefined, {
        type: 'booking',
        resumeCallback: () => {
          if (this.session.account()) {
            this.continueToPayment();
          }
        },
      });
      return;
    }

    const existingBooking = this.createdBooking();
    if (existingBooking) {
      this.submitPayment(existingBooking);
      return;
    }

    if (!this.isBookingValid()) {
      if (this.hasSafetyConsentRequirement() && !this.acceptSafetyRules()) {
        this.error.set('Please acknowledge the safety instructions and requirements to continue.');
      } else if (!this.selectedSlot()) {
        this.error.set('Please select an available time slot.');
      } else {
        this.error.set('Please ensure all booking details are valid and within remaining capacity.');
      }
      return;
    }

    const l = this.listing()!;
    const slot = this.selectedSlot()!;
    const account = this.session.account()!;

    if (!this.writeLock.start(account.id, slot.id)) {
      this.error.set(
        'A booking request for this slot is already in progress. Please wait or check My Bookings.',
      );
      return;
    }

    this.submitting.set(true);

    // Step A: Revalidate slot, remaining capacity, and server-calculated quote before creating booking
    this.source
      .slots(l.id, this.day(), this.travelers(), 50, 0)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (freshSlots) => {
          const freshSlot = freshSlots.find((s) => s.id === slot.id);
          if (!freshSlot || !this.isSlotSelectable(freshSlot)) {
            this.writeLock.finish(account.id, slot.id);
            this.submitting.set(false);
            this.retrySlots();
            this.error.set(
              'The selected slot is no longer available for the chosen participants. Please choose another open slot.',
            );
            return;
          }

          if (String(freshSlot.total_amount) !== String(slot.total_amount)) {
            this.writeLock.finish(account.id, slot.id);
            this.submitting.set(false);
            this.retrySlots();
            this.bookingRequestKey.set(newRequestKey());
            this.error.set(
              `The server-calculated total changed to ${freshSlot.currency} ${freshSlot.total_amount}. Please review the updated total and submit again.`,
            );
            return;
          }

          const payloadSignature = `${l.id}:${freshSlot.id}:${freshSlot.starts_at}:${freshSlot.ends_at}:${this.travelers()}:${freshSlot.total_amount}`;
          if (
            this.lastSubmittedPayloadSignature &&
            this.lastSubmittedPayloadSignature !== payloadSignature
          ) {
            this.bookingRequestKey.set(newRequestKey());
          }
          this.lastSubmittedPayloadSignature = payloadSignature;

          const payload: ActivityBookingCreateRequest = {
            listing_id: l.id,
            slot_id: freshSlot.id,
            starts_at: freshSlot.starts_at,
            ends_at: freshSlot.ends_at,
            quantity: this.travelers(),
            expected_total: String(freshSlot.total_amount),
            request_key: this.bookingRequestKey(),
          };

          // Step B: Create pending booking on POST /api/v1/bookings
          this.source
            .reserve(payload)
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe({
              next: (booking) => {
                this.writeLock.finish(account.id, slot.id);
                this.createdBooking.set(booking);
                this.step.set(2);
                this.submitPayment(booking);
              },
              error: (err: HttpErrorResponse) => {
                this.writeLock.finish(account.id, slot.id);
                this.submitting.set(false);
                if (err.status === 401 || err.status === 403) {
                  this.error.set(
                    extractApiErrorMessage(
                      err,
                      'Your session expired. Please sign in as a traveler to complete your booking.',
                    ),
                  );
                  this.openAuthModal();
                  return;
                }
                if (err.status === 404 || err.status === 409) {
                  this.retrySlots();
                  this.bookingRequestKey.set(newRequestKey());
                  this.error.set(
                    extractApiErrorMessage(
                      err,
                      'This slot is unavailable or conflicts with an existing booking. Availability has been refreshed.',
                    ),
                  );
                  return;
                }
                if (err.status === 422 || err.status === 400) {
                  this.bookingRequestKey.set(newRequestKey());
                  this.error.set(
                    extractApiErrorMessage(
                      err,
                      'The booking details did not pass server validation.',
                    ),
                  );
                  return;
                }
                // Preserve bookingRequestKey on 0/5xx so retrying replays the identical request
                this.error.set(
                  extractApiErrorMessage(
                    err,
                    'Unable to confirm booking creation. You may safely retry with the same selection or check My Bookings.',
                  ),
                );
              },
            });
        },
        error: (err: HttpErrorResponse) => {
          this.writeLock.finish(account.id, slot.id);
          this.submitting.set(false);
          this.error.set(
            extractApiErrorMessage(
              err,
              'Could not revalidate slot availability before booking. Please try again.',
            ),
          );
        },
      });
  }

  private submitPayment(booking: ActivityBookingResponse): void {
    this.submitting.set(true);
    this.paymentError.set('');

    if (this.paymentMethod() === 'simulated') {
      const attempt = this.paymentAttemptNo();
      const outcome = this.simulateOutcome();

      this.source
        .simulatePayment({
          booking_id: booking.id,
          request_key: this.paymentRequestKey(),
          attempt_no: attempt,
          simulate_outcome: outcome,
        })
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (payment) => {
            this.recordedPayment.set(payment);
            if (payment.status === 'demo_succeeded') {
              this.finalizeConfirmation(booking);
            } else {
              this.submitting.set(false);
              this.paymentAttemptNo.update((n) => n + 1);
              this.paymentRequestKey.set(newRequestKey());
              this.paymentError.set(
                `Simulated payment attempt #${attempt} failed (demo_failed). Booking ${booking.booking_reference ?? 'ACT-' + booking.id} remains pending — retry with attempt #${this.paymentAttemptNo()} or switch to Pay at Location without creating a duplicate booking.`,
              );
            }
          },
          error: (err: HttpErrorResponse) => {
            this.submitting.set(false);
            if (err.status === 401 || err.status === 403) {
              this.paymentError.set(
                extractApiErrorMessage(err, 'Session expired. Please sign in and retry payment.'),
              );
              this.openAuthModal();
              return;
            }
            if (err.status === 409) {
              this.syncBookingPaymentsAfterConflict(booking.id, err);
              return;
            }
            if (err.status >= 400 && err.status < 500) {
              this.paymentRequestKey.set(newRequestKey());
            }
            this.paymentError.set(
              extractApiErrorMessage(
                err,
                'Simulated payment could not be processed. You can safely retry.',
              ),
            );
          },
        });
    } else {
      this.source
        .payAtLocation({
          booking_id: booking.id,
          request_key: this.paymentRequestKey(),
        })
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (payment) => {
            this.recordedPayment.set(payment);
            this.finalizeConfirmation(booking);
          },
          error: (err: HttpErrorResponse) => {
            this.submitting.set(false);
            if (err.status === 401 || err.status === 403) {
              this.paymentError.set(
                extractApiErrorMessage(err, 'Session expired. Please sign in and retry.'),
              );
              this.openAuthModal();
              return;
            }
            if (err.status === 409) {
              this.syncBookingPaymentsAfterConflict(booking.id, err);
              return;
            }
            this.paymentError.set(
              extractApiErrorMessage(
                err,
                'Could not record Pay at Location selection. Please retry.',
              ),
            );
          },
        });
    }
  }

  private syncBookingPaymentsAfterConflict(bookingId: number, err: HttpErrorResponse): void {
    this.source
      .booking(bookingId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((detail) => {
        if (detail) {
          const accepted = detail.payments.find(
            (p) => p.status === 'demo_succeeded' || p.status === 'unpaid',
          );
          if (accepted) {
            this.recordedPayment.set(accepted);
            this.confirmedBooking.set(detail);
            this.step.set(3);
            return;
          }
          const maxAttempt = detail.payments.reduce((m, p) => Math.max(m, p.attempt_no), 0);
          this.paymentAttemptNo.set(maxAttempt + 1);
          this.paymentRequestKey.set(newRequestKey());
        }
        this.paymentError.set(
          extractApiErrorMessage(err, 'Payment state changed. Please review and retry.'),
        );
      });
  }

  private finalizeConfirmation(booking: ActivityBookingResponse): void {
    this.source
      .booking(booking.id)
      .pipe(
        catchError(() =>
          of<ActivityBookingDetailResponse>({
            ...booking,
            payments: this.recordedPayment() ? [this.recordedPayment()!] : [],
          }),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((authoritative) => {
        this.confirmedBooking.set(authoritative);
        this.step.set(3);
        this.backNav?.markBookingConfirmed('/experiences');
        this.submitting.set(false);
      });
  }
}
