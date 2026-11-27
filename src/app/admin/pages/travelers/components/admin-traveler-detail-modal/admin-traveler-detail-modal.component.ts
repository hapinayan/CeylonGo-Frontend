import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import {
  TravelerAccount,
  TRAVELER_REASON_CODE_LABELS,
  TravelerStatusEvent,
} from '../../../../core/models/admin-travelers.models';
import { AdminTravelersService } from '../../../../core/services/admin-travelers.service';

@Component({
  selector: 'app-admin-traveler-detail-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-info">
            <span class="eyebrow">Traveler Profile #{{ traveler.id }}</span>
            <h2 id="modal-title" class="modal-title">{{ traveler.full_name }}</h2>
          </div>
          <button type="button" class="close-btn" (click)="close.emit()" aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Profile Summary Grid -->
          <div class="profile-grid">
            <div class="info-group">
              <span class="info-label">Full Name</span>
              <span class="info-value">{{ traveler.full_name }}</span>
            </div>
            <div class="info-group">
              <span class="info-label">Email Address</span>
              <span class="info-value">{{ traveler.email }}</span>
            </div>
            <div class="info-group">
              <span class="info-label">Account Status</span>
              <span class="status-badge" [class.active]="traveler.is_active" [class.suspended]="!traveler.is_active">
                {{ traveler.is_active ? 'Active' : 'Suspended' }}
              </span>
            </div>
            <div class="info-group">
              <span class="info-label">Member Since</span>
              <span class="info-value">{{ traveler.created_at | date:'mediumDate' }}</span>
            </div>
          </div>

          <!-- Status History Audit Trail -->
          <div class="history-section">
            <h3 class="section-title">Status Change History</h3>

            @if (isLoadingHistory()) {
              <div class="loading-state">Loading status history...</div>
            } @else if (historyEvents().length === 0) {
              <div class="empty-history">
                <p>No historical status changes recorded. This account is in its original state.</p>
              </div>
            } @else {
              <div class="timeline">
                @for (event of historyEvents(); track event.created_at + event.admin_user_id) {
                  <div class="timeline-item">
                    <div class="timeline-marker" [class.active]="event.is_active" [class.suspended]="!event.is_active"></div>
                    <div class="timeline-content">
                      <div class="event-header">
                        <span class="event-action" [class.reactivated]="event.is_active" [class.deactivated]="!event.is_active">
                          {{ event.is_active ? 'Account Reactivated' : 'Account Suspended' }}
                        </span>
                        <span class="event-date">{{ event.created_at | date:'medium' }}</span>
                      </div>
                      <div class="event-reason">
                        <strong>Reason:</strong> {{ formatReasonCode(event.reason_code) }}
                      </div>
                      <div class="event-note">
                        <strong>Admin Note:</strong> "{{ event.note }}"
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="close.emit()">Close</button>
        </div>
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
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
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
      background: #f8fafc;

      .eyebrow {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #0284c7;
        letter-spacing: 0.05em;
      }

      .modal-title {
        font-size: 1.25rem;
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
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
      }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;

      .info-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .info-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .info-value {
          font-size: 0.875rem;
          color: #0f172a;
          font-weight: 600;
        }
      }
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;

      &.active {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }

      &.suspended {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fca5a5;
      }
    }

    .history-section {
      .section-title {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 0.75rem;
      }

      .empty-history, .loading-state {
        font-size: 0.875rem;
        color: #64748b;
        font-style: italic;
        padding: 0.75rem;
        background: #f8fafc;
        border-radius: 6px;
      }
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
      padding-left: 1.25rem;
      border-left: 2px solid #e2e8f0;

      .timeline-item {
        position: relative;

        .timeline-marker {
          position: absolute;
          left: -1.625rem;
          top: 0.25rem;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #ffffff;

          &.active { background: #16a34a; }
          &.suspended { background: #dc2626; }
        }

        .timeline-content {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.75rem;
          font-size: 0.8125rem;

          .event-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.375rem;

            .event-action {
              font-weight: 700;
              &.reactivated { color: #16a34a; }
              &.deactivated { color: #dc2626; }
            }

            .event-date {
              color: #64748b;
              font-size: 0.75rem;
            }
          }

          .event-reason {
            color: #334155;
            margin-bottom: 0.25rem;
          }

          .event-note {
            color: #475569;
            font-style: italic;
          }
        }
      }
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #f8fafc;

      .btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;

        &:hover { background: #f1f5f9; }
      }
    }
  `]
})
export class AdminTravelerDetailModalComponent implements OnInit {
  @Input({ required: true }) traveler!: TravelerAccount;
  @Output() close = new EventEmitter<void>();

  private readonly travelersService = inject(AdminTravelersService);

  readonly historyEvents = signal<TravelerStatusEvent[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    if (!this.traveler?.id) return;
    this.isLoadingHistory.set(true);
    this.travelersService.getTravelerHistory(this.traveler.id).subscribe({
      next: (events) => {
        this.historyEvents.set(events || []);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
      },
    });
  }

  formatReasonCode(code: string): string {
    return (TRAVELER_REASON_CODE_LABELS as Record<string, string>)[code] || code;
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }
}
