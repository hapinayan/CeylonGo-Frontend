import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AdminBookingDetailResponse } from '../../../../core/models/admin-bookings.models';

@Component({
  selector: 'app-admin-booking-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-booking-detail-modal.component.html',
  styleUrls: ['./admin-booking-detail-modal.component.scss'],
})
export class AdminBookingDetailModalComponent {
  @Input({ required: true }) booking!: AdminBookingDetailResponse;

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
