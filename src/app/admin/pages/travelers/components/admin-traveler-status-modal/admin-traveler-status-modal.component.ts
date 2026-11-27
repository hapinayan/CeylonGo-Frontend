import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DEACTIVATION_REASON_CODES,
  REACTIVATION_REASON_CODES,
  TravelerAccount,
  TRAVELER_REASON_CODE_LABELS,
  TravelerStatusReasonCode,
  TravelerStatusUpdate,
} from '../../../../core/models/admin-travelers.models';

@Component({
  selector: 'app-admin-traveler-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
      <div class="modal-card">
        <div class="modal-header" [class.danger]="!targetActive" [class.success]="targetActive">
          <div class="header-info">
            <span class="eyebrow">Action Confirmation</span>
            <h2 id="status-modal-title" class="modal-title">
              {{ targetActive ? 'Reactivate Traveler Account' : 'Suspend Traveler Account' }}
            </h2>
          </div>
          <button type="button" class="close-btn" (click)="cancel.emit()" [disabled]="isSubmitting" aria-label="Cancel dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="modal-body">
          <div class="alert-box" [class.danger]="!targetActive" [class.success]="targetActive">
            @if (targetActive) {
              <p>You are about to <strong>reactivate</strong> the account for <strong>{{ traveler.full_name }}</strong>. The traveler will immediately regain booking and platform access.</p>
            } @else {
              <p>You are about to <strong>suspend</strong> the account for <strong>{{ traveler.full_name }}</strong>. The traveler will be barred from creating bookings or publishing content.</p>
            }
          </div>

          <div class="form-group">
            <label for="reasonCode" class="form-label">
              Official Reason Code <span class="required">*</span>
            </label>
            <select
              id="reasonCode"
              name="reasonCode"
              [(ngModel)]="selectedReason"
              class="form-select"
              required
              [disabled]="isSubmitting"
            >
              <option value="" disabled selected>-- Select a mandatory reason --</option>
              @for (code of availableReasons(); track code) {
                <option [value]="code">{{ getReasonLabel(code) }}</option>
              }
            </select>
            @if (showValidation() && !selectedReason) {
              <span class="validation-error">Please select a valid reason code.</span>
            }
          </div>

          <div class="form-group">
            <label for="adminNote" class="form-label">
              Administrative Note <span class="required">*</span>
            </label>
            <textarea
              id="adminNote"
              name="adminNote"
              [(ngModel)]="adminNote"
              rows="3"
              maxlength="500"
              class="form-textarea"
              placeholder="Provide a mandatory administrative explanation for the audit log..."
              required
              [disabled]="isSubmitting"
            ></textarea>
            <div class="char-count" [class.limit]="adminNote.length > 480">
              {{ adminNote.length }}/500 characters
            </div>
            @if (showValidation() && (!adminNote || adminNote.trim().length === 0)) {
              <span class="validation-error">An administrative explanation note is required.</span>
            }
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancel.emit()" [disabled]="isSubmitting">
              Cancel
            </button>
            <button
              type="submit"
              class="btn"
              [class.btn-danger]="!targetActive"
              [class.btn-primary]="targetActive"
              [disabled]="isSubmitting || !selectedReason || !adminNote.trim()"
            >
              @if (isSubmitting) {
                <span>Processing...</span>
              } @else {
                <span>Confirm {{ targetActive ? 'Reactivation' : 'Suspension' }}</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;

      &.danger {
        background: #fef2f2;
        border-bottom-color: #fecaca;
        .eyebrow { color: #dc2626; }
      }

      &.success {
        background: #f0fdf4;
        border-bottom-color: #bbf7d0;
        .eyebrow { color: #16a34a; }
      }

      .eyebrow {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .modal-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0.25rem 0 0;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.375rem;
        border-radius: 6px;

        &:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }

        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .alert-box {
      padding: 0.875rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.4;

      p { margin: 0; }

      &.danger {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fee2e2;
      }

      &.success {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #dcfce7;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      .form-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #334155;

        .required { color: #dc2626; }
      }

      .form-select, .form-textarea {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        color: #0f172a;
        background: #ffffff;
        outline: none;
        transition: border-color 0.15s ease;

        &:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        &:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
      }

      .char-count {
        font-size: 0.75rem;
        color: #64748b;
        text-align: right;

        &.limit { color: #dc2626; font-weight: 600; }
      }

      .validation-error {
        font-size: 0.75rem;
        color: #dc2626;
        font-weight: 500;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;

      .btn {
        padding: 0.5rem 1.25rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .btn-secondary {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #475569;
        &:hover:not(:disabled) { background: #f8fafc; color: #1e293b; }
      }

      .btn-primary {
        background: #16a34a;
        color: #ffffff;
        &:hover:not(:disabled) { background: #15803d; }
      }

      .btn-danger {
        background: #dc2626;
        color: #ffffff;
        &:hover:not(:disabled) { background: #b91c1c; }
      }
    }
  `]
})
export class AdminTravelerStatusModalComponent implements OnInit {
  @Input({ required: true }) traveler!: TravelerAccount;
  @Input({ required: true }) targetActive!: boolean;
  @Input() isSubmitting = false;

  @Output() confirm = new EventEmitter<TravelerStatusUpdate>();
  @Output() cancel = new EventEmitter<void>();

  selectedReason: TravelerStatusReasonCode | '' = '';
  adminNote = '';
  readonly showValidation = signal<boolean>(false);

  readonly availableReasons = signal<readonly TravelerStatusReasonCode[]>([]);

  ngOnInit(): void {
    if (this.targetActive) {
      this.availableReasons.set(REACTIVATION_REASON_CODES);
    } else {
      this.availableReasons.set(DEACTIVATION_REASON_CODES);
    }
  }

  getReasonLabel(code: string): string {
    return (TRAVELER_REASON_CODE_LABELS as Record<string, string>)[code] || code;
  }

  onSubmit(): void {
    this.showValidation.set(true);

    if (!this.selectedReason || !this.adminNote.trim()) {
      return;
    }

    this.confirm.emit({
      is_active: this.targetActive,
      reason_code: this.selectedReason as TravelerStatusReasonCode,
      note: this.adminNote.trim(),
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop') && !this.isSubmitting) {
      this.cancel.emit();
    }
  }
}
