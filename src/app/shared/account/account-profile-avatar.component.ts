import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-account-profile-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="avatar-ring" [attr.data-size]="size()" [attr.aria-label]="fullName() || 'Traveler avatar'">
      @if (photoUrl() && !imageFailed()) {
        <img
          [src]="photoUrl()"
          [alt]="fullName() || 'Traveler profile photo'"
          (error)="imageFailed.set(true)"
        />
      } @else {
        <span class="avatar-initials" aria-hidden="true">{{ initials() }}</span>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex: none;
    }

    .avatar-ring {
      position: relative;
      display: grid;
      place-items: center;
      border-radius: 50%;
      overflow: hidden;
      background: #edf5ff;
      border: 1.5px solid #bfdbfe;
      color: #0066ff;
      font-weight: 700;
      user-select: none;
    }

    .avatar-ring[data-size='sm'] {
      width: 40px;
      height: 40px;
      font-size: 0.85rem;
    }

    .avatar-ring[data-size='md'] {
      width: 48px;
      height: 48px;
      font-size: 1rem;
    }

    .avatar-ring[data-size='lg'] {
      width: 76px;
      height: 76px;
      font-size: 1.5rem;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-initials {
      color: #082b5c;
      letter-spacing: 0.02em;
    }
  `],
})
export class AccountProfileAvatarComponent {
  readonly fullName = input<string | null | undefined>('');
  readonly photoUrl = input<string | null | undefined>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly imageFailed = signal(false);

  constructor() {
    effect(() => {
      this.photoUrl();
      this.imageFailed.set(false);
    });
  }

  readonly initials = computed(() => {
    const parts = (this.fullName() || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || 'CG').toUpperCase();
  });
}
