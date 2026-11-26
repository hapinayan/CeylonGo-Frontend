import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActivityResponse } from '../../../../core/models/admin-activities.models';

@Component({
  selector: 'app-admin-adventure-reject-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-adventure-reject-dialog.component.html',
  styleUrls: ['./admin-adventure-reject-dialog.component.scss'],
})
export class AdminAdventureRejectDialogComponent {
  @Input({ required: true }) activity!: ActivityResponse;
  @Input() isProcessing = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ activityId: number; reason: string }>();

  reason = '';
  validationError: string | null = null;

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    const trimmed = this.reason.trim();
    if (trimmed.length < 5) {
      this.validationError = 'Rejection reason must be at least 5 characters long.';
      return;
    }
    this.validationError = null;
    this.confirm.emit({
      activityId: this.activity.id,
      reason: trimmed,
    });
  }
}
