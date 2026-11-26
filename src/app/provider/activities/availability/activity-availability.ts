import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ACTIVITY_CATEGORIES,
  ActivityMetadataPayload,
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  HomestayBookingDetails,
  ReviewListing,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider-preview.service';

@Component({
  selector: 'app-activity-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './activity-availability.html',
  styleUrl: './activity-availability.scss',
})
export class ActivityAvailability implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingSlots = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly activities = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  readonly bookings = signal<HomestayBookingDetails[]>([]);
  readonly filterDate = signal<string>('');

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly selectedActivity = computed(() => {
    const id = this.selectedListingId();
    return this.activities().find((a) => a.listing.id === id) || null;
  });

  readonly activityMeta = computed<Partial<ActivityMetadataPayload>>(() => {
    const rev = this.selectedActivity();
    return (rev?.details?.['activity'] || {}) as Partial<ActivityMetadataPayload>;
  });

  readonly minParticipants = computed(() =>
    Math.max(1, Number(this.activityMeta().min_participants) || 1)
  );
  readonly maxParticipants = computed(() =>
    Math.max(this.minParticipants(), Number(this.activityMeta().max_participants) || 10)
  );

  readonly filteredSlots = computed(() => {
    const dateFilter = this.filterDate().trim();
    const list = this.slots();
    if (!dateFilter) return list;
    return list.filter((s) => this.slotSriLankaDate(s.starts_at) === dateFilter);
  });

  // Slot Editor Form
  editingSlotId: number | null = null;
  slotDate = this.defaultFutureDate();
  slotStartTime = '08:00';
  slotEndTime = '11:00';
  slotCapacity = 8;
  slotIsOpen = true;

  // Routine LKR price editor (routine price update preserves approval)
  routinePrice: number | null = null;
  isSavingPrice = false;

  ngOnInit(): void {
    const queryId = Number(this.route.snapshot.queryParamMap.get('listingId'));
    this.loadActivities(Number.isInteger(queryId) && queryId > 0 ? queryId : null);
  }

  loadActivities(preferredId: number | null = null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      listings: this.providerService.getProviderListings(100, 0, 'adventure'),
      bookings: this.providerService.getProviderBookings(undefined, 'adventure'),
    }).subscribe({
      next: ({ listings, bookings }) => {
        this.activities.set(listings);
        this.bookings.set(bookings);
        this.isLoading.set(false);

        if (listings.length > 0) {
          const match = preferredId
            ? listings.find((l) => l.listing.id === preferredId)
            : undefined;
          const target = match || listings[0];
          this.selectListing(target.listing.id);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(err, 'Failed to load adventure activities.')
        );
      },
    });
  }

  selectListing(listingId: number): void {
    const numId = Number(listingId);
    if (!Number.isInteger(numId) || numId <= 0) return;

    this.selectedListingId.set(numId);
    this.editingSlotId = null;
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const rev = this.selectedActivity();
    this.slotCapacity = this.maxParticipants();
    this.routinePrice = rev?.listing?.price ? Number(rev.listing.price) : null;

    this.loadSlots(numId);
  }

  loadSlots(listingId: number): void {
    this.isLoadingSlots.set(true);
    this.providerService.getAvailabilitySlots(listingId, 100, 0).subscribe({
      next: (slots) => {
        const sorted = [...slots].sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at)
        );
        this.slots.set(sorted);
        this.isLoadingSlots.set(false);
      },
      error: (err) => {
        this.isLoadingSlots.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(err, 'Failed to load availability slots.')
        );
      },
    });
  }

  categoryLabel(review: ReviewListing): string {
    const slug = review.details?.['activity']?.category;
    return ACTIVITY_CATEGORIES.find((c) => c.slug === slug)?.label || 'Adventure';
  }

  reservedSeats(slotId: number): number {
    const listingId = this.selectedListingId();
    return this.bookings()
      .filter(
        (b) =>
          b.listing_id === listingId &&
          b.slot_id === slotId &&
          (b.status === 'pending' || b.status === 'confirmed')
      )
      .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  }

  remainingCapacity(slot: AvailabilitySlotResponse): number {
    return Math.max(0, Number(slot.capacity) - this.reservedSeats(slot.id));
  }

  startEditSlot(slot: AvailabilitySlotResponse): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editingSlotId = slot.id;
    const { date, startTime, endTime } = this.parseSlotDateTimes(
      slot.starts_at,
      slot.ends_at
    );
    this.slotDate = date;
    this.slotStartTime = startTime;
    this.slotEndTime = endTime;
    this.slotCapacity = slot.capacity;
    this.slotIsOpen = slot.is_open;
  }

  cancelEdit(): void {
    this.editingSlotId = null;
    this.slotCapacity = this.maxParticipants();
    this.slotIsOpen = true;
    this.errorMessage.set(null);
  }

  saveSlot(): void {
    const activity = this.selectedActivity();
    if (!activity) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isPreview()) {
      this.errorMessage.set('Slot creation and edits are disabled in Preview Mode.');
      return;
    }

    if (activity.verification_status === 'suspended') {
      this.errorMessage.set('Suspended listings cannot modify availability.');
      return;
    }

    const unitId = activity.listing.units?.[0]?.id;
    if (!unitId) {
      this.errorMessage.set(
        'Activity participant unit is not initialized yet. Complete Location & Meeting Point in the wizard first.'
      );
      return;
    }

    if (!this.slotDate || !this.slotStartTime || !this.slotEndTime) {
      this.errorMessage.set('Date, start time, and end time are required.');
      return;
    }

    const startsAt = `${this.slotDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = `${this.slotDate}T${this.slotEndTime}:00+05:30`;

    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      this.errorMessage.set('End time must be after start time.');
      return;
    }

    if (new Date(startsAt).getTime() <= Date.now()) {
      this.errorMessage.set('Slot start time must be in the future.');
      return;
    }

    const cap = Number(this.slotCapacity);
    const minP = this.minParticipants();
    const maxP = this.maxParticipants();
    if (this.slotIsOpen && (cap < minP || cap > maxP)) {
      this.errorMessage.set(
        `Open slot capacity must be between ${minP} and ${maxP} participants.`
      );
      return;
    }

    const payload: AvailabilitySlotCreate = {
      unit_id: unitId,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: cap,
      is_open: this.slotIsOpen,
    };

    this.isSaving.set(true);
    const listingId = activity.listing.id;

    if (this.editingSlotId !== null) {
      this.providerService
        .updateAvailabilitySlot(listingId, this.editingSlotId, payload)
        .subscribe({
          next: (updated) => {
            this.isSaving.set(false);
            this.slots.update((list) =>
              list
                .map((s) => (s.id === updated.id ? updated : s))
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            );
            this.editingSlotId = null;
            this.successMessage.set('Availability slot updated.');
          },
          error: (err) => {
            this.isSaving.set(false);
            this.errorMessage.set(
              this.extractErrorMessage(err, 'Failed to update slot.')
            );
          },
        });
    } else {
      this.providerService.addAvailabilitySlot(listingId, payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.slots.update((list) =>
            [...list, created].sort((a, b) =>
              a.starts_at.localeCompare(b.starts_at)
            )
          );
          this.successMessage.set('New availability slot created.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to add slot.')
          );
        },
      });
    }
  }

  toggleSlotOpen(slot: AvailabilitySlotResponse): void {
    const activity = this.selectedActivity();
    if (!activity || this.isPreview()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSaving.set(true);

    this.providerService
      .updateAvailabilitySlot(activity.listing.id, slot.id, {
        unit_id: slot.unit_id,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        capacity: slot.capacity,
        is_open: !slot.is_open,
      })
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.slots.update((list) =>
            list.map((s) => (s.id === updated.id ? updated : s))
          );
          this.successMessage.set(
            updated.is_open ? 'Slot reopened for travelers.' : 'Slot blocked.'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Could not change slot status.')
          );
        },
      });
  }

  saveRoutinePrice(): void {
    if (this.isPreview()) {
      this.errorMessage.set('Price updates are disabled in Preview Mode.');
      return;
    }
    const activity = this.selectedActivity();
    if (!activity || !this.routinePrice || Number(this.routinePrice) <= 0) {
      this.errorMessage.set('Enter a valid positive price in LKR.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSavingPrice = true;

    this.providerService
      .updateListingDraft(activity.listing.id, {
        price: Number(this.routinePrice),
      })
      .subscribe({
        next: (updated) => {
          this.isSavingPrice = false;
          this.activities.update((list) =>
            list.map((a) => (a.listing.id === updated.listing.id ? updated : a))
          );
          this.successMessage.set(
            'Price per participant updated (routine pricing updates preserve approval).'
          );
        },
        error: (err) => {
          this.isSavingPrice = false;
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to update price.')
          );
        },
      });
  }

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-LK', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  slotSriLankaDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  private parseSlotDateTimes(
    startsAt: string,
    endsAt: string
  ): { date: string; startTime: string; endTime: string } {
    const parse = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return { date: this.defaultFutureDate(), time: '08:00' };
      }
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
      return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        time: `${get('hour')}:${get('minute')}`,
      };
    };

    const s = parse(startsAt);
    const e = parse(endsAt);
    return { date: s.date, startTime: s.time, endTime: e.time };
  }

  private defaultFutureDate(): string {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d?.msg || String(d)).join('; ');
    }
    return err?.message || fallback;
  }
}
