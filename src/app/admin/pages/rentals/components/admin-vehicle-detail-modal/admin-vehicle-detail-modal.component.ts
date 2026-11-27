import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  RentalApprovalStatus,
  RentalDocumentType,
  RentalVehicleType,
} from '../../../../core/models/admin-rentals.models';

@Component({
  selector: 'app-admin-vehicle-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-vehicle-detail-modal.component.html',
  styleUrls: ['./admin-vehicle-detail-modal.component.scss'],
})
export class AdminVehicleDetailModalComponent {
  @Input({ required: true }) vehicle!: AdminVehicleDetailResponse;
  @Input() documents: AdminVehicleDocumentItem[] = [];
  @Input() canReview = false;
  @Input() canVerifyDocs = false;
  @Input() isProcessing = false;

  @Output() close = new EventEmitter<void>();
  @Output() openReview = new EventEmitter<{ vehicle: AdminVehicleDetailResponse; defaultDecision: 'approved' | 'rejected' | 'suspended' }>();
  @Output() verifyDoc = new EventEmitter<{ vehicleId: number; docId: number; isVerified: boolean }>();

  selectedDocumentForPreview: AdminVehicleDocumentItem | null = null;

  isMotorized(type: RentalVehicleType): boolean {
    return type === 'bike' || type === 'tuk_tuk';
  }

  getDocName(type: RentalDocumentType): string {
    switch (type) {
      case 'revenue_license':
        return 'Motor Vehicle Revenue License';
      case 'insurance_certificate':
        return 'Vehicle Insurance Certificate';
      case 'registration_book':
        return 'CR / Registration Book';
      case 'fitness_certificate':
        return 'Vehicle Fitness Certificate';
      default:
        return 'Supporting Document';
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onApprove(): void {
    this.openReview.emit({ vehicle: this.vehicle, defaultDecision: 'approved' });
  }

  onReject(): void {
    this.openReview.emit({ vehicle: this.vehicle, defaultDecision: 'rejected' });
  }

  onSuspend(): void {
    this.openReview.emit({ vehicle: this.vehicle, defaultDecision: 'suspended' });
  }

  onToggleDocVerify(doc: AdminVehicleDocumentItem): void {
    this.verifyDoc.emit({
      vehicleId: this.vehicle.id,
      docId: doc.id,
      isVerified: !doc.is_verified,
    });
  }

  previewDoc(doc: AdminVehicleDocumentItem): void {
    this.selectedDocumentForPreview = doc;
  }

  closeDocPreview(): void {
    this.selectedDocumentForPreview = null;
  }
}
