import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  HomestayRoom,
  ReviewListing,
  RoomUpdate,
} from '../../core/models/provider.models';
import { providerError } from '../../core/services/provider-account.service';
import { ProviderService } from '../../core/services/provider.service';
import { ProviderPreviewService } from '../provider-preview.service';

@Component({
  selector: 'app-provider-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './provider-rooms.html',
  styleUrl: './provider-rooms.scss',
})
export class ProviderRooms implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly route = inject(ActivatedRoute);
  private readonly previewService = inject(ProviderPreviewService);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly listings = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);

  readonly rooms = signal<HomestayRoom[]>([]);
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  readonly message = signal('');
  readonly error = signal('');
  editingSlotId: number | null = null;
  slotCapacity = 1;
  slotOpen = false;

  // Add Room Modal State
  readonly isAddRoomModalOpen = signal<boolean>(false);
  newRoomLabel = '';
  newRoomType = 'Double Bed';
  newRoomCapacity = 2;
  newRoomPrice = '9500.00';
  newRoomDescription = 'Comfortable guest room with ensuite bathroom';
  isAddingRoom = false;

  // Block Dates Modal State
  readonly isBlockModalOpen = signal<boolean>(false);
  selectedRoomForBlock: HomestayRoom | null = null;
  blockStartDate = '';
  blockEndDate = '';
  isSavingBlock = false;

  ngOnInit(): void {
    this.loadListings();
  }

  loadListings(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.providerService
      .getProviderListings(100, 0, 'homestay')
      .subscribe({
      next: (items) => {
        this.listings.set(items);
        const requested = Number(this.route.snapshot.queryParamMap.get('listingId'));
        const selected = items.find((item) => item.listing.id === requested) ?? items[0];
        this.selectedListingId.set(selected?.listing.id ?? null);
        if (selected) this.loadRoomsAndSlots(selected);
        else { this.rooms.set([]); this.slots.set([]); }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set(providerError(error, 'Could not load your homestays.'));
        this.isLoading.set(false);
      },
    });
  }

  onListingChange(listingIdStr: string): void {
    const listingId = Number(listingIdStr);
    this.slots.set([]);
    const item = this.listings().find((l) => l.listing.id === listingId);
    if (item) {
      this.selectedListingId.set(listingId);
      this.loadRoomsAndSlots(item);
    }
  }

  private loadRoomsAndSlots(review: ReviewListing): void {
    this.rooms.set(review.rooms || []);

    const listingId = review.listing.id;
    this.providerService.getAvailabilitySlots(listingId).subscribe({
      next: (slots) => { if (this.selectedListingId() === listingId) this.slots.set(slots); },
      error: (error) => {
        if (this.selectedListingId() === listingId) this.error.set(providerError(error, 'Could not load availability.'));
      },
    });
  }

  openAddRoomModal(): void {
    this.newRoomLabel = '';
    this.newRoomType = 'Double Bed';
    this.newRoomCapacity = 2;
    this.newRoomPrice = '9500.00';
    this.newRoomDescription = 'Comfortable guest room with ensuite bathroom';
    this.isAddRoomModalOpen.set(true);
  }

  closeAddRoomModal(): void {
    this.isAddRoomModalOpen.set(false);
  }

  submitAddRoom(): void {
    const listingId = this.selectedListingId();
    if (this.isPreview() || !listingId || this.isAddingRoom || !this.newRoomLabel.trim()) return;
    const price = Number(this.newRoomPrice);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(this.newRoomCapacity) || this.newRoomCapacity < 1) {
      this.error.set('Enter a positive nightly price and a whole-number capacity.'); return;
    }
    this.error.set('');
    this.isAddingRoom = true;

    const roomPayload: RoomUpdate = {
      label: this.newRoomLabel.trim(),
      capacity: Number(this.newRoomCapacity) || 1,
      nightly_price: Number(this.newRoomPrice).toFixed(2),
      room_type: this.newRoomType,
      description: this.newRoomDescription,
      photo_ids: [],
    };

    this.providerService.addRoom(listingId, roomPayload).subscribe({
      next: (created) => {
        if (this.selectedListingId() === listingId) this.rooms.update((list) => [...list, created]);
        this.message.set('Room added.');
        this.isAddingRoom = false;
        this.closeAddRoomModal();
      },
      error: (error) => {
        this.error.set(providerError(error, 'Could not add the room.'));
        this.isAddingRoom = false;
      },
    });
  }

  openBlockModal(room: HomestayRoom, existing?: AvailabilitySlotResponse): void {
    this.error.set('');
    this.editingSlotId = existing?.id ?? null;
    this.slotOpen = existing?.is_open ?? false;
    this.slotCapacity = existing?.capacity ?? room.capacity;
    this.selectedRoomForBlock = room;
    this.blockStartDate = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    this.blockEndDate = nextWeek.toISOString().slice(0, 10);
    if (existing) {
      this.blockStartDate = this.localDate(existing.starts_at);
      this.blockEndDate = this.localDate(existing.ends_at);
    }
    this.isBlockModalOpen.set(true);
  }

  closeBlockModal(): void {
    this.isBlockModalOpen.set(false);
    this.selectedRoomForBlock = null;
  }

  submitBlockDates(): void {
    const room = this.selectedRoomForBlock;
    const listingId = this.selectedListingId();
    if (this.isPreview() || !room || !listingId || this.isSavingBlock) return;
    if (!this.blockStartDate || !this.blockEndDate || this.blockEndDate <= this.blockStartDate ||
        !Number.isInteger(this.slotCapacity) || this.slotCapacity < 1 ||
        this.slotCapacity > room.capacity) {
      this.error.set('Choose an increasing date range and capacity within the room limit.');
      return;
    }
    this.error.set('');
    this.isSavingBlock = true;
    const slot: AvailabilitySlotCreate = {
      unit_id: room.id,
      starts_at: new Date(this.blockStartDate + 'T00:00:00+05:30').toISOString(),
      ends_at: new Date(this.blockEndDate + 'T00:00:00+05:30').toISOString(),
      capacity: this.slotCapacity,
      is_open: this.slotOpen,
    };
    const editing = this.editingSlotId;
    const request = editing === null ? this.providerService.addAvailabilitySlot(listingId, slot)
      : this.providerService.updateAvailabilitySlot(listingId, editing, slot);
    request.subscribe({
      next: (saved) => {
        if (this.selectedListingId() === listingId) this.slots.update((items) =>
          editing === null ? [...items, saved] : items.map((item) => item.id === editing ? saved : item));
        this.message.set('Availability saved.');
        this.isSavingBlock = false;
        this.closeBlockModal();
      },
      error: (error) => {
        this.error.set(providerError(error, 'Could not save availability.'));
        this.isSavingBlock = false;
      },
    });
  }

  private localDate(value: string): string {
    const utc = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z';
    return new Date(Date.parse(utc) + 19_800_000).toISOString().slice(0, 10);
  }

  getSlotsForRoom(roomId: number): AvailabilitySlotResponse[] {
    return this.slots().filter((s) => s.unit_id === roomId);
  }
}
