import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-account-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="account-page-header">
      <div class="header-copy">
        <h1 [id]="headingId()">{{ title() }}</h1>
        @if (description()) {
          <p class="header-desc">{{ description() }}</p>
        }
      </div>
      <div class="header-actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .account-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }

    .header-copy h1 {
      margin: 0;
      color: #082b5c;
      font-size: clamp(1.45rem, 2.2vw, 1.85rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .header-desc {
      margin: 0.35rem 0 0;
      color: #64748b;
      font-size: 0.94rem;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
  `],
})
export class AccountPageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly headingId = input<string>('account-page-heading');
}
