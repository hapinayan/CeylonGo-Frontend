import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HomestayResponse, HomestayReviewRequest } from '../../../../core/models/admin-homestays.models';

@Component({
  selector: 'app-admin-homestay-review-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="presentation">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-header">
          <div class="header-info">
            <span class="sub-title">Listing Review Decision</span>
            <h2 id="review-dialog-title" class="dialog-title">
              {{ homestay?.name || 'Review Homestay' }}
            </h2>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="cancel.emit()"
            aria-label="Cancel review"
            id="btn-close-review-x"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="dialog-body">
          <div class="warning-callout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>
              <strong>Important:</strong> Approving or rejecting a listing operates exclusively on this accommodation property. It does not alter the provider's account or verification standing.
            </span>
          </div>

          <!-- Decision Selector -->
          <div class="decision-group">
            <label class="section-label">Select Review Decision</label>
            <div class="decision-options">
              <label class="decision-radio-card" [class.selected]="selectedDecision() === 'approved'">
                <input
                  type="radio"
                  name="reviewDecision"
                  value="approved"
                  [ngModel]="selectedDecision()"
                  (ngModelChange)="onDecisionChange('approved')"
                />
                <div class="radio-content">
                  <span class="decision-title approve-color">Approve Listing</span>
                  <span class="decision-desc">Make property active and bookable on the CeylonGo traveler discovery platform.</span>
                </div>
              </label>

              <label class="decision-radio-card" [class.selected]="selectedDecision() === 'rejected'">
                <input
                  type="radio"
                  name="reviewDecision"
                  value="rejected"
                  [ngModel]="selectedDecision()"
                  (ngModelChange)="onDecisionChange('rejected')"
                />
                <div class="radio-content">
                  <span class="decision-title reject-color">Reject Listing</span>
                  <span class="decision-desc">Decline listing due to non-compliance or incomplete requirements (Reason required).</span>
                </div>
              </label>

              <label class="decision-radio-card" [class.selected]="selectedDecision() === 'suspended'">
                <input
                  type="radio"
                  name="reviewDecision"
                  value="suspended"
                  [ngModel]="selectedDecision()"
                  (ngModelChange)="onDecisionChange('suspended')"
                />
                <div class="radio-content">
                  <span class="decision-title suspend-color">Suspend Listing</span>
                  <span class="decision-desc">Temporarily take listing offline pending investigation or safety review.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Reason Input -->
          <div class="reason-group" *ngIf="selectedDecision() === 'rejected' || selectedDecision() === 'suspended'">
            <label for="review-reason-input" class="section-label">
              {{ selectedDecision() === 'rejected' ? 'Rejection Reason (Mandatory)' : 'Suspension Reason (Optional)' }}
            </label>
            <textarea
              id="review-reason-input"
              class="reason-textarea"
              rows="3"
              placeholder="Provide a clear, actionable reason for the host provider..."
              [(ngModel)]="reasonText"
              maxlength="1000"
            ></textarea>
            <div class="textarea-footer">
              <span class="char-count">{{ reasonText.length }}/1000 characters</span>
              <span class="error-hint" *ngIf="isReasonInvalid()">
                Reason must be at least 5 characters long.
              </span>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" (click)="cancel.emit()" id="btn-cancel-review">
            Cancel
          </button>
          <button
            type="button"
            class="btn-submit"
            [class.btn-approve]="selectedDecision() === 'approved'"
            [class.btn-reject]="selectedDecision() === 'rejected'"
            [class.btn-suspend]="selectedDecision() === 'suspended'"
            [disabled]="isSubmitDisabled()"
            (click)="onSubmit()"
            id="btn-confirm-review-submission"
          >
            Confirm {{ selectedDecision() | titlecase }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1060;
        padding: 1rem;
      }

      .modal-card {
        background: #ffffff;
        border-radius: 12px;
        width: 100%;
        max-width: 600px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        background-color: #f8fafc;
      }

      .sub-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: #0284c7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .dialog-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0.2rem 0 0;
      }

      .close-button {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.35rem;
        border-radius: 6px;
      }

      .close-button:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .dialog-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .warning-callout {
        display: flex;
        gap: 0.75rem;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #0369a1;
        font-size: 0.85rem;
        line-height: 1.4;
      }

      .decision-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .section-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .decision-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .decision-radio-card {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .decision-radio-card:hover {
        border-color: #94a3b8;
        background-color: #f8fafc;
      }

      .decision-radio-card.selected {
        border-color: #0284c7;
        background-color: #f0f9ff;
      }

      .decision-radio-card input[type='radio'] {
        margin-top: 0.25rem;
      }

      .radio-content {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .decision-title {
        font-size: 0.9rem;
        font-weight: 700;
      }

      .approve-color {
        color: #15803d;
      }

      .reject-color {
        color: #b91c1c;
      }

      .suspend-color {
        color: #b45309;
      }

      .decision-desc {
        font-size: 0.8rem;
        color: #64748b;
      }

      .reason-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .reason-textarea {
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
      }

      .reason-textarea:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
      }

      .textarea-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: #64748b;
      }

      .error-hint {
        color: #dc2626;
        font-weight: 600;
      }

      .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        background-color: #f8fafc;
      }

      .btn-cancel {
        padding: 0.5rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        cursor: pointer;
      }

      .btn-submit {
        padding: 0.5rem 1.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: opacity 0.2s;
      }

      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-approve {
        background-color: #16a34a;
      }

      .btn-reject {
        background-color: #dc2626;
      }

      .btn-suspend {
        background-color: #d97706;
      }
    `,
  ],
})
export class AdminHomestayReviewDialogComponent implements OnInit {
  @Input() homestay: HomestayResponse | null = null;
  @Output() submitDecision = new EventEmitter<HomestayReviewRequest>();
  @Output() cancel = new EventEmitter<void>();

  readonly selectedDecision = signal<'approved' | 'rejected' | 'suspended'>('approved');
  reasonText = '';

  ngOnInit(): void {
    if (this.homestay?.approval_status === 'approved') {
      this.selectedDecision.set('suspended');
    } else {
      this.selectedDecision.set('approved');
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }

  onDecisionChange(decision: 'approved' | 'rejected' | 'suspended'): void {
    this.selectedDecision.set(decision);
  }

  isReasonInvalid(): boolean {
    if (this.selectedDecision() === 'rejected') {
      return !this.reasonText || this.reasonText.trim().length < 5;
    }
    return false;
  }

  isSubmitDisabled(): boolean {
    if (this.selectedDecision() === 'rejected') {
      return this.isReasonInvalid();
    }
    return false;
  }

  onSubmit(): void {
    if (this.isSubmitDisabled()) return;

    const payload: HomestayReviewRequest = {
      decision: this.selectedDecision(),
      reason: this.reasonText.trim() ? this.reasonText.trim() : undefined,
    };

    this.submitDecision.emit(payload);
  }
}
