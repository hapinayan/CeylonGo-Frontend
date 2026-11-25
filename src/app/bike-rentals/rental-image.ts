import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-rental-image',
  template: `
    @if (src() && failed() !== src()) {
      <img [src]="src()" [alt]="alt()" loading="lazy" decoding="async" (error)="failed.set(src())" />
    } @else {
      <span class="fallback">Photo unavailable</span>
    }
  `,
  styles: `
    :host { display: block; aspect-ratio: 16 / 10; background: #eaf5ff; }
    img, .fallback { width: 100%; height: 100%; }
    img { display: block; object-fit: contain; }
    .fallback { display: grid; place-content: center; color: #64748b; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalImage {
  readonly src = input<string | null>();
  readonly alt = input.required<string>();
  readonly failed = signal<string | null | undefined>(undefined);
}
