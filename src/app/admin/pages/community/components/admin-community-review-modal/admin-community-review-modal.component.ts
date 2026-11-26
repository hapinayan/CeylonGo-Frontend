import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminCommunityReportItem,
  ModerateContentPayload,
} from '../../../../core/models/admin-community.models';

@Component({
  selector: 'app-admin-community-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-community-review-modal.component.html',
  styleUrls: ['./admin-community-review-modal.component.scss'],
})
export class AdminCommunityReviewModalComponent {
  @Input({ required: true }) report!: AdminCommunityReportItem;
  @Input() canModerate = false;

  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<ModerateContentPayload>();

  selectedAction: 'approve' | 'hide' | 'remove' | 'suspend_author' = 'hide';
  reason = '';
  validationError: string | null = null;

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.reason || this.reason.trim().length < 3) {
      this.validationError = 'A reason of at least 3 characters is required.';
      return;
    }

    this.action.emit({
      action: this.selectedAction,
      reason: this.reason.trim(),
    });
  }
}
