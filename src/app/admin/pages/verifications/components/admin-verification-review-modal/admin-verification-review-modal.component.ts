import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  PROVIDER_CATEGORY_DISPLAY_NAMES,
  ProviderCategory,
  ProviderDetailResponse,
} from '../../../../core/models/admin-providers.models';
import {
  ProviderReviewActionResponse,
  ProviderVerificationItem,
  VerificationDocumentType,
  VERIFICATION_DOCUMENT_TITLES,
} from '../../../../core/models/admin-verifications.models';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';
import { AdminVerificationsService } from '../../../../core/services/admin-verifications.service';
import { canReviewVerifications } from '../../../../core/utils/admin-permissions.utils';

@Component({
  selector: 'app-admin-verification-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="presentation">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-left">
            <span class="id-tag">Verification #{{ item?.id }}</span>
            <h2 id="review-modal-title" class="modal-title">
              {{ item?.business_name || 'Verification Review' }}
            </h2>
            <div class="badge-row">
              <span class="status-pill" [ngClass]="item?.approval_status || 'pending'">
                {{ item?.approval_status | titlecase }}
              </span>
              <span class="category-pill">
                {{ getCategoryLabel(item?.provider_type) }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="onClose()"
            aria-label="Close verification inspection dialog"
            id="btn-close-modal-top"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <!-- Rejection Warning Banner (if rejected) -->
        <div *ngIf="item?.approval_status === 'rejected' && fullDetails()?.rejection_reason" class="alert-banner rejection">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="alert-text">
            <strong>Application Previously Rejected:</strong>
            <p>{{ fullDetails()?.rejection_reason }}</p>
          </div>
        </div>

        <!-- Approval Success Banner (if approved) -->
        <div *ngIf="item?.approval_status === 'approved'" class="alert-banner approved">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="alert-text">
            <strong>Application Approved:</strong>
            <p *ngIf="fullDetails()?.reviewed_at">
              Identity verification confirmed on {{ fullDetails()?.reviewed_at | date:'medium' }} by {{ fullDetails()?.reviewer_name || 'System Administrator' }}.
            </p>
            <p *ngIf="!fullDetails()?.reviewed_at">
              Identity verification confirmed by {{ fullDetails()?.reviewer_name || 'System Administrator' }}.
            </p>
          </div>
        </div>

        <!-- Error Feedback Banner -->
        <div *ngIf="actionError()" class="alert-banner error" role="alert">
          <div class="alert-text">{{ actionError() }}</div>
          <button type="button" class="alert-close" (click)="actionError.set(null)">&times;</button>
        </div>

        <!-- Modal Body: Split 2-Column Studio -->
        <div class="modal-body">
          <!-- Left Column: Applicant & Business Profile -->
          <div class="details-pane">
            <section class="pane-section">
              <h3 class="pane-heading">Applicant Overview</h3>
              <div class="details-grid">
                <div class="grid-item">
                  <span class="label">Full Name</span>
                  <span class="value bold">{{ item?.full_name || '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="label">Email Address</span>
                  <span class="value">{{ item?.email || '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="label">Business Name</span>
                  <span class="value bold">{{ item?.business_name || '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="label">Category</span>
                  <span class="value">{{ getCategoryLabel(item?.provider_type) }}</span>
                </div>
                <div class="grid-item">
                  <span class="label">District</span>
                  <span class="value">{{ item?.district || '—' }}</span>
                </div>
                <div class="grid-item">
                  <span class="label">Submitted Date</span>
                  <span class="value">{{ item?.created_at | date:'medium' }}</span>
                </div>
                <div class="grid-item" *ngIf="fullDetails()?.phone">
                  <span class="label">Contact Phone</span>
                  <span class="value">{{ fullDetails()?.phone }}</span>
                </div>
                <div class="grid-item" *ngIf="fullDetails()?.nic_number">
                  <span class="label">NIC Number</span>
                  <span class="value monospace">{{ fullDetails()?.nic_number }}</span>
                </div>
              </div>
            </section>

            <section class="pane-section" *ngIf="fullDetails()?.description">
              <h3 class="pane-heading">Business Description</h3>
              <p class="desc-box">{{ fullDetails()?.description }}</p>
            </section>

            <!-- Verification Review Actions (Only for pending state) -->
            <section class="pane-section decision-section" *ngIf="item?.approval_status === 'pending'">
              <h3 class="pane-heading">Administrative Decision</h3>

              <div *ngIf="!canReview()" class="unauthorized-notice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Administrator access is required to approve or reject verification applications.</span>
              </div>

              <div *ngIf="canReview() && !activeDialog()" class="decision-buttons">
                <button
                  type="button"
                  class="btn-decision approve"
                  (click)="openApprovalDialog()"
                  [disabled]="isSubmitting()"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Approve Application
                </button>

                <button
                  type="button"
                  class="btn-decision reject"
                  (click)="openRejectionDialog()"
                  [disabled]="isSubmitting()"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Reject Application
                </button>
              </div>

              <!-- Approval Confirmation Dialog -->
              <div *ngIf="activeDialog() === 'approve'" class="confirm-dialog approve-dialog">
                <h4 class="dialog-title">Approve Provider Verification?</h4>
                <p class="dialog-text">
                  Confirming approval for <strong>{{ item?.business_name }}</strong>. This marks their identity verification as verified and enables them to set up credentials.
                </p>
                <div class="dialog-actions">
                  <button type="button" class="btn-cancel" (click)="cancelDialog()" [disabled]="isSubmitting()">
                    Cancel
                  </button>
                  <button type="button" class="btn-confirm-approve" (click)="confirmApprove()" [disabled]="isSubmitting()">
                    <span *ngIf="isSubmitting()" class="spinner-sm"></span>
                    {{ isSubmitting() ? 'Approving...' : 'Confirm Approval' }}
                  </button>
                </div>
              </div>

              <!-- Rejection Reason Dialog -->
              <div *ngIf="activeDialog() === 'reject'" class="confirm-dialog reject-dialog">
                <h4 class="dialog-title">Reject Provider Verification</h4>
                <p class="dialog-text">
                  Please provide a mandatory, administrative explanation for rejecting <strong>{{ item?.business_name }}</strong> (5–500 characters).
                </p>
                <div class="textarea-wrapper">
                  <textarea
                    class="reason-textarea"
                    rows="3"
                    placeholder="Enter reason for rejection (e.g. Identity documents unreadable, blurred photo, or invalid registration)..."
                    [(ngModel)]="rejectionReasonText"
                    [disabled]="isSubmitting()"
                  ></textarea>
                  <div class="char-counter" [class.invalid]="rejectionReasonLength < 5 || rejectionReasonLength > 500">
                    {{ rejectionReasonLength }} / 500 characters (min 5)
                  </div>
                </div>
                <div class="dialog-actions">
                  <button type="button" class="btn-cancel" (click)="cancelDialog()" [disabled]="isSubmitting()">
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn-confirm-reject"
                    (click)="confirmReject()"
                    [disabled]="isSubmitting() || rejectionReasonLength < 5 || rejectionReasonLength > 500"
                  >
                    <span *ngIf="isSubmitting()" class="spinner-sm"></span>
                    {{ isSubmitting() ? 'Rejecting...' : 'Confirm Rejection' }}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Column: Document Inspection Studio -->
          <div class="document-studio-pane">
            <h3 class="pane-heading">Identity Document Inspection</h3>

            <!-- Document Tabs -->
            <div class="doc-tabs" role="tablist">
              <button
                *ngFor="let tab of availableDocTabs"
                type="button"
                class="doc-tab-btn"
                [class.active]="activeDocType() === tab.type"
                (click)="switchDocumentTab(tab.type)"
                role="tab"
                [attr.aria-selected]="activeDocType() === tab.type"
              >
                {{ tab.title }}
              </button>
            </div>

            <!-- Document Viewer Surface -->
            <div class="doc-viewer-surface">
              <div *ngIf="isDocLoading()" class="viewer-spinner">
                <div class="spinner"></div>
                <span>Streaming document preview...</span>
              </div>

              <div *ngIf="!isDocLoading() && docPreviewUrl()" class="preview-wrapper">
                <img
                  [src]="docPreviewUrl()"
                  [alt]="getDocTitle(activeDocType())"
                  class="document-image"
                />
              </div>

              <div *ngIf="!isDocLoading() && !docPreviewUrl()" class="no-doc-fallback">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p>This document is not available or has not been uploaded by the applicant.</p>
              </div>
            </div>

            <div class="security-caption">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Protected Identity Document. Ephemeral streaming strictly guarded by Administrator RBAC.</span>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="modal-footer">
          <button type="button" class="btn-secondary" (click)="onClose()" id="btn-close-modal-bottom">
            Close
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
        background-color: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 1rem;
        overflow-y: auto;
      }

      .modal-card {
        background: #ffffff;
        border-radius: 12px;
        width: 100%;
        max-width: 980px;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.15);
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

      .header-left {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .id-tag {
        font-family: monospace;
        font-size: 0.75rem;
        font-weight: 600;
        color: #0369a1;
        background-color: #e0f2fe;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        align-self: flex-start;
      }

      .modal-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f2c59;
        margin: 0;
      }

      .badge-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.2rem;
      }

      .status-pill {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
      }

      .status-pill.approved {
        background: #dcfce7;
        color: #15803d;
      }

      .status-pill.pending {
        background: #fef3c7;
        color: #b45309;
      }

      .status-pill.rejected {
        background: #fee2e2;
        color: #b91c1c;
      }

      .category-pill {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }

      .close-button {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.4rem;
        border-radius: 6px;
        transition: all 0.15s ease;

        &:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
      }

      .alert-banner {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        font-size: 0.875rem;
        border-bottom: 1px solid transparent;

        &.rejection {
          background-color: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        &.approved {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        &.error {
          background-color: #fff1f2;
          border-color: #fecdd3;
          color: #be123c;
          justify-content: space-between;
        }

        .alert-icon {
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .alert-text p {
          margin: 0.2rem 0 0 0;
          line-height: 1.4;
        }

        .alert-close {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          color: currentColor;
          cursor: pointer;
          line-height: 1;
        }
      }

      .modal-body {
        padding: 1.25rem 1.5rem;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr 1.15fr;
        gap: 1.5rem;
      }

      .pane-heading {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f2c59;
        margin: 0 0 0.85rem 0;
      }

      .details-pane {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .pane-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
      }

      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .grid-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .label {
          font-size: 0.725rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
        }

        .value {
          font-size: 0.85rem;
          color: #1e293b;

          &.bold {
            font-weight: 600;
          }

          &.monospace {
            font-family: monospace;
          }
        }
      }

      .desc-box {
        margin: 0;
        font-size: 0.85rem;
        color: #334155;
        line-height: 1.4;
      }

      .decision-section {
        background: #ffffff;
        border-color: #cbd5e1;
      }

      .unauthorized-notice {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: #92400e;
        background: #fef3c7;
        padding: 0.65rem 0.85rem;
        border-radius: 6px;
        border: 1px solid #fde68a;
      }

      .decision-buttons {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;

        .btn-decision {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;

          &.approve {
            background-color: #15803d;
            color: #ffffff;

            &:hover:not(:disabled) {
              background-color: #166534;
            }
          }

          &.reject {
            background-color: #b91c1c;
            color: #ffffff;

            &:hover:not(:disabled) {
              background-color: #991b1b;
            }
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .confirm-dialog {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 0.5rem;

        &.approve-dialog {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        &.reject-dialog {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
        }

        .dialog-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0 0 0.4rem 0;
        }

        &.approve-dialog .dialog-title {
          color: #166534;
        }

        &.reject-dialog .dialog-title {
          color: #991b1b;
        }

        .dialog-text {
          font-size: 0.825rem;
          color: #334155;
          margin: 0 0 0.85rem 0;
          line-height: 1.4;
        }

        .textarea-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.85rem;

          .reason-textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 0.825rem;
            outline: none;
            resize: vertical;

            &:focus {
              border-color: #b91c1c;
            }
          }

          .char-counter {
            font-size: 0.725rem;
            color: #64748b;
            text-align: right;

            &.invalid {
              color: #dc2626;
              font-weight: 600;
            }
          }
        }

        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;

          .btn-cancel {
            padding: 0.4rem 0.85rem;
            font-size: 0.8rem;
            font-weight: 600;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            cursor: pointer;
            color: #475569;

            &:hover:not(:disabled) {
              background: #f1f5f9;
            }
          }

          .btn-confirm-approve {
            padding: 0.4rem 0.85rem;
            font-size: 0.8rem;
            font-weight: 600;
            background: #15803d;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            color: #ffffff;

            &:hover:not(:disabled) {
              background: #166534;
            }
          }

          .btn-confirm-reject {
            padding: 0.4rem 0.85rem;
            font-size: 0.8rem;
            font-weight: 600;
            background: #b91c1c;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            color: #ffffff;

            &:hover:not(:disabled) {
              background: #991b1b;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }

      /* Document Studio Pane */
      .document-studio-pane {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .doc-tabs {
        display: flex;
        gap: 0.5rem;
        background: #f1f5f9;
        padding: 0.25rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;

        .doc-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.4rem 0.5rem;
          font-size: 0.775rem;
          font-weight: 600;
          color: #64748b;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;

          &:hover {
            color: #1e293b;
          }

          &.active {
            background: #ffffff;
            color: #0f2c59;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
        }
      }

      .doc-viewer-surface {
        background: #0f172a;
        border-radius: 8px;
        min-height: 380px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        border: 1px solid #334155;

        .viewer-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #94a3b8;
          font-size: 0.85rem;

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #334155;
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        }

        .preview-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;

          .document-image {
            max-width: 100%;
            max-height: 360px;
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          }
        }

        .no-doc-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.85rem;
          padding: 2rem;
          text-align: center;
        }
      }

      .security-caption {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.725rem;
        color: #64748b;
      }

      .modal-footer {
        padding: 0.875rem 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        background-color: #f8fafc;

        .btn-secondary {
          padding: 0.45rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;

          &:hover {
            background-color: #f1f5f9;
          }
        }
      }

      .spinner-sm {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        vertical-align: middle;
        margin-right: 0.25rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 820px) {
        .modal-body {
          grid-template-columns: 1fr;
        }

        .doc-viewer-surface {
          min-height: 280px;
        }
      }
    `,
  ],
})
export class AdminVerificationReviewModalComponent implements OnInit, OnChanges, OnDestroy {
  private readonly verificationsService = inject(AdminVerificationsService);
  private readonly authService = inject(AdminAuthService);

  @Input() item: ProviderVerificationItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() decisionComplete = new EventEmitter<{ providerId: number; status: string }>();

  readonly fullDetails = signal<ProviderDetailResponse | null>(null);
  readonly activeDocType = signal<VerificationDocumentType>('selfie');
  readonly docPreviewUrl = signal<string | null>(null);
  readonly isDocLoading = signal<boolean>(false);

  readonly isSubmitting = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);
  readonly activeDialog = signal<'approve' | 'reject' | null>(null);

  rejectionReasonText = '';

  get rejectionReasonLength(): number {
    return (this.rejectionReasonText || '').trim().length;
  }

  readonly availableDocTabs: { type: VerificationDocumentType; title: string }[] = [
    { type: 'selfie', title: 'Live Selfie' },
    { type: 'nic_front', title: 'NIC / Passport Front' },
    { type: 'nic_back', title: 'NIC Back' },
  ];

  ngOnInit(): void {
    if (this.item) {
      this.loadDetailsAndDocument();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.item) {
      this.cancelDialog();
      this.loadDetailsAndDocument();
    }
  }

  ngOnDestroy(): void {
    this.cleanUpDocUrl();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeDialog()) {
      this.cancelDialog();
    } else {
      this.onClose();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.isSubmitting()) return;
    this.cleanUpDocUrl();
    this.closed.emit();
    this.close.emit();
  }

  canReview(): boolean {
    return canReviewVerifications(this.authService.currentUser());
  }

  getCategoryLabel(type?: string): string {
    if (!type) return 'Service Provider';
    return PROVIDER_CATEGORY_DISPLAY_NAMES[type as ProviderCategory] || type;
  }

  getDocTitle(type: VerificationDocumentType): string {
    return VERIFICATION_DOCUMENT_TITLES[type] || 'Identity Document';
  }

  private cleanUpDocUrl(): void {
    const current = this.docPreviewUrl();
    if (current) {
      this.verificationsService.revokeDocumentUrl(current);
      this.docPreviewUrl.set(null);
    }
  }

  private loadDetailsAndDocument(): void {
    if (!this.item) return;

    this.verificationsService.getVerificationDetails(this.item.id).subscribe({
      next: (details) => {
        this.fullDetails.set(details);
      },
      error: () => {},
    });

    this.switchDocumentTab('selfie');
  }

  switchDocumentTab(docType: VerificationDocumentType): void {
    if (!this.item) return;

    this.cleanUpDocUrl();
    this.activeDocType.set(docType);
    this.isDocLoading.set(true);

    this.verificationsService.getDocument(this.item.id, docType).subscribe({
      next: (url) => {
        this.docPreviewUrl.set(url);
        this.isDocLoading.set(false);
      },
      error: () => {
        this.docPreviewUrl.set(null);
        this.isDocLoading.set(false);
      },
    });
  }

  openApprovalDialog(): void {
    this.actionError.set(null);
    this.activeDialog.set('approve');
  }

  openRejectionDialog(): void {
    this.actionError.set(null);
    this.rejectionReasonText = '';
    this.activeDialog.set('reject');
  }

  cancelDialog(): void {
    this.activeDialog.set(null);
    this.rejectionReasonText = '';
    this.actionError.set(null);
  }

  confirmApprove(): void {
    if (!this.item || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.actionError.set(null);

    this.verificationsService.approveVerification(this.item.id).subscribe({
      next: (res: ProviderReviewActionResponse) => {
        this.isSubmitting.set(false);
        this.activeDialog.set(null);
        if (this.item) {
          this.item.approval_status = 'approved';
        }
        this.decisionComplete.emit({ providerId: res.provider_id, status: 'approved' });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.actionError.set(err.message || 'Failed to approve application. Please retry.');
      },
    });
  }

  confirmReject(): void {
    if (!this.item || this.isSubmitting()) return;

    const trimmed = (this.rejectionReasonText || '').trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      this.actionError.set('Rejection reason must be between 5 and 500 characters.');
      return;
    }

    this.isSubmitting.set(true);
    this.actionError.set(null);

    this.verificationsService.rejectVerification(this.item.id, { reason: trimmed }).subscribe({
      next: (res: ProviderReviewActionResponse) => {
        this.isSubmitting.set(false);
        this.activeDialog.set(null);
        if (this.item) {
          this.item.approval_status = 'rejected';
        }
        this.decisionComplete.emit({ providerId: res.provider_id, status: 'rejected' });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.actionError.set(err.message || 'Failed to reject application. Please retry.');
      },
    });
  }
}
