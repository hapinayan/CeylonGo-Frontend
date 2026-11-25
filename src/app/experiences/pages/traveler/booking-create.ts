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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { Footer } from '../../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { ExperienceIcon } from '../../components/icon';
import { TravelerHeader } from '../../components/traveler-header';
import { EcoDetail } from '../../models/eco';
import { BookingSlot, Reservation } from '../../models/travel';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { EcoApi, ecoImageUrl } from '../../services/eco-api';
import { ReservationWriteLock } from '../../services/reservation-write-lock';
import { BOOKABLE_PREVIEW, TRAVEL_SOURCE } from '../../services/travel-api';
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
    TravelerHeader,
    ExperienceIcon,
    Footer,
    TravelerAuthModal,
  ],
  templateUrl: './booking-create.html',
  styleUrls: ['../discover/discover.scss', './traveler.scss', './booking-create.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BookingCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly eco = inject(EcoApi);
  private readonly sample = inject(BOOKABLE_PREVIEW);
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  readonly session = inject(TravelSession);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly writeLock = inject(ReservationWriteLock);

  readonly firstDay = publishDate();
  readonly lastDay = publishDate(365);

  readonly refreshListing = signal(0);
  readonly refreshSlotsCount = signal(0);
  readonly step = signal<1 | 2 | 3>(1);
  readonly isEditing = signal<boolean>(false);

  readonly day = signal<string>('');
  readonly slotId = signal<number | null>(null);
  readonly travelers = signal<number>(1);
  readonly page = signal<number>(1);

  readonly fullName = signal<string>('');
  readonly email = signal<string>('');
  readonly phone = signal<string>('');
  readonly specialRequests = signal<string>('');

  readonly acceptSafetyRules = signal<boolean>(false);
  readonly paymentMethod = signal<'pay_at_location' | 'online'>('pay_at_location');

  readonly submitting = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly confirmedReservation = signal<Reservation | null>(null);
  readonly imageFailed = signal<boolean>(false);

  readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      toObservable(this.refreshListing),
    ]).pipe(
      switchMap(([id]) => {
        if (this.catalog.preview) {
          const listing = this.sample(id);
          return of(
            listing
              ? ({ status: 'ready', data: listing, id } as const)
              : ({ status: 'error', code: 404 } as const)
          );
        }
        const key = positiveId(id);
        if (!key) return of({ status: 'error', code: 404 } as const);
        return loadState(this.eco.detail(key)).pipe(
          map((result) => (result.status === 'ready' ? { ...result, id } : result))
        );
      })
    )
  );

  readonly listing = computed<EcoDetail | null>(() => {
    const s = this.state();
    return s && s.status === 'ready' ? s.data : null;
  });

  readonly isNotFoundError = computed<boolean>(() => {
    const s = this.state();
    return Boolean(s && 'code' in s && s.code === 404);
  });

  retryListing(): void {
    this.refreshListing.update((v) => v + 1);
  }

  readonly routeId = computed<string>(() => {
    const s = this.state();
    return s && s.status === 'ready' ? s.id : '';
  });

  private readonly slotsQuery = computed(() => {
    const l = this.listing();
    const d = this.day();
    const p = this.page();
    const r = this.refreshSlotsCount();
    return l && d ? { id: l.id, day: d, page: p, refresh: r } : null;
  });

  readonly slotsState = toSignal(
    toObservable(this.slotsQuery).pipe(
      switchMap((q) =>
        q ? loadState(this.source.slots(q.id, q.day, q.page)) : of({ status: 'idle' } as const)
      )
    )
  );

  readonly slots = computed<BookingSlot[]>(() => {
    const s = this.slotsState();
    return s && s.status === 'ready' ? s.data : [];
  });

  readonly slotsLoading = computed<boolean>(() => this.slotsState()?.status === 'loading');
  readonly slotsError = computed<boolean>(() => this.slotsState()?.status === 'error');

  readonly selectedSlot = computed<BookingSlot | undefined>(() => {
    const sList = this.slots();
    const id = this.slotId();
    return sList.find((item) => item.id === id);
  });

  readonly maxAllowedTravelers = computed<number>(() => {
    const l = this.listing();
    const s = this.selectedSlot();
    if (!l) return 1;
    return Math.min(l.max_group_size, s ? s.available_places : l.max_group_size, 50);
  });

  readonly hasMandatorySafety = computed<boolean>(() =>
    (this.listing()?.safety_rules ?? []).some((r) => r.is_mandatory)
  );

  readonly subtotal = computed<number>(() => {
    const l = this.listing();
    if (!l) return 0;
    const base = Number(l.base_price) || 0;
    return l.pricing_type === 'per_person' ? base * this.travelers() : base;
  });

  readonly total = computed<number>(() => this.subtotal());

  readonly coverUrl = computed<string | undefined>(() => {
    if (this.imageFailed()) return undefined;
    const l = this.listing();
    const firstImg = l?.images?.[0]?.image_url;
    return firstImg ? ecoImageUrl(firstImg) : undefined;
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
    if (!s) return 'No time slot selected';
    const start = new Date(s.starts_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    });
    const end = new Date(s.ends_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    });
    return `${start} – ${end} (Sri Lanka Time)`;
  });

  readonly isBookingValid = computed<boolean>(() => {
    const l = this.listing();
    if (!l) return false;
    if (!this.validDay(this.day())) return false;
    const s = this.selectedSlot();
    if (!s || !this.isSlotSelectable(s)) return false;
    const count = this.travelers();
    if (count < l.min_participants || count > this.maxAllowedTravelers()) return false;
    if (!this.fullName().trim() || !this.email().trim() || !this.email().includes('@')) return false;
    if (this.hasMandatorySafety() && !this.acceptSafetyRules()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      const l = this.listing();
      if (!l) return;
      untracked(() => {
        const queryParams = this.route.snapshot.queryParamMap;
        const qDay = queryParams.get('day') ?? '';
        const qSlot = positiveId(queryParams.get('slot') ?? '');
        const qTravelers = Number(queryParams.get('travelers'));
        const qPage = positiveId(queryParams.get('page') ?? '') || 1;

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

        const count =
          Number.isInteger(qTravelers) &&
          qTravelers >= l.min_participants &&
          qTravelers <= l.max_group_size
            ? qTravelers
            : l.min_participants;
        this.travelers.set(count);
        this.page.set(qPage);

        const user = this.authService.currentUser();
        if (user) {
          if (!this.fullName()) this.fullName.set(user.full_name || '');
          if (!this.email()) this.email.set(user.email || '');
        }
      });
    });

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        untracked(() => {
          if (!this.fullName()) this.fullName.set(user.full_name || '');
          if (!this.email()) this.email.set(user.email || '');
        });
      }
    });

    effect(() => {
      const sList = this.slots();
      const currentSlotId = this.slotId();
      if (sList.length > 0) {
        untracked(() => {
          if (!currentSlotId || !sList.some((s) => s.id === currentSlotId && this.isSlotSelectable(s))) {
            const firstOpen = sList.find((s) => this.isSlotSelectable(s));
            if (firstOpen) {
              this.slotId.set(firstOpen.id);
            }
          }
        });
      }
    });
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

  isSlotSelectable(slot: BookingSlot): boolean {
    return (
      slot.is_open &&
      Date.parse(slot.starts_at) > Date.now() &&
      slot.available_places >= (this.listing()?.min_participants ?? 1)
    );
  }

  startEditing(): void {
    this.isEditing.set(true);
    this.error.set('');
  }

  saveEditing(): void {
    if (!this.validDay(this.day())) {
      this.error.set('Please select a valid upcoming date.');
      return;
    }
    if (!this.selectedSlot()) {
      this.error.set('Please select an available time slot.');
      return;
    }
    this.isEditing.set(false);
    this.error.set('');
  }

  onDateChange(newDate: string): void {
    if (this.validDay(newDate)) {
      this.day.set(newDate);
      this.slotId.set(null);
      this.page.set(1);
      this.error.set('');
    } else {
      this.error.set('Please select a valid upcoming date within the next year.');
    }
  }

  onSlotChange(newSlotId: string | number): void {
    const id = Number(newSlotId);
    if (id) {
      this.slotId.set(id);
      this.error.set('');
    }
  }

  decrementTravelers(): void {
    const l = this.listing();
    if (!l) return;
    const current = this.travelers();
    if (current > l.min_participants) {
      this.travelers.set(current - 1);
    }
  }

  incrementTravelers(): void {
    const current = this.travelers();
    if (current < this.maxAllowedTravelers()) {
      this.travelers.set(current + 1);
    }
  }

  retrySlots(): void {
    this.refreshSlotsCount.update((v) => v + 1);
  }

  openAuthModal(): void {
    this.authModalService.open('login', undefined, {
      type: 'booking',
      resumeCallback: () => {
        const user = this.authService.currentUser();
        if (user) {
          if (!this.fullName()) this.fullName.set(user.full_name);
          if (!this.email()) this.email.set(user.email);
        }
      },
    });
  }

  continueToPayment(): void {
    this.error.set('');
    if (!this.isBookingValid()) {
      if (!this.fullName().trim() || !this.email().trim()) {
        this.error.set('Please provide your full name and a valid email address.');
      } else if (this.hasMandatorySafety() && !this.acceptSafetyRules()) {
        this.error.set('Please accept the mandatory safety rules to continue.');
      } else if (!this.selectedSlot()) {
        this.error.set('Please select an open time slot.');
      } else {
        this.error.set('Please ensure all booking details are complete and within capacity limits.');
      }
      return;
    }

    const slot = this.selectedSlot()!;
    const l = this.listing()!;

    if (!this.catalog.preview && !this.authService.isAuthenticated()) {
      this.authModalService.open('login', undefined, {
        type: 'booking',
        resumeCallback: () => {
          const user = this.authService.currentUser();
          if (user) {
            if (!this.fullName()) this.fullName.set(user.full_name);
            if (!this.email()) this.email.set(user.email);
          }
          this.continueToPayment();
        },
      });
      return;
    }

    const user = this.authService.currentUser();
    const travelerId = this.catalog.preview ? 'preview' : (user?.id ?? 'preview');

    if (!this.writeLock.start(travelerId, slot.id)) {
      this.error.set(
        'A booking request for this slot is already in progress. Please check My Experience Bookings.'
      );
      return;
    }

    this.submitting.set(true);

    const payload = {
      slot_id: slot.id,
      participants: this.travelers(),
      accepts_safety_rules: this.acceptSafetyRules(),
      ...(l.sponsored_tracking_token ? { sponsored_tracking_token: l.sponsored_tracking_token } : {}),
    };

    this.source
      .reserve(payload)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (reservation) => {
          this.writeLock.finish(travelerId, slot.id);
          this.submitting.set(false);
          this.confirmedReservation.set(reservation);
          this.step.set(3);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status >= 400 && err.status < 500) {
            this.writeLock.finish(travelerId, slot.id);
          }
          this.submitting.set(false);
          if (err.status === 404 || err.status === 409) {
            this.retrySlots();
            this.error.set(
              'This time slot may no longer be available, or you already have an existing reservation. Please choose an open slot.'
            );
          } else if (err.status === 401 || err.status === 403) {
            this.error.set('A signed-in traveler account is required to complete this reservation.');
          } else if (err.status === 422) {
            this.error.set(
              'The reservation did not meet the listing requirements. Please verify group size and safety requirements.'
            );
          } else {
            this.error.set(
              'The reservation request could not be processed. Please check My Experience Bookings before trying again.'
            );
          }
        },
      });
  }
}
