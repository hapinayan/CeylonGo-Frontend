import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  HomestayRoom,
  ReviewListing,
  RoomUpdate,
} from '../../core/models/provider.models';
import { ProviderService } from '../../core/services/provider.service';

@Component({
  selector: 'app-provider-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './provider-rooms.html',
  styleUrl: './provider-rooms.scss',
})
export class ProviderRooms implements OnInit {
  private readonly providerService = inject(ProviderService);

  readonly isLoading = signal<boolean>(true);
  readonly listings = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);

  readonly rooms = signal<HomestayRoom[]>([]);
  readonly slots = signal<AvailabilitySlotResponse[]>([]);

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

    this.providerService.getProviderListings().subscribe({
      next: (items) => {
        this.listings.set(items);
        if (items.length > 0) {
          const first = items[0];
          this.selectedListingId.set(first.listing.id);
          this.loadRoomsAndSlots(first);
        } else {
          // Fallback initial state
          this.rooms.set([
            {
              id: 1,
              listing_id: 101,
              label: 'Deluxe Double',
              capacity: 2,
              is_active: true,
              room_type: 'Double Bed',
              description: 'Mountain view room with attached bathroom',
              nightly_price: '9500.00',
              photo_ids: [],
            },
          ]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onListingChange(listingIdStr: string): void {
    const listingId = Number(listingIdStr);
    this.selectedListingId.set(listingId);
    const item = this.listings().find((l) => l.listing.id === listingId);
    if (item) {
      this.loadRoomsAndSlots(item);
    }
  }

  private loadRoomsAndSlots(review: ReviewListing): void {
    this.rooms.set(review.rooms || []);

    const listingId = review.listing.id;
    this.providerService.getAvailabilitySlots(listingId).subscribe({
      next: (slots) => this.slots.set(slots),
      error: () => this.slots.set([]),
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
    if (!this.newRoomLabel.trim()) return;

    const listingId = this.selectedListingId() || 101;
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
        this.rooms.update((list) => [...list, created]);
        this.isAddingRoom = false;
        this.closeAddRoomModal();
      },
      error: () => {
        // Local preview fallback
        const mock: HomestayRoom = {
          id: this.rooms().length + 1,
          listing_id: listingId,
          label: roomPayload.label,
          capacity: roomPayload.capacity,
          is_active: true,
          room_type: roomPayload.room_type,
          description: roomPayload.description,
          nightly_price: roomPayload.nightly_price,
          photo_ids: [],
        };
        this.rooms.update((list) => [...list, mock]);
        this.isAddingRoom = false;
        this.closeAddRoomModal();
      },
    });
  }

  openBlockModal(room: HomestayRoom): void {
    this.selectedRoomForBlock = room;
    this.blockStartDate = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    this.blockEndDate = nextWeek.toISOString().slice(0, 10);
    this.isBlockModalOpen.set(true);
  }

  closeBlockModal(): void {
    this.isBlockModalOpen.set(false);
    this.selectedRoomForBlock = null;
  }

  submitBlockDates(): void {
    if (!this.selectedRoomForBlock || !this.blockStartDate || !this.blockEndDate) return;

    const listingId = this.selectedListingId() || 101;
    this.isSavingBlock = true;

    const slotPayload: AvailabilitySlotCreate = {
      unit_id: this.selectedRoomForBlock.id,
      starts_at: new Date(this.blockStartDate).toISOString(),
      ends_at: new Date(this.blockEndDate).toISOString(),
      capacity: this.selectedRoomForBlock.capacity,
      is_open: false,
    };

    this.providerService.addAvailabilitySlot(listingId, slotPayload).subscribe({
      next: (created) => {
        this.slots.update((s) => [...s, created]);
        this.isSavingBlock = false;
        this.closeBlockModal();
      },
      error: () => {
        const mock: AvailabilitySlotResponse = {
          id: this.slots().length + 1,
          unit_id: slotPayload.unit_id,
          starts_at: slotPayload.starts_at,
          ends_at: slotPayload.ends_at,
          capacity: slotPayload.capacity,
          is_open: false,
        };
        this.slots.update((s) => [...s, mock]);
        this.isSavingBlock = false;
        this.closeBlockModal();
      },
    });
  }

  getSlotsForRoom(roomId: number): AvailabilitySlotResponse[] {
    return this.slots().filter((s) => s.unit_id === roomId);
  }
}
