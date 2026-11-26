import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

import { AI_PLANNER_SUGGESTIONS } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-welcome-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="welcome-wrap" aria-label="AI Trip Planner Welcome">
      <div class="sparkle-badge" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          <path d="M5 3L5.9 5.5L8.4 6.4L5.9 7.3L5 9.8L4.1 7.3L1.6 6.4L4.1 5.5L5 3Z" />
        </svg>
      </div>

      <h1>Where would you like to go?</h1>
      <p class="welcome-desc">Discover Sri Lanka with your personal AI travel assistant.</p>

      <div class="suggestion-grid">
        @for (item of suggestions; track item.id) {
          <button
            type="button"
            class="suggestion-card"
            (click)="suggestionSelected.emit(item.prompt)"
          >
            <div class="card-icon" aria-hidden="true">
              @switch (item.icon) {
                @case ('map') {
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                  </svg>
                }
                @case ('home') {
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                }
                @case ('wallet') {
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                  </svg>
                }
                @default {
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                  </svg>
                }
              }
            </div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.prompt }}</span>
          </button>
        }
      </div>
    </section>
  `,
  styles: [`
    .welcome-wrap {
      max-width: 720px;
      margin: 2.25rem auto 1.25rem;
      padding: 0 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .sparkle-badge {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: #eaf2ff;
      border: 1px solid #bfdbfe;
      display: grid;
      place-items: center;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0 0 0.45rem;
      color: #082b5c;
      font-size: clamp(1.45rem, 2.5vw, 1.9rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .welcome-desc {
      margin: 0 0 1.6rem;
      color: #64748b;
      font-size: 0.98rem;
    }

    .suggestion-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .suggestion-card {
      text-align: left;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      padding: 0.9rem 1rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      transition: border-color 0.15s ease, background 0.15s ease;

      &:hover {
        border-color: #0066ff;
        background: #f8fbff;
      }

      &:focus-visible {
        outline: 2px solid #0066ff;
        outline-offset: 2px;
      }

      strong {
        color: #082b5c;
        font-size: 0.92rem;
        font-weight: 700;
      }

      span {
        color: #64748b;
        font-size: 0.83rem;
        line-height: 1.4;
      }
    }

    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #eaf2ff;
      display: grid;
      place-items: center;
      margin-bottom: 0.15rem;
    }

    @media (max-width: 600px) {
      .suggestion-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
})
export class AiWelcomeScreenComponent {
  readonly suggestions = AI_PLANNER_SUGGESTIONS;
  @Output() suggestionSelected = new EventEmitter<string>();
}
