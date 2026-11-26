import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  GuidePackageDetails,
  HomestayBookingDetails,
  ReviewListing,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider-preview.service';

@Component({
  selector: 'app-tour-guide-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tour-guide-availability.html',
  styleUrl: './tour-guide-availability.scss',
})
export class TourGuideAvailability implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingSlots = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly guides = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);
  readonly packages = signal<GuidePackageDetails[]>([]);
  readonly filterPackageId = signal<number | 'all'>('all');
  readonly filterDate = signal<string>('');
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  readonly bookings = signal<HomestayBookingDetails[]>([]);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly selectedGuide = computed(() => {
    const id = this.selectedListingId();
    return this.guides().find((g) => g.listing.id === id) || null;
  });

  readonly activePackages = computed(() =>
    this.packages().filter((p) => p.is_active)
  );

  readonly filteredSlots = computed(() => {
    const pkgFilter = this.filterPackageId();
    const dateFilter = this.filterDate().trim();
    return this.slots().filter((slot) => {
      if (pkgFilter !== 'all' && slot.unit_id !== Number(pkgFilter)) {
        return false;
      }
      if (dateFilter && this.slotSriLankaDate(slot.starts_at) !== dateFilter) {
        return false;
      }
      return true;
    });
  });

  // Slot Editor state
  editingSlotId: number | null = null;
  editorPackageId: number | null = null;
  slotDate = this.defaultFutureDate();
  slotStartTime = '08:00';
  slotEndTime = '12:00';
  slotCapacity = 6;
  slotIsOpen = true;

  private preferredPackageId: number | null = null;

  ngOnInit(): void {
    const listingId = Number(this.route.snapshot.queryParamMap.get('listingId'));
    const pkgId = Number(this.route.snapshot.queryParamMap.get('packageId'));
    this.preferredPackageId = Number.isInteger(pkgId) && pkgId > 0 ? pkgId : null;
    this.loadGuides(Number.isInteger(listingId) && listingId > 0 ? listingId : null);
  }

  loadGuides(preferredId: number | null = null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      listings: this.providerService.getProviderListings(100, 0, 'guide'),
      bookings: this.providerService.getProviderBookings(undefined, 'guide'),
    })
      .pipe(
        catchError((err) => {
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to load guide availability data.')
          );
          return of({ listings: [] as ReviewListing[], bookings: [] as HomestayBookingDetails[] });
        })
      )
      .subscribe(({ listings, bookings }) => {
        this.guides.set(listings);
        this.bookings.set(bookings);
        this.isLoading.set(false);
        if (listings.length > 0) {
          const matched = preferredId
            ? listings.find((l) => l.listing.id === preferredId)
            : undefined;
          const target = matched || listings[0];
          this.selectListing(target.listing.id);
        }
      });
  }

  selectListing(listingId: number): void {
    const numId = Number(listingId);
    if (!Number.isInteger(numId) || numId <= 0) return;

    this.selectedListingId.set(numId);
    this.editingSlotId = null;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loadGuideSchedule(numId);
  }

  loadGuideSchedule(listingId: number): void {
    this.isLoadingSlots.set(true);
    forkJoin({
      packages: this.providerService.getGuidePackages(listingId).pipe(
        catchError(() => of([] as GuidePackageDetails[]))
      ),
      slots: this.providerService.getAvailabilitySlots(listingId, 100, 0).pipe(
        catchError((err) => {
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to load guide availability slots.')
          );
          return of([] as AvailabilitySlotResponse[]);
        })
      ),
    }).subscribe(({ packages, slots }) => {
      this.packages.set(packages);
      this.slots.set(
        [...slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      );

      const active = packages.filter((p) => p.is_active);
      if (this.preferredPackageId && packages.some((p) => p.id === this.preferredPackageId)) {
        this.filterPackageId.set(this.preferredPackageId);
        this.editorPackageId = this.preferredPackageId;
        this.preferredPackageId = null;
      } else if (active.length > 0) {
        this.editorPackageId = active[0].id;
      } else {
        this.editorPackageId = null;
      }

      this.syncTimesForSelectedPackage();
      this.isLoadingSlots.set(false);
    });
  }

  onPackageOrStartTimeChange(): void {
    this.syncTimesForSelectedPackage();
  }

  private syncTimesForSelectedPackage(): void {
    const pkg = this.packages().find((p) => p.id === Number(this.editorPackageId));
    if (!pkg) return;
    if (!this.editingSlotId) {
      this.slotCapacity = pkg.max_people;
    }
    if (!this.slotStartTime) return;
    const [h, m] = this.slotStartTime.split(':').map(Number);
    const total = h * 60 + m + Math.round(Number(pkg.duration_hours) * 60);
    if (!Number.isNaN(total) && total < 24 * 60) {
      this.slotEndTime = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
        total % 60
      ).padStart(2, '0')}`;
    }
  }

  startEditSlot(slot: AvailabilitySlotResponse): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editingSlotId = slot.id;
    this.editorPackageId = slot.unit_id;
    const parsed = this.parseSlotDateTimes(slot.starts_at, slot.ends_at);
    this.slotDate = parsed.date;
    this.slotStartTime = parsed.startTime;
    this.slotEndTime = parsed.endTime;
    this.slotCapacity = slot.capacity;
    this.slotIsOpen = slot.is_open;
  }

  cancelEdit(): void {
    this.editingSlotId = null;
    this.slotIsOpen = true;
    this.syncTimesForSelectedPackage();
    this.errorMessage.set(null);
  }

  saveSlot(): void {
    const guide = this.selectedGuide();
    if (!guide) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isPreview()) {
      this.errorMessage.set('Slot creation and updates are disabled in Preview Mode.');
      return;
    }
    if (guide.verification_status === 'suspended') {
      this.errorMessage.set('Suspended listings cannot modify availability.');
      return;
    }
    const pkg = this.packages().find((p) => p.id === Number(this.editorPackageId));
    if (!pkg || !pkg.is_active) {
      this.errorMessage.set('Select an active tour package first.');
      return;
    }
    if (!this.slotDate || !this.slotStartTime) {
      this.errorMessage.set('Date and start time are required.');
      return;
    }

    const startsAt = `${this.slotDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = this.computeEndTimestamp(startsAt, Number(pkg.duration_hours));

    if (new Date(startsAt).getTime() <= Date.now()) {
      this.errorMessage.set('Slot start time must be in the future.');
      return;
    }

    const cap = Number(this.slotCapacity);
    if (cap < 1 || cap > pkg.max_people) {
      this.errorMessage.set(
        `Capacity must be between 1 and ${pkg.max_people} travelers for ${pkg.title}.`
      );
      return;
    }

    const payload: AvailabilitySlotCreate = {
      unit_id: pkg.id,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: cap,
      is_open: this.slotIsOpen,
    };

    this.isSaving.set(true);
    const listingId = guide.listing.id;

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
            this.successMessage.set('Guide availability slot updated.');
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
          this.successMessage.set('Availability slot created.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to create slot.')
          );
        },
      });
    }
  }

  toggleSlotOpen(slot: AvailabilitySlotResponse): void {
    const guide = this.selectedGuide();
    if (!guide || this.isPreview()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSaving.set(true);

    this.providerService
      .updateAvailabilitySlot(guide.listing.id, slot.id, {
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
            updated.is_open ? 'Slot unblocked for booking.' : 'Slot blocked.'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(
              err,
              'Could not update slot due to booking conflict or validation rule.'
            )
          );
        },
      });
  }

  packageTitle(unitId: number): string {
    return this.packages().find((p) => p.id === unitId)?.title || `Package #${unitId}`;
  }

  selectedEditorPackageMax(): number {
    return (
      this.packages().find((p) => p.id === Number(this.editorPackageId))?.max_people ?? 100
    );
  }

  /**
   * Surfaces any active booking held by the guide that overlaps this slot window,
   * even when the booking belongs to a different package (1 group per guide at a time).
   */
  slotConflicts(slot: AvailabilitySlotResponse): HomestayBookingDetails[] {
    const sStart = new Date(slot.starts_at).getTime();
    const sEnd = new Date(slot.ends_at).getTime();
    if (Number.isNaN(sStart) || Number.isNaN(sEnd)) return [];
    return this.bookings().filter((b) => {
      if (b.status !== 'pending' && b.status !== 'confirmed' && b.status !== 'completed') {
        return false;
      }
      const bStart = new Date(b.starts_at).getTime();
      const bEnd = new Date(b.ends_at).getTime();
      return bStart < sEnd && bEnd > sStart;
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

  private computeEndTimestamp(startsAtIso: string, durationHours: number): string {
    const startMs = new Date(startsAtIso).getTime();
    const endDate = new Date(startMs + Math.round(durationHours * 3600_000));
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(endDate);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+05:30`;
  }

  private parseSlotDateTimes(
    startsAt: string,
    endsAt: string
  ): { date: string; startTime: string; endTime: string } {
    const formatParts = (iso: string) => {
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
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
      return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        time: `${get('hour')}:${get('minute')}`,
      };
    };

    const s = formatParts(startsAt);
    const e = formatParts(endsAt);
    return { date: s.date, startTime: s.time, endTime: e.time };
  }

  private defaultFutureDate(): string {
    return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
