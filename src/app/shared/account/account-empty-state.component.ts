import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ExperienceIcon } from '../../experiences/components/icon';

@Component({
  selector: 'app-account-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink, ExperienceIcon],
  template: `
    <section class="empty-card" role="status">
      <div class="empty-icon-circle" aria-hidden="true">
        <app-experience-icon [name]="icon()" />
      </div>
      <h2>{{ heading() }}</h2>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (actionLabel()) {
        @if (actionRoute(); as target) {
          <a [routerLink]="target" class="empty-cta-btn">{{ actionLabel() }}</a>
        } @else {
          <button type="button" class="empty-cta-btn" (click)="actionClicked.emit()">
            {{ actionLabel() }}
          </button>
        }
      }
    </section>
  `,
  styles: [`
    .empty-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 2.75rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
    }

    .empty-icon-circle {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #edf5ff;
      border: 1px solid #dbeafe;
      color: #0066ff;
      display: grid;
      place-items: center;
      font-size: 1.75rem;
      margin-bottom: 0.35rem;
    }

    h2 {
      margin: 0;
      color: #082b5c;
      font-size: 1.18rem;
      font-weight: 700;
    }

    p {
      margin: 0;
      max-width: 420px;
      color: #64748b;
      font-size: 0.92rem;
      line-height: 1.55;
    }

    .empty-cta-btn {
      margin-top: 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 1.25rem;
      border-radius: 10px;
      border: none;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: #0052cc;
      }
    }
  `],
})
export class AccountEmptyStateComponent {
  readonly icon = input<string>('heart');
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly actionRoute = input<readonly (string | number)[] | null>(null);
  readonly actionClicked = output<void>();
}
