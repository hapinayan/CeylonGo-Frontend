import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TravelerBackNavigationService } from '../../../core/services/traveler-back-navigation.service';

@Component({
  selector: 'app-traveler-back',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (backNav.showBackButton()) {
      <div class="traveler-back-strip">
        <div class="traveler-back-container">
          <button
            type="button"
            class="traveler-back-btn"
            (click)="backNav.goBack()"
            aria-label="Go back to previous page"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .traveler-back-strip {
      width: 100%;
      background: transparent;
    }

    .traveler-back-container {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 12px var(--cg-page-padding, 32px) 6px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
    }

    .traveler-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px 4px 0;
      border: none;
      background: transparent;
      color: #0066ff;
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      border-radius: 6px;
      transition: color 0.15s ease, transform 0.15s ease;

      &:hover {
        color: #0052cc;
        transform: translateX(-2px);
      }

      &:focus-visible {
        outline: 2px solid #0066ff;
        outline-offset: 3px;
      }
    }

    @media (max-width: 640px) {
      .traveler-back-container {
        padding: 10px 16px 4px;
      }
    }
  `],
})
export class TravelerBackComponent {
  readonly backNav = inject(TravelerBackNavigationService);
}
