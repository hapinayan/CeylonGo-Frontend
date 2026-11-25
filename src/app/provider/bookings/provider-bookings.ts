import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  HomestayBookingDetails,
  BookingStatusUpdateRequest,
} from '../../core/models/provider.models';
import { ProviderService } from '../../core/services/provider.service';

@Component({
  selector: 'app-provider-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './provider-bookings.html',
  styleUrl: './provider-bookings.scss',
})
export class ProviderBookings implements OnInit {
  private readonly providerService = inject(ProviderService);

  readonly isLoading = signal<boolean>(true);
  readonly bookings = signal<HomestayBookingDetails[]>([]);
  readonly selectedFilter = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  // Action Dialog State
  readonly activeBooking = signal<HomestayBookingDetails | null>(null);
  readonly actionType = signal<'confirm' | 'reject' | null>(null);
  readonly isActionModalOpen = signal<boolean>(false);
  rejectReason = '';
  isUpdating = false;

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const filter = this.selectedFilter();
    const statusParam = filter === 'all' ? undefined : filter;

    this.providerService.getProviderBookings(statusParam).subscribe({
      next: (items) => {
        this.bookings.set(items);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading provider bookings:', err);
        this.errorMessage.set('Failed to load reservations. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(status: string): void {
    this.selectedFilter.set(status);
    this.loadBookings();
  }

  filteredBookings(): HomestayBookingDetails[] {
    const query = this.searchQuery().toLowerCase().trim();

    return this.bookings().filter((b) => {
      if (query) {
        const matchesId = String(b.id).includes(query);
        const matchesListing = String(b.listing_id).includes(query);
        const matchesTraveler = String(b.traveler_id).includes(query);
        const matchesKey = b.request_key ? b.request_key.toLowerCase().includes(query) : false;
        if (!matchesId && !matchesListing && !matchesTraveler && !matchesKey) {
          return false;
        }
      }
      return true;
    });
  }

  promptAction(booking: HomestayBookingDetails, action: 'confirm' | 'reject'): void {
    this.activeBooking.set(booking);
    this.actionType.set(action);
    this.rejectReason = '';
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.activeBooking.set(null);
    this.actionType.set(null);
    this.rejectReason = '';
    this.isUpdating = false;
  }

  confirmAction(): void {
    const booking = this.activeBooking();
    const action = this.actionType();
    if (!booking || !action) return;

    this.isUpdating = true;
    const targetStatus: 'confirmed' | 'rejected' = action === 'confirm' ? 'confirmed' : 'rejected';
    const payload: BookingStatusUpdateRequest = {
      to_status: targetStatus,
      reason:
        targetStatus === 'rejected' && this.rejectReason.trim()
          ? this.rejectReason.trim()
          : null,
    };

    this.providerService.updateBookingStatus(booking.id, payload).subscribe({
      next: () => {
        this.bookings.update((list) =>
          list.map((b) => (b.id === booking.id ? { ...b, status: targetStatus } : b))
        );
        this.isUpdating = false;
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Error updating booking status:', err);
        const detailMsg = err?.error?.detail || 'Failed to update reservation status.';
        alert(detailMsg);
        this.isUpdating = false;
      },
    });
  }
}
