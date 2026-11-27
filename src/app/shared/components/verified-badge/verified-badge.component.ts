import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-verified-badge',
  standalone: true,
  template: `
    <span class="verified-badge" [attr.title]="'Verified Business by CeylonGo Admin'" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L15.09 5.26L19.5 5.82L20.36 10.21L23.5 13.5L21.27 17.38L21.41 21.84L16.97 22.36L14.09 25.42L10 23.9L5.91 25.42L3.03 22.36L-1.41 21.84L-1.27 17.38L-3.5 13.5L-0.36 10.21L0.5 5.82L4.91 5.26L8 2L12 2Z" fill="#1255B5" />
        <path d="M12 2.5C6.75 2.5 2.5 6.75 2.5 12C2.5 17.25 6.75 21.5 12 21.5C17.25 21.5 21.5 17.25 21.5 12C21.5 6.75 17.25 2.5 12 2.5Z" fill="#1255B5" />
        <path d="M8.5 12.3L10.8 14.6L15.5 9.5" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  `,
  styles: [`
    .verified-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      flex-shrink: 0;
    }
  `],
})
export class VerifiedBadgeComponent {
  @Input() size: number = 18;
}
