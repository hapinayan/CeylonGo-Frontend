import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CredentialVerifyPayload,
  TourGuideCredential,
} from '../../../../core/models/admin-tour-guides.models';

@Component({
  selector: 'app-admin-credential-verify-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()" role="presentation">
      <div class="dialog-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Review & Verify Credential</h3>
        <p class="dialog-subtitle">
          <strong>{{ credential.title }}</strong> &bull; {{ credential.issuing_authority }}
        </p>

        <div class="form-group">
          <label for="credStatus">Verification Decision:</label>
          <select id="credStatus" [(ngModel)]="status" class="form-select">
            <option value="approved">Approve & Verify</option>
            <option value="rejected">Reject Credential</option>
            <option value="pending">Keep Pending (Requires Update)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="credNotes">Administrative Review Notes:</label>
          <textarea
            id="credNotes"
            [(ngModel)]="notes"
            rows="3"
            placeholder="Document verification audit notes..."
            class="form-textarea"
          ></textarea>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button
            type="button"
            class="btn-confirm"
            [disabled]="isProcessing"
            (click)="onConfirm()"
          >
            Submit Decision
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 1rem;
    }
    .dialog-card {
      background: #ffffff;
      border-radius: 10px;
      max-width: 480px;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .dialog-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }
    .dialog-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 1rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
      label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #334155;
        margin-bottom: 0.35rem;
      }
      .form-select, .form-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.625rem;
        font-size: 0.875rem;
        box-sizing: border-box;
      }
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      button {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-cancel {
        background: #f1f5f9;
        color: #475569;
        &:hover { background: #e2e8f0; }
      }
      .btn-confirm {
        background: #0284c7;
        color: #ffffff;
        &:hover { background: #0369a1; }
      }
    }
  `],
})
export class AdminCredentialVerifyDialogComponent {
  @Input({ required: true }) credential!: TourGuideCredential;
  @Input() isProcessing = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<CredentialVerifyPayload>();

  status: 'approved' | 'rejected' | 'pending' = 'approved';
  notes = '';

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit({
      status: this.status,
      verification_type: this.credential.credential_type,
      notes: this.notes.trim() || undefined,
      rejection_reason: this.status === 'rejected' ? this.notes.trim() : undefined,
    });
  }
}
