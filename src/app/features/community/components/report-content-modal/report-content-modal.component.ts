import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  COMMUNITY_REPORT_REASONS,
  CommunityActorContext,
  CommunityReportEntityType,
} from '../../models/community.models';
import { CommunityService, formatCommunityError } from '../../services/community.service';

export interface ReportTarget {
  entityType: CommunityReportEntityType;
  entityId: number;
  previewText?: string;
}

@Component({
  selector: 'app-report-content-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (target) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" (click)="onClose()">
        <div class="report-modal" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2 id="report-modal-title">Report {{ target.entityType === 'post' ? 'Post' : 'Comment' }}</h2>
            <button type="button" class="close-x" (click)="onClose()" aria-label="Close report dialog">&times;</button>
          </header>

          @if (target.previewText) {
            <p class="target-snippet">“{{ target.previewText }}”</p>
          }

          @if (successMessage()) {
            <div class="alert-success" role="status">
              <p>{{ successMessage() }}</p>
              <button type="button" class="btn-primary" (click)="onClose()">Done</button>
            </div>
          } @else {
            <div class="modal-body">
              <label for="reportReason" class="field-label">Select a reason *</label>
              <select id="reportReason" [(ngModel)]="selectedReason" [disabled]="isSubmitting()">
                @for (reason of reasons; track reason) {
                  <option [value]="reason">{{ reason }}</option>
                }
              </select>

              <label for="reportDesc" class="field-label">Additional details (optional)</label>
              <textarea
                id="reportDesc"
                rows="3"
                maxlength="1000"
                [(ngModel)]="description"
                [disabled]="isSubmitting()"
                placeholder="Share context to help moderators review this report..."
              ></textarea>

              @if (errorMessage()) {
                <p class="alert-error" role="alert">{{ errorMessage() }}</p>
              }
            </div>

            <footer class="modal-foot">
              <button type="button" class="btn-secondary" (click)="onClose()" [disabled]="isSubmitting()">Cancel</button>
              <button type="button" class="btn-primary" (click)="submit()" [disabled]="isSubmitting() || isPreview">
                {{ isSubmitting() ? 'Submitting...' : 'Submit Report' }}
              </button>
            </footer>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(8, 43, 92, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .report-modal {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 40px rgba(8, 43, 92, 0.18);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-head h2 {
      margin: 0;
      font-size: 1.15rem;
      color: #082b5c;
    }
    .close-x {
      border: none;
      background: transparent;
      font-size: 1.5rem;
      color: #64748b;
      cursor: pointer;
    }
    .target-snippet {
      margin: 0;
      padding: 0.65rem 0.85rem;
      background: #f8fafc;
      border-left: 3px solid #0066ff;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #475569;
    }
    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .field-label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #082b5c;
    }
    select, textarea {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.9rem;
      color: #082b5c;
    }
    .alert-error {
      margin: 0;
      padding: 0.6rem 0.8rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 9px;
      color: #b91c1c;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .alert-success {
      padding: 0.75rem 0.9rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      color: #166534;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }
    .btn-primary {
      border: none;
      border-radius: 9px;
      padding: 0.58rem 1.15rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.58rem 1.05rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }
  `],
})
export class ReportContentModalComponent implements OnChanges {
  private readonly communityService = inject(CommunityService);

  @Input() target: ReportTarget | null = null;
  @Input() actorMode: CommunityActorContext = 'traveler';
  @Input() isPreview = false;

  @Output() closed = new EventEmitter<void>();
  @Output() reported = new EventEmitter<void>();

  readonly reasons = COMMUNITY_REPORT_REASONS;
  selectedReason = COMMUNITY_REPORT_REASONS[0];
  description = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  ngOnChanges(): void {
    this.selectedReason = COMMUNITY_REPORT_REASONS[0];
    this.description = '';
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  submit(): void {
    if (!this.target || this.isSubmitting()) return;
    if (this.isPreview) {
      this.errorMessage.set('Reporting content is disabled in Preview Mode.');
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.communityService
      .submitReport(
        {
          entity_type: this.target.entityType,
          entity_id: this.target.entityId,
          reason: this.selectedReason,
          description: this.description.trim() || null,
        },
        this.actorMode,
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Thank you. Your report has been submitted for moderator review.');
          this.reported.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(formatCommunityError(err, 'Could not submit your report.'));
        },
      });
  }

  onClose(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }
}
