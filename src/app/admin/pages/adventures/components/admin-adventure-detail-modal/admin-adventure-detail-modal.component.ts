import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ActivityResponse } from '../../../../core/models/admin-activities.models';

@Component({
  selector: 'app-admin-adventure-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-adventure-detail-modal.component.html',
  styleUrls: ['./admin-adventure-detail-modal.component.scss'],
})
export class AdminAdventureDetailModalComponent {
  @Input({ required: true }) activity!: ActivityResponse;
  @Input() canReview = false;
  @Input() isProcessing = false;

  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<ActivityResponse>();
  @Output() reject = new EventEmitter<ActivityResponse>();

  onClose(): void {
    this.close.emit();
  }

  onApprove(): void {
    this.approve.emit(this.activity);
  }

  onReject(): void {
    this.reject.emit(this.activity);
  }
}
