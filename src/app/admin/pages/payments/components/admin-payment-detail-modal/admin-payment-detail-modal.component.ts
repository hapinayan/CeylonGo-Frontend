import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AdminPaymentTransactionItem } from '../../../../core/models/admin-payments.models';

@Component({
  selector: 'app-admin-payment-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-payment-detail-modal.component.html',
  styleUrls: ['./admin-payment-detail-modal.component.scss'],
})
export class AdminPaymentDetailModalComponent {
  @Input({ required: true }) payment!: AdminPaymentTransactionItem;

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
