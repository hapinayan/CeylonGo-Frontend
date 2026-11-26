import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { ExperienceIcon } from '../../experiences/components/icon';

export type AccountBadgeTone = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'neutral';

@Component({
  selector: 'app-account-status-badge',
  standalone: true,
  imports: [CommonModule, ExperienceIcon],
  template: `
    <span class="status-badge" [attr.data-tone]="tone()" [attr.data-status]="status()">
      <app-experience-icon [name]="iconName()" />
      <span>{{ displayLabel() }}</span>
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: capitalize;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .status-badge[data-tone='pending'] {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .status-badge[data-tone='confirmed'] {
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }

    .status-badge[data-tone='completed'] {
      background: #eaf2ff;
      color: #0066ff;
      border-color: #bfdbfe;
    }

    .status-badge[data-tone='cancelled'] {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    }

    .status-badge[data-tone='neutral'] {
      background: #f1f5f9;
      color: #475569;
      border-color: #e2e8f0;
    }
  `],
})
export class AccountStatusBadgeComponent {
  readonly status = input.required<string>();
  readonly labelOverride = input<string | null>(null);

  readonly displayLabel = computed(() => {
    const raw = (this.labelOverride() || this.status() || '').trim();
    return raw.replaceAll('_', ' ');
  });

  readonly tone = computed<AccountBadgeTone>(() => {
    const s = (this.status() || '').trim().toLowerCase();
    if (s === 'confirmed' || s === 'approved' || s === 'demo_succeeded' || s === 'paid') {
      return 'confirmed';
    }
    if (s === 'pending' || s === 'pending_payment' || s === 'ready_for_pickup' || s === 'upcoming') {
      return 'pending';
    }
    if (s === 'completed') {
      return 'completed';
    }
    if (s === 'cancelled' || s === 'rejected' || s === 'failed' || s === 'expired') {
      return 'cancelled';
    }
    return 'neutral';
  });

  readonly iconName = computed(() => {
    switch (this.tone()) {
      case 'confirmed':
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'x-circle';
      default:
        return 'clock';
    }
  });
}
