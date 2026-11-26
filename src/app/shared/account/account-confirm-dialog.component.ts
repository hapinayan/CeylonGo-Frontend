import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open()) {
      <div class="dialog-backdrop" role="presentation" (click)="!busy() && cancelled.emit()">
        <div
          class="dialog-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-confirm-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="account-confirm-title">{{ title() }}</h2>
          <p class="dialog-message">{{ message() }}</p>

          @if (showReasonInput()) {
            <label class="reason-field">
              <span>{{ reasonLabel() }}</span>
              <textarea
                rows="3"
                maxlength="500"
                [(ngModel)]="reasonValue"
                [placeholder]="reasonPlaceholder()"
                [disabled]="busy()"
              ></textarea>
            </label>
          }

          @if (errorMessage()) {
            <p class="dialog-error" role="alert">{{ errorMessage() }}</p>
          }

          <div class="dialog-actions">
            <button type="button" class="btn-secondary" (click)="cancelled.emit()" [disabled]="busy()">
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              class="btn-primary"
              [class.danger]="destructive()"
              (click)="confirmed.emit(reasonValue.trim())"
              [disabled]="busy()"
            >
              {{ busy() ? busyLabel() : confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(15, 23, 42, 0.48);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .dialog-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.35rem;
      box-shadow: 0 12px 32px rgba(8, 43, 92, 0.14);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    h2 {
      margin: 0;
      color: #082b5c;
      font-size: 1.12rem;
      font-weight: 700;
    }

    .dialog-message {
      margin: 0;
      color: #475569;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .reason-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      span {
        font-size: 0.82rem;
        font-weight: 600;
        color: #0f172a;
      }

      textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 0.6rem 0.75rem;
        font: inherit;
        font-size: 0.88rem;
        resize: vertical;

        &:focus {
          outline: 2px solid #bfdbfe;
          border-color: #0066ff;
        }
      }
    }

    .dialog-error {
      margin: 0;
      padding: 0.6rem 0.75rem;
      border-radius: 9px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.84rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .btn-secondary {
      min-height: 40px;
      padding: 0 1rem;
      border-radius: 9px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: #f8fafc;
      }
    }

    .btn-primary {
      min-height: 40px;
      padding: 0 1.05rem;
      border-radius: 9px;
      border: none;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;

      &.danger {
        background: #dc2626;
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
    }
  `],
})
export class AccountConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirm Action');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly busyLabel = input('Processing...');
  readonly destructive = input(false);
  readonly busy = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly showReasonInput = input(false);
  readonly reasonLabel = input('Reason (optional)');
  readonly reasonPlaceholder = input('Add an optional note...');

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  reasonValue = '';
}
