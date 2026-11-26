import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-artisan-reject-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()" role="presentation">
      <div class="dialog-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <h3 class="dialog-title">{{ actionTitle }}</h3>
        <p class="dialog-desc">
          State the administrative justification for this decision.
          <span *ngIf="actionType === 'reject'">A minimum of 3 characters is required.</span>
        </p>

        <div class="form-group">
          <label for="actionReason">Reason / Notes:</label>
          <textarea
            id="actionReason"
            [(ngModel)]="reason"
            rows="3"
            placeholder="Enter reason..."
            class="form-textarea"
          ></textarea>
          <span class="error-msg" *ngIf="validationError">{{ validationError }}</span>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button
            type="button"
            class="btn-confirm"
            [class.btn-danger]="actionType === 'reject'"
            [class.btn-warning]="actionType === 'suspend'"
            [disabled]="isProcessing"
            (click)="onConfirm()"
          >
            Confirm {{ actionType === 'reject' ? 'Rejection' : 'Suspension' }}
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
      margin: 0 0 0.5rem;
    }
    .dialog-desc {
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
      .form-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.625rem;
        font-size: 0.875rem;
        box-sizing: border-box;
      }
      .error-msg {
        font-size: 0.75rem;
        color: #ef4444;
        margin-top: 0.25rem;
        display: block;
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
      .btn-danger {
        background: #ef4444;
        color: #ffffff;
        &:hover { background: #dc2626; }
      }
      .btn-warning {
        background: #f59e0b;
        color: #ffffff;
        &:hover { background: #d97706; }
      }
    }
  `],
})
export class AdminArtisanRejectDialogComponent {
  @Input() actionType: 'reject' | 'suspend' = 'reject';
  @Input() isProcessing = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  reason = '';
  validationError: string | null = null;

  get actionTitle(): string {
    return this.actionType === 'reject' ? 'Reject Artisan Listing' : 'Suspend Artisan Listing';
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    const trimmed = this.reason.trim();
    if (this.actionType === 'reject' && trimmed.length < 3) {
      this.validationError = 'Rejection reason must be at least 3 characters long.';
      return;
    }
    this.validationError = null;
    this.confirm.emit(trimmed);
  }
}
