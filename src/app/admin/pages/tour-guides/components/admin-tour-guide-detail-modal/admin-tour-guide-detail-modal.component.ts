import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  AdminTourGuideDetailResponse,
  TourGuideCredential,
} from '../../../../core/models/admin-tour-guides.models';

@Component({
  selector: 'app-admin-tour-guide-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-tour-guide-detail-modal.component.html',
  styleUrls: ['./admin-tour-guide-detail-modal.component.scss'],
})
export class AdminTourGuideDetailModalComponent {
  @Input({ required: true }) guideDetail!: AdminTourGuideDetailResponse;
  @Input() canReview = false;
  @Input() canVerify = false;
  @Input() isProcessing = false;

  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<number>();
  @Output() reject = new EventEmitter<number>();
  @Output() suspend = new EventEmitter<number>();
  @Output() toggleBadge = new EventEmitter<{ guideId: number; action: 'grant' | 'revoke' }>();
  @Output() verifyCredential = new EventEmitter<{ guideId: number; credential: TourGuideCredential }>();

  activeTab: 'overview' | 'credentials' | 'packages' = 'overview';

  onClose(): void {
    this.close.emit();
  }

  onApprove(): void {
    this.approve.emit(this.guideDetail.guide.id);
  }

  onReject(): void {
    this.reject.emit(this.guideDetail.guide.id);
  }

  onSuspend(): void {
    this.suspend.emit(this.guideDetail.guide.id);
  }

  onToggleBadge(): void {
    const isVerified = this.guideDetail.guide.verification_status === 'verified';
    this.toggleBadge.emit({
      guideId: this.guideDetail.guide.id,
      action: isVerified ? 'revoke' : 'grant',
    });
  }

  onVerifyCred(credential: TourGuideCredential): void {
    this.verifyCredential.emit({
      guideId: this.guideDetail.guide.id,
      credential,
    });
  }
}
