import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="confirm-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        (click)="cancel.emit()"
      >
        <div class="confirm-card" (click)="$event.stopPropagation()">
          <h3 id="confirm-delete-title">{{ title }}</h3>
          <p>{{ message }}</p>
          @if (errorMessage) {
            <p class="confirm-error" role="alert">{{ errorMessage }}</p>
          }
          <div class="confirm-actions">
            <button type="button" class="btn-secondary" (click)="cancel.emit()" [disabled]="isBusy">
              Cancel
            </button>
            <button type="button" class="btn-danger" (click)="confirm.emit()" [disabled]="isBusy">
              {{ isBusy ? 'Deleting...' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1120;
      background: rgba(8, 43, 92, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .confirm-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 20px 50px rgba(8, 43, 92, 0.25);
    }
    h3 {
      margin: 0 0 0.5rem;
      color: #082b5c;
      font-size: 1.1rem;
    }
    p {
      margin: 0 0 1rem;
      color: #475569;
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .confirm-error {
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.85rem;
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }
    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.55rem 1rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-danger {
      border: none;
      border-radius: 9px;
      padding: 0.55rem 1.05rem;
      background: #dc2626;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `],
})
export class ConfirmDeleteModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Delete Post';
  @Input() message = 'Are you sure you want to delete this item? This action cannot be undone.';
  @Input() confirmLabel = 'Delete';
  @Input() isBusy = false;
  @Input() errorMessage: string | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
