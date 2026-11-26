import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { ActivityDetails, ActivitySlotDetails } from '../models/activity';
import { TRAVEL_SOURCE } from '../services/travel-api';
import { loadState, publishDate } from '../services/workflow-state';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-booking',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, ExperienceIcon],
  templateUrl: './booking-panel.html',
})
export class BookingPanel {
  readonly listing = input.required<ActivityDetails>();
  readonly routeId = input.required<string>();
  private readonly router = inject(Router);
  private readonly source = inject(TRAVEL_SOURCE);

  readonly firstDay = publishDate();
  readonly lastDay = publishDate(365);

  readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
    slot: new FormControl<number | null>(null, Validators.required),
    participants: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]+$/)],
    }),
  });

  readonly day = signal('');
  readonly participants = signal(1);
  private readonly refresh = signal(0);
  readonly error = signal('');

  readonly minParticipants = computed(() => this.listing().activity?.min_participants ?? 1);
  readonly maxParticipants = computed(() => this.listing().activity?.max_participants ?? 1);
  readonly hasScheduleSupport = computed(() => this.listing().activity !== null);

  private readonly query = computed(() => {
    const listing = this.listing();
    const day = this.day();
    const participants = this.participants();
    const min = this.minParticipants();
    const max = this.maxParticipants();
    if (!listing.activity || !day || !Number.isInteger(participants) || participants < min || participants > max) {
      return null;
    }
    return {
      id: listing.id,
      date: day,
      participants,
      refresh: this.refresh(),
    };
  });

  readonly slotsState = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) =>
        q
          ? loadState(this.source.slots(q.id, q.date, q.participants, 50, 0))
          : of({ status: 'idle' } as const),
      ),
    ),
  );

  readonly selectedSlot = computed<ActivitySlotDetails | null>(() => {
    const state = this.slotsState();
    const slotId = this.form.controls.slot.value;
    if (state?.status !== 'ready' || slotId == null) return null;
    return state.data.find((item) => item.id === slotId) ?? null;
  });

  readonly selectedSlotId = signal<number | null>(null);

  readonly activeSlot = computed<ActivitySlotDetails | null>(() => {
    const state = this.slotsState();
    const slotId = this.selectedSlotId();
    if (state?.status !== 'ready' || slotId == null) return null;
    return state.data.find((item) => item.id === slotId) ?? null;
  });

  readonly hasAvailableSlot = computed(() => {
    const state = this.slotsState();
    return state?.status === 'ready' && state.data.some((slot) => this.selectable(slot));
  });

  readonly canContinue = computed(() => {
    if (!this.hasScheduleSupport()) return false;
    const slot = this.activeSlot();
    const count = this.participants();
    return (
      this.slotsState()?.status === 'ready' &&
      slot != null &&
      this.selectable(slot) &&
      Number.isInteger(count) &&
      count >= this.minParticipants() &&
      count <= Math.min(this.maxParticipants(), slot.remaining_capacity)
    );
  });

  constructor() {
    effect(() => {
      const listing = this.listing();
      untracked(() => {
        const min = listing.activity?.min_participants ?? 1;
        this.form.reset({ date: '', slot: null, participants: min });
        this.day.set('');
        this.participants.set(min);
        this.selectedSlotId.set(null);
        this.error.set('');
      });
    });

    effect(() => {
      const state = this.slotsState();
      const currentId = this.selectedSlotId();
      if (state?.status === 'ready') {
        untracked(() => {
          if (currentId != null) {
            const found = state.data.find((s) => s.id === currentId);
            if (!found || !this.selectable(found)) {
              this.form.controls.slot.setValue(null);
              this.selectedSlotId.set(null);
            }
          }
        });
      }
    });
  }

  validDay(day: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < this.firstDay || day > this.lastDay) return false;
    const timestamp = Date.parse(day + 'T00:00:00Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day;
  }

  chooseDay(day: string): void {
    this.form.controls.slot.setValue(null);
    this.selectedSlotId.set(null);
    this.day.set(this.validDay(day) ? day : '');
    this.error.set(day && !this.day() ? 'Choose a valid date within the next 365 days.' : '');
  }

  onSlotSelect(rawId: string): void {
    const id = rawId ? Number(rawId) : null;
    const valid = id != null && Number.isInteger(id) && id > 0 ? id : null;
    this.form.controls.slot.setValue(valid);
    this.selectedSlotId.set(valid);
    this.error.set('');
  }

  onParticipantsInput(rawValue: string): void {
    const parsed = Number(rawValue);
    const min = this.minParticipants();
    const max = this.maxParticipants();
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      this.error.set(`Enter a participant count between ${min} and ${max}.`);
      return;
    }
    this.error.set('');
    this.participants.set(parsed);
  }

  decrementParticipants(): void {
    const min = this.minParticipants();
    const current = this.participants();
    if (current > min) {
      const next = current - 1;
      this.form.controls.participants.setValue(next);
      this.participants.set(next);
      this.error.set('');
    }
  }

  incrementParticipants(): void {
    const max = this.maxParticipants();
    const current = this.participants();
    if (current < max) {
      const next = current + 1;
      this.form.controls.participants.setValue(next);
      this.participants.set(next);
      this.error.set('');
    }
  }

  selectable(slot: ActivitySlotDetails): boolean {
    return (
      slot.available &&
      slot.remaining_capacity >= this.participants() &&
      Date.parse(slot.starts_at) > Date.now()
    );
  }

  refreshSlots(): void {
    this.form.controls.slot.setValue(null);
    this.selectedSlotId.set(null);
    this.refresh.update((value) => value + 1);
  }

  continueToBooking(): void {
    this.error.set('');
    if (!this.hasScheduleSupport()) {
      this.error.set('This activity cannot be booked online until its schedule is configured.');
      return;
    }

    const date = this.day();
    const count = this.participants();
    const slot = this.activeSlot();
    if (
      !this.validDay(date) ||
      !slot ||
      !this.selectable(slot) ||
      !Number.isInteger(count) ||
      count < this.minParticipants() ||
      count > Math.min(this.maxParticipants(), slot.remaining_capacity)
    ) {
      this.error.set('Choose a valid date and open slot within the remaining capacity.');
      return;
    }

    void this.router.navigate(['/experiences', this.routeId(), 'book'], {
      queryParams: {
        day: date,
        slot: slot.id,
        travelers: count,
      },
    });
  }
}
