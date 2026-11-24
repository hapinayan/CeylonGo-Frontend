import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { EcoDetail } from '../models/eco';
import { BookingSlot, Reservation } from '../models/travel';
import { EXPERIENCE_CATALOG } from '../services/catalog';
import { ReservationWriteLock } from '../services/reservation-write-lock';
import { TRAVEL_SOURCE } from '../services/travel-api';
import { TravelSession } from '../services/travel-session';
import { loadState, positiveId, publishDate } from '../services/workflow-state';

@Component({
  selector: 'app-experience-booking',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './booking-panel.html',
})
export class BookingPanel {
  readonly listing = input.required<EcoDetail>();
  readonly routeId = input.required<string>();
  readonly reviewMode = input(false);
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly session = inject(TravelSession);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly source = inject(TRAVEL_SOURCE);
  private readonly destroy = inject(DestroyRef);
  private readonly writeLock = inject(ReservationWriteLock);
  readonly firstDay = publishDate();
  readonly lastDay = publishDate(365);
  readonly form = new FormGroup({
    date: new FormControl('', {nonNullable: true, validators: Validators.required}),
    slot: new FormControl<number | null>(null, Validators.required),
    participants: new FormControl<number | null>(null, [Validators.required, Validators.pattern(/^[0-9]+$/)]),
    safety: new FormControl(false, {nonNullable: true}),
    ages: new FormArray<FormControl<number | null>>([]),
  });
  readonly day = signal('');
  readonly page = signal(1);
  private readonly refresh = signal(0);
  readonly review = signal<{slot: BookingSlot; day: string; participants: number; ages?: number[]; safety: boolean; account: ReturnType<TravelSession['account']>} | null>(null);
  readonly submitting = signal(false);
  readonly uncertain = signal(false);
  readonly error = signal('');
  readonly confirmed = signal<{row: Reservation; account: ReturnType<TravelSession['account']>} | null>(null);
  readonly mandatory = computed(() => (this.listing().safety_rules ?? []).some(rule => rule.is_mandatory));
  private readonly query = computed(() => ({id: this.listing().id, day: this.day(), page: this.page(), refresh: this.refresh()}));
  readonly slots = toSignal(toObservable(this.query).pipe(switchMap(({id, day, page}) =>
    day ? loadState(this.source.slots(id, day, page)) : of({status: 'idle'} as const),
  )));
  readonly estimate = computed(() => {
    const review = this.review();
    if (!review) return null;
    const listing = this.listing();
    if (listing.pricing_type === 'per_person') return Number(listing.base_price) * review.participants;
    return listing.pricing_type === 'per_group' ? Number(listing.base_price) : null;
  });

  constructor() {
    effect(() => {
      const listing = this.listing();
      const reviewMode = this.reviewMode();
      if (!this.catalog.preview) this.session.account();
      untracked(() => {
        const count = reviewMode ? Number(this.route.snapshot.queryParamMap.get('travelers')) : listing.min_participants;
        this.form.reset({participants: count >= listing.min_participants && count <= listing.max_group_size
          ? count : listing.min_participants});
        this.review.set(null);
        this.confirmed.set(null);
        this.uncertain.set(false);
        this.error.set('');
        this.form.controls.ages.clear();
        const day = reviewMode ? this.route.snapshot.queryParamMap.get('day') ?? '' : '';
        this.form.controls.date.setValue(day);
        this.form.controls.slot.setValue(reviewMode ? positiveId(this.route.snapshot.queryParamMap.get('slot') ?? '') : null);
        this.day.set(this.validDay(day) ? day : '');
        this.page.set(reviewMode ? positiveId(this.route.snapshot.queryParamMap.get('page') ?? '') ?? 1 : 1);
        this.syncAges();
      });
    });
  }

  validDay(day: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < this.firstDay || day > this.lastDay) return false;
    const timestamp = Date.parse(day + 'T00:00:00Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day;
  }

  chooseDay(day: string): void {
    this.review.set(null);
    this.form.controls.slot.reset();
    this.page.set(1);
    this.day.set(this.validDay(day) ? day : '');
    this.error.set(day && !this.day() ? 'Choose a date within the next 365 days.' : '');
  }

  syncAges(): void {
    const ages = this.form.controls.ages;
    const count = this.form.controls.participants.value ?? 0;
    const required = this.reviewMode() && this.listing().min_age && Number.isInteger(count)
      && count >= this.listing().min_participants && count <= Math.min(50, this.listing().max_group_size) ? count : 0;
    while (ages.length > required) ages.removeAt(ages.length - 1);
    while (ages.length < required) ages.push(new FormControl<number | null>(null, [
      Validators.required, Validators.min(this.listing().min_age ?? 0), Validators.max(100), Validators.pattern(/^[0-9]+$/),
    ]));
  }

  selectable(slot: BookingSlot): boolean {
    return slot.is_open && Date.parse(slot.starts_at) > Date.now() &&
      slot.available_places >= this.listing().min_participants;
  }

  refreshSlots(): void {
    this.form.controls.slot.reset();
    this.review.set(null);
    this.refresh.update(value => value + 1);
  }

  inspect(): void {
    this.error.set('');
    const state = this.slots();
    const {date, slot, participants, safety, ages} = this.form.getRawValue();
    const selected = state?.status === 'ready' ? state.data.find(item => item.id === slot) : undefined;
    if (!this.validDay(date) || !selected || !this.selectable(selected) || publishDate(0, Date.parse(selected.starts_at)) !== date || participants == null ||
        !Number.isInteger(participants) || participants < this.listing().min_participants ||
        participants > Math.min(this.listing().max_group_size, selected.available_places, 50)) {
      this.error.set('Choose a valid date and open slot, and enter a group size within the available capacity.');
      return;
    }
    if (!this.reviewMode()) {
      void this.router.navigate(['/experiences', this.routeId(), 'book'], {queryParams: {day: date, slot, travelers: participants, page: this.page()}});
      return;
    }
    if (this.form.invalid || (this.mandatory() && !safety)) {
      this.error.set('Complete the required ages and accept the mandatory safety rules.');
      this.form.markAllAsTouched();
      return;
    }
    this.review.set({slot: selected, day: date, participants, safety, account: this.session.account(),
      ages: ages.length ? ages.map(age => Number(age)) : undefined});
  }

  submit(): void {
    const review = this.review();
    const account = this.session.account();
    if (!review || this.submitting() || this.confirmed() || this.uncertain() || (!this.catalog.preview && (!account || review.account !== account))) return;
    if (!this.selectable(review.slot)) {
      this.refreshSlots();
      this.error.set('The selected slot has started or closed. Select another slot.');
      return;
    }
    const traveler = this.catalog.preview ? 'preview' : account!.id;
    if (!this.writeLock.start(traveler, review.slot.id)) {
      this.uncertain.set(true);
      this.error.set('A request for this slot is in progress or its result is unknown. Check My Experience Bookings.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const payload = {slot_id: review.slot.id, participants: review.participants, accepts_safety_rules: review.safety,
      ...(review.ages ? {participant_ages: review.ages} : {}),
      ...(this.listing().sponsored_tracking_token ? {sponsored_tracking_token: this.listing().sponsored_tracking_token!} : {})};
    this.source.reserve(payload).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: row => {
        this.writeLock.finish(traveler, review.slot.id);
        this.submitting.set(false);
        if (this.catalog.preview || this.session.account() === account) this.confirmed.set({row, account});
      },
      error: (error: HttpErrorResponse) => {
        if (error.status >= 400 && error.status < 500) this.writeLock.finish(traveler, review.slot.id);
        this.submitting.set(false);
        if (!this.catalog.preview && this.session.account() !== account) return;
        if (error.status === 404 || error.status === 409) {
          this.refreshSlots();
          this.error.set('This slot may no longer be available, or you already have a reservation. Check your bookings and choose an open slot.');
        } else if (error.status === 401 || error.status === 403) {
          this.error.set('A signed-in traveler account is required.');
        } else if (error.status === 422) {
          this.review.set(null);
          this.error.set('The reservation did not meet a listing requirement. Review the group details and safety rules.');
        } else {
          this.uncertain.set(true);
          this.error.set('The reservation result is unknown. Check My Experience Bookings before making another request.');
        }
      },
    });
  }
}
