import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  HomestayBookingDetails,
  RentalMetadataPayload,
  RentalUnitResponse,
  ReviewListing,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider-preview.service';

type RentalCategoryFilter = 'all' | 'scooter' | 'motorcycle' | 'bicycle';

@Component({
  selector: 'app-rental-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rental-availability.html',
  styleUrl: './rental-availability.scss',
})
export class RentalAvailability implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingSlots = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isSavingUnit = signal<boolean>(false);
  readonly isSavingPrice = signal<boolean>(false);

  readonly allListings = signal<ReviewListing[]>([]);
  readonly bookings = signal<HomestayBookingDetails[]>([]);
  readonly categoryFilter = signal<RentalCategoryFilter>('all');
  readonly selectedListingId = signal<number | null>(null);
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  readonly units = signal<RentalUnitResponse[]>([]);
  readonly filterDate = signal<string>('');

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly filteredListings = computed(() => {
    const cat = this.categoryFilter();
    return this.allListings().filter((item) => {
      if (cat === 'all') return true;
      if (cat === 'bicycle') return item.listing.category === 'bicycle';
      const subtype = String(item.details?.['rental']?.subtype || '').toLowerCase();
      if (cat === 'scooter') return item.listing.category === 'bike' && subtype === 'scooter';
      return item.listing.category === 'bike' && subtype !== 'scooter';
    });
  });

  readonly selectedListing = computed(() => {
    const id = this.selectedListingId();
    return this.allListings().find((l) => l.listing.id === id) || null;
  });

  readonly activeListingBookings = computed(() => {
    const id = this.selectedListingId();
    if (!id) return [];
    return this.bookings().filter(
      (b) => b.listing_id === id && (b.status === 'pending' || b.status === 'confirmed')
    );
  });

  readonly filteredSlots = computed(() => {
    const df = this.filterDate().trim();
    const list = this.slots();
    if (!df) return list;
    return list.filter((s) => this.slotDateSriLanka(s.starts_at) === df);
  });

  // Routine Price Form
  routinePrice: number | null = null;

  // Fleet Unit Form
  newUnitLabel = '';
  editingUnitId: number | null = null;
  editingUnitLabel = '';

  // Availability Window Form
  slotUnitId: number | null = null;
  editingSlotId: number | null = null;
  slotStartDate = this.defaultFutureDate(1);
  slotStartTime = '08:00';
  slotEndDate = this.defaultFutureDate(5);
  slotEndTime = '18:00';
  slotIsOpen = true;

  ngOnInit(): void {
    const queryId = Number(this.route.snapshot.queryParamMap.get('listingId'));
    this.loadData(Number.isInteger(queryId) && queryId > 0 ? queryId : null);
  }

  loadData(preferredListingId: number | null = null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      bikes: this.providerService.getProviderListings(100, 0, 'bike'),
      bicycles: this.providerService.getProviderListings(100, 0, 'bicycle'),
      bikeBookings: this.providerService.getProviderBookings(undefined, 'bike'),
      bicycleBookings: this.providerService.getProviderBookings(undefined, 'bicycle'),
    }).subscribe({
      next: ({ bikes, bicycles, bikeBookings, bicycleBookings }) => {
        const merged = [...bikes, ...bicycles];
        this.allListings.set(merged);
        this.bookings.set([...bikeBookings, ...bicycleBookings]);
        this.isLoading.set(false);

        if (merged.length > 0) {
          const target =
            (preferredListingId ? merged.find((l) => l.listing.id === preferredListingId) : null) ||
            merged[0];
          this.selectListing(target.listing.id);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractError(err, 'Failed to load rental fleet and availability.'));
      },
    });
  }

  onCategoryFilterChange(cat: RentalCategoryFilter): void {
    this.categoryFilter.set(cat);
    const list = this.filteredListings();
    if (list.length > 0 && !list.some((l) => l.listing.id === this.selectedListingId())) {
      this.selectListing(list[0].listing.id);
    }
  }

  selectListing(listingId: number): void {
    const id = Number(listingId);
    if (!Number.isInteger(id) || id <= 0) return;

    this.selectedListingId.set(id);
    this.editingSlotId = null;
    this.editingUnitId = null;
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const rev = this.selectedListing();
    this.routinePrice = rev?.listing?.price ? Number(rev.listing.price) : null;

    const unitList: RentalUnitResponse[] = Array.isArray(rev?.listing.units)
      ? rev.listing.units.map((u: any) => ({
          id: Number(u.id),
          listing_id: id,
          label: String(u.label || `Unit #${u.id}`),
          capacity: Number(u.capacity) || 1,
          is_active: u.is_active !== false,
        }))
      : [];
    this.units.set(unitList);
    this.slotUnitId = unitList[0]?.id ?? null;

    this.loadSlots(id);
  }

  loadSlots(listingId: number): void {
    this.isLoadingSlots.set(true);
    this.providerService.getAvailabilitySlots(listingId, 100, 0).subscribe({
      next: (items) => {
        this.slots.set([...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        this.isLoadingSlots.set(false);
      },
      error: (err) => {
        this.isLoadingSlots.set(false);
        this.errorMessage.set(this.extractError(err, 'Could not load availability windows.'));
      },
    });
  }

  categoryDisplay(rev: ReviewListing): string {
    if (rev.listing.category === 'bicycle') {
      const sub = String(rev.details?.['rental']?.subtype || 'bicycle');
      return `${sub.charAt(0).toUpperCase() + sub.slice(1)} Bicycle`;
    }
    const sub = String(rev.details?.['rental']?.subtype || '');
    return sub === 'scooter' ? 'Scooter' : 'Motorbike';
  }

  unitLabel(unitId: number): string {
    return this.units().find((u) => u.id === unitId)?.label || `Unit #${unitId}`;
  }

  async addUnit(): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Fleet edits are disabled in Preview Mode.');
      return;
    }
    const id = this.selectedListingId();
    const label = this.newUnitLabel.trim();
    if (!id || !label) {
      this.errorMessage.set('Enter a label for the new physical vehicle.');
      return;
    }

    this.isSavingUnit.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      const created = await firstValueFrom(
        this.providerService.createRentalUnit(id, { label, capacity: 1 })
      );
      this.units.update((curr) => [...curr, created]);
      this.slotUnitId = created.id;
      this.newUnitLabel = '';
      this.successMessage.set(`Added physical vehicle "${created.label}".`);
    } catch (err) {
      this.errorMessage.set(this.extractError(err, 'Could not add vehicle unit.'));
    } finally {
      this.isSavingUnit.set(false);
    }
  }

  startEditUnit(unit: RentalUnitResponse): void {
    this.editingUnitId = unit.id;
    this.editingUnitLabel = unit.label;
  }

  async saveUnitLabel(unit: RentalUnitResponse): Promise<void> {
    if (this.isPreview()) return;
    const id = this.selectedListingId();
    const label = this.editingUnitLabel.trim();
    if (!id || !label) return;

    this.isSavingUnit.set(true);
    this.errorMessage.set(null);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateRentalUnit(id, unit.id, {
          label,
          is_active: unit.is_active,
        })
      );
      this.units.update((curr) => curr.map((u) => (u.id === unit.id ? updated : u)));
      this.editingUnitId = null;
      this.successMessage.set('Fleet unit updated.');
    } catch (err) {
      this.errorMessage.set(this.extractError(err, 'Failed to update unit label.'));
    } finally {
      this.isSavingUnit.set(false);
    }
  }

  async toggleUnitActive(unit: RentalUnitResponse): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Fleet changes are disabled in Preview Mode.');
      return;
    }
    const id = this.selectedListingId();
    if (!id) return;

    this.isSavingUnit.set(true);
    this.errorMessage.set(null);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateRentalUnit(id, unit.id, {
          label: unit.label,
          is_active: !unit.is_active,
        })
      );
      this.units.update((curr) => curr.map((u) => (u.id === unit.id ? updated : u)));
      this.successMessage.set(`${updated.label} marked ${updated.is_active ? 'active' : 'inactive'}.`);
    } catch (err) {
      this.errorMessage.set(
        this.extractError(err, 'Cannot deactivate unit with active reservations.')
      );
    } finally {
      this.isSavingUnit.set(false);
    }
  }

  async saveRoutineDailyPrice(): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Price updates are disabled in Preview Mode.');
      return;
    }
    const rev = this.selectedListing();
    if (!rev || !(Number(this.routinePrice) > 0)) {
      this.errorMessage.set('Enter a positive daily LKR rental rate.');
      return;
    }

    this.isSavingPrice.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      const rentalMeta = (rev.details?.['rental'] || null) as RentalMetadataPayload | null;
      const updated = await firstValueFrom(
        this.providerService.updateListingDraft(rev.listing.id, {
          price: Number(this.routinePrice).toFixed(2),
          ...(rentalMeta ? { rental: rentalMeta } : {}),
        })
      );
      this.allListings.update((list) =>
        list.map((l) => (l.listing.id === rev.listing.id ? updated : l))
      );
      this.successMessage.set('Daily rental price updated (approval preserved for routine edits).');
    } catch (err) {
      this.errorMessage.set(this.extractError(err, 'Failed to update daily rental price.'));
    } finally {
      this.isSavingPrice.set(false);
    }
  }

  async saveAvailabilityWindow(): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Availability changes are disabled in Preview Mode.');
      return;
    }
    const id = this.selectedListingId();
    const unitId = this.slotUnitId || this.units()[0]?.id;
    if (!id || !unitId) {
      this.errorMessage.set('Select a fleet unit before creating an availability window.');
      return;
    }

    const startsAt = `${this.slotStartDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = `${this.slotEndDate}T${this.slotEndTime}:00+05:30`;
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      this.errorMessage.set('End date & time must be after start date & time.');
      return;
    }

    const payload: AvailabilitySlotCreate = {
      unit_id: unitId,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: 1,
      is_open: this.slotIsOpen,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      const slot = this.editingSlotId
        ? await firstValueFrom(
            this.providerService.updateAvailabilitySlot(id, this.editingSlotId, payload)
          )
        : await firstValueFrom(this.providerService.addAvailabilitySlot(id, payload));

      this.slots.update((curr) => {
        const without = curr.filter((s) => s.id !== slot.id);
        return [...without, slot].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      });
      this.editingSlotId = null;
      this.successMessage.set(
        slot.is_open ? 'Availability window opened.' : 'Dates blocked for maintenance/hold.'
      );
    } catch (err) {
      this.errorMessage.set(
        this.extractError(err, 'Conflict saving availability window. Check existing bookings or blocks.')
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleSlotBlock(slot: AvailabilitySlotResponse): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Availability updates are disabled in Preview Mode.');
      return;
    }
    const id = this.selectedListingId();
    if (!id) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateAvailabilitySlot(id, slot.id, {
          unit_id: slot.unit_id,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          capacity: 1,
          is_open: !slot.is_open,
        })
      );
      this.slots.update((curr) => curr.map((s) => (s.id === slot.id ? updated : s)));
      this.successMessage.set(updated.is_open ? 'Dates reopened for rentals.' : 'Dates blocked.');
    } catch (err) {
      this.errorMessage.set(
        this.extractError(err, 'Cannot block dates reserved by an active traveler booking.')
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  slotDateSriLanka(iso: string): string {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso.slice(0, 10);
    return new Date(ms + 19_800_000).toISOString().slice(0, 10);
  }

  private defaultFutureDate(daysAhead: number): string {
    const d = new Date(Date.now() + daysAhead * 86_400_000 + 19_800_000);
    return d.toISOString().slice(0, 10);
  }

  private extractError(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d?.msg).filter(Boolean).join('; ') || fallback;
    }
    return err?.message || fallback;
  }
}
