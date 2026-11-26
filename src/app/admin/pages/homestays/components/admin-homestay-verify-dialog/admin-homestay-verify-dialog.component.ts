import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HomestayResponse, HomestayVerificationRequest } from '../../../../core/models/admin-homestays.models';

@Component({
  selector: 'app-admin-homestay-verify-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="presentation">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-dialog-title"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-header">
          <div class="header-info">
            <span class="sub-title">Physical Property Verification</span>
            <h2 id="verify-dialog-title" class="dialog-title">
              {{ homestay?.name || 'Verify Homestay' }}
            </h2>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="cancel.emit()"
            aria-label="Cancel verification"
            id="btn-close-verify-x"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="dialog-body">
          <div class="info-callout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>
              <strong>Physical Verification:</strong> Records whether an on-site inspection or authorized identity audit verified this property. This status is distinct from listing approval.
            </span>
          </div>

          <!-- Status Selector -->
          <div class="decision-group">
            <label class="section-label">Select Verification Status</label>
            <div class="decision-options">
              <label class="decision-radio-card" [class.selected]="selectedStatus() === 'verified'">
                <input
                  type="radio"
                  name="verifyStatus"
                  value="verified"
                  [ngModel]="selectedStatus()"
                  (ngModelChange)="selectedStatus.set('verified')"
                />
                <div class="radio-content">
                  <span class="decision-title verified-color">Verified Property</span>
                  <span class="decision-desc">Confirms on-site compliance, location accuracy, and safety standards.</span>
                </div>
              </label>

              <label class="decision-radio-card" [class.selected]="selectedStatus() === 'unverified'">
                <input
                  type="radio"
                  name="verifyStatus"
                  value="unverified"
                  [ngModel]="selectedStatus()"
                  (ngModelChange)="selectedStatus.set('unverified')"
                />
                <div class="radio-content">
                  <span class="decision-title unverified-color">Unverified</span>
                  <span class="decision-desc">Pending scheduled field visit or physical verification review.</span>
                </div>
              </label>

              <label class="decision-radio-card" [class.selected]="selectedStatus() === 'rejected'">
                <input
                  type="radio"
                  name="verifyStatus"
                  value="rejected"
                  [ngModel]="selectedStatus()"
                  (ngModelChange)="selectedStatus.set('rejected')"
                />
                <div class="radio-content">
                  <span class="decision-title rejected-color">Verification Failed / Rejected</span>
                  <span class="decision-desc">Property failed safety, sanitary, or physical inspection standards.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Notes Input -->
          <div class="notes-group">
            <label for="verify-notes-input" class="section-label">
              Inspection Notes / Audit Observations (Optional)
            </label>
            <textarea
              id="verify-notes-input"
              class="notes-textarea"
              rows="3"
              placeholder="Record inspector remarks, certificate IDs, or verification notes..."
              [(ngModel)]="notesText"
              maxlength="1000"
            ></textarea>
            <span class="char-count">{{ notesText.length }}/1000 characters</span>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" (click)="cancel.emit()" id="btn-cancel-verify">
            Cancel
          </button>
          <button
            type="button"
            class="btn-submit"
            (click)="onSubmit()"
            id="btn-confirm-verify-submission"
          >
            Update Verification
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

      .info-callout {
        display: flex;
        gap: 0.75rem;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #166534;
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

      .verified-color {
        color: #0369a1;
      }

      .unverified-color {
        color: #64748b;
      }

      .rejected-color {
        color: #b91c1c;
      }

      .decision-desc {
        font-size: 0.8rem;
        color: #64748b;
      }

      .notes-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .notes-textarea {
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
      }

      .notes-textarea:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
      }

      .char-count {
        font-size: 0.75rem;
        color: #64748b;
        text-align: right;
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
        background-color: #0284c7;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .btn-submit:hover {
        background-color: #0369a1;
      }
    `,
  ],
})
export class AdminHomestayVerifyDialogComponent implements OnInit {
  @Input() homestay: HomestayResponse | null = null;
  @Output() submitVerification = new EventEmitter<HomestayVerificationRequest>();
  @Output() cancel = new EventEmitter<void>();

  readonly selectedStatus = signal<'verified' | 'unverified' | 'rejected'>('verified');
  notesText = '';

  ngOnInit(): void {
    if (this.homestay?.verification_status === 'verified') {
      this.selectedStatus.set('verified');
    } else if (this.homestay?.verification_status === 'rejected') {
      this.selectedStatus.set('rejected');
    } else {
      this.selectedStatus.set('verified');
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

  onSubmit(): void {
    const payload: HomestayVerificationRequest = {
      verification_status: this.selectedStatus(),
      notes: this.notesText.trim() ? this.notesText.trim() : undefined,
    };
    this.submitVerification.emit(payload);
  }
}
