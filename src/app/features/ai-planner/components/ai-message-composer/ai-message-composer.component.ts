import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AiQuickPreferenceDraft,
  buildNaturalLanguageTripPrompt,
} from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-message-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="composer-outer">
      <div class="composer-box">
        <label for="aiMessageInput" class="sr-only">Message CeylonGo AI</label>
        <textarea
          #textInput
          id="aiMessageInput"
          rows="1"
          maxlength="2500"
          [ngModel]="text"
          (ngModelChange)="onTextChange($event)"
          (keydown)="onKeyDown($event)"
          [disabled]="isSubmitting"
          placeholder="Ask me anything about your trip..."
        ></textarea>

        <div class="composer-controls">
          <button
            type="button"
            class="prefs-btn"
            (click)="isPrefsOpen.set(true)"
            [disabled]="isSubmitting"
            title="Set trip preferences"
          >
            Preferences
          </button>

          <button
            type="button"
            class="send-btn"
            (click)="triggerSend()"
            [disabled]="isSubmitting || text.trim().length === 0"
            aria-label="Send message"
          >
            @if (isSubmitting) {
              <span class="send-spinner" aria-hidden="true"></span>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            }
          </button>
        </div>
      </div>

      <div class="composer-meta">
        <span>Powered by CeylonGo AI</span>
        <span>{{ text.length }} / 2500</span>
      </div>
    </div>

    @if (isPrefsOpen()) {
      <div class="prefs-backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-prefs-title" (click)="isPrefsOpen.set(false)">
        <form class="prefs-modal" (click)="$event.stopPropagation()" (submit)="$event.preventDefault(); applyPreferences()">
          <header class="prefs-head">
            <h2 id="quick-prefs-title">Quick Trip Preferences</h2>
            <button type="button" class="close-x" (click)="isPrefsOpen.set(false)" aria-label="Close preferences">&times;</button>
          </header>

          <div class="prefs-grid">
            <label>
              <span>Destination *</span>
              <input type="text" [(ngModel)]="prefDraft.destination" name="prefDest" placeholder="e.g., Jaffna, Ella, Galle" required />
            </label>
            <label>
              <span>Duration</span>
              <input type="text" [(ngModel)]="prefDraft.duration" name="prefDur" placeholder="e.g., 5-day" />
            </label>
            <label>
              <span>Start Date</span>
              <input type="date" [(ngModel)]="prefDraft.startDate" name="prefDate" />
            </label>
            <label>
              <span>Travelers</span>
              <input type="number" min="1" max="50" [(ngModel)]="prefDraft.travelers" name="prefTravelers" />
            </label>
            <label>
              <span>Budget (LKR)</span>
              <input type="number" min="1000" step="1000" [(ngModel)]="prefDraft.budgetLkr" name="prefBudget" placeholder="e.g., 100000" />
            </label>
            <label>
              <span>Interests</span>
              <input type="text" [(ngModel)]="prefDraft.interests" name="prefInterests" placeholder="e.g., heritage, coastal food, tea trails" />
            </label>
          </div>

          <footer class="prefs-foot">
            <button type="button" class="btn-secondary" (click)="isPrefsOpen.set(false)">Cancel</button>
            <button type="submit" class="btn-primary">Add to Composer</button>
          </footer>
        </form>
      </div>
    }
  `,
  styles: [`
    .composer-outer {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .composer-box {
      display: flex;
      align-items: flex-end;
      gap: 0.55rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      background: #ffffff;
      padding: 0.55rem 0.65rem 0.55rem 0.9rem;
      transition: border-color 0.15s ease;

      &:focus-within {
        border-color: #0066ff;
      }

      textarea {
        flex: 1;
        border: none;
        background: transparent;
        resize: none;
        font: inherit;
        font-size: 0.95rem;
        line-height: 1.45;
        color: #0f172a;
        max-height: 168px;
        overflow-y: auto;
        padding: 0.3rem 0;

        &:focus {
          outline: none;
        }
      }
    }

    .composer-controls {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }

    .prefs-btn {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.4rem 0.7rem;
      background: #f8fafc;
      color: #082b5c;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: #0066ff;
        color: #0066ff;
      }
    }

    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: #0066ff;
      color: #ffffff;
      display: grid;
      place-items: center;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .send-spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    .composer-meta {
      display: flex;
      justify-content: space-between;
      padding: 0 0.35rem;
      color: #64748b;
      font-size: 0.75rem;
    }

    .prefs-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(8, 43, 92, 0.55);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .prefs-modal {
      width: 100%;
      max-width: 500px;
      background: #ffffff;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .prefs-head {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        margin: 0;
        color: #082b5c;
        font-size: 1.08rem;
      }
    }

    .close-x {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .prefs-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;

      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        span {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
        }

        input {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.45rem 0.65rem;
          font: inherit;
          font-size: 0.88rem;
        }
      }
    }

    .prefs-foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
    }

    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.5rem 0.95rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary {
      border: none;
      border-radius: 9px;
      padding: 0.5rem 1rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 540px) {
      .prefs-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
})
export class AiMessageComposerComponent implements OnChanges {
  @Input() text = '';
  @Input() isSubmitting = false;

  @Output() textChange = new EventEmitter<string>();
  @Output() submitMessage = new EventEmitter<string>();

  @ViewChild('textInput') textInput?: ElementRef<HTMLTextAreaElement>;

  readonly isPrefsOpen = signal(false);
  prefDraft: AiQuickPreferenceDraft = {
    destination: '',
    duration: '3-day',
    travelers: 2,
    budgetLkr: null,
    interests: '',
    startDate: '',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      setTimeout(() => this.adjustHeight(), 0);
    }
  }

  onTextChange(val: string): void {
    this.text = val;
    this.textChange.emit(val);
    this.adjustHeight();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.triggerSend();
    }
  }

  triggerSend(): void {
    if (this.isSubmitting) return;
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.submitMessage.emit(trimmed);
  }

  applyPreferences(): void {
    const prompt = buildNaturalLanguageTripPrompt(this.prefDraft);
    this.onTextChange(prompt);
    this.isPrefsOpen.set(false);
    this.focusInput();
  }

  focusInput(): void {
    this.textInput?.nativeElement?.focus();
    this.adjustHeight();
  }

  private adjustHeight(): void {
    const el = this.textInput?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }
}
