import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleReviewRequest,
  RentalApprovalStatus,
  RentalVehicleType,
} from '../../../../core/models/admin-rentals.models';

@Component({
  selector: 'app-admin-vehicle-review-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-vehicle-review-dialog.component.html',
  styleUrls: ['./admin-vehicle-review-dialog.component.scss'],
})
export class AdminVehicleReviewDialogComponent implements OnInit {
  @Input({ required: true }) vehicle!: AdminVehicleDetailResponse;
  @Input() documents: AdminVehicleDocumentItem[] = [];
  @Input() initialDecision: 'approved' | 'rejected' | 'suspended' = 'approved';
  @Input() isProcessing = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ vehicleId: number; payload: AdminVehicleReviewRequest }>();

  decision: 'approved' | 'rejected' | 'suspended' = 'approved';
  reason = '';
  notes = '';
  validationError: string | null = null;

  ngOnInit(): void {
    this.decision = this.initialDecision;
  }

  isMotorized(type: RentalVehicleType): boolean {
    return type === 'bike' || type === 'tuk_tuk';
  }

  hasVerifiedMotorizedDocs(): boolean {
    if (!this.isMotorized(this.vehicle.vehicle_type)) {
      return true; // Ordinary bicycles have no motorized licensing requirements
    }
    const verifiedTypes = new Set(
      this.documents.filter((d) => d.is_verified).map((d) => d.document_type)
    );
    return verifiedTypes.has('revenue_license') && verifiedTypes.has('insurance_certificate');
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.decision === 'rejected') {
      const trimmed = this.reason.trim();
      if (trimmed.length < 5) {
        this.validationError = 'Rejection reason must be at least 5 characters long.';
        return;
      }
    }

    if (this.decision === 'approved' && !this.hasVerifiedMotorizedDocs()) {
      this.validationError =
        'Cannot approve motorized vehicle: verified Revenue License and Insurance Certificate documents are required.';
      return;
    }

    this.validationError = null;
    this.confirm.emit({
      vehicleId: this.vehicle.id,
      payload: {
        decision: this.decision,
        reason: this.decision === 'rejected' ? this.reason.trim() : (this.reason.trim() || undefined),
        notes: this.notes.trim() || undefined,
      },
    });
  }
}
