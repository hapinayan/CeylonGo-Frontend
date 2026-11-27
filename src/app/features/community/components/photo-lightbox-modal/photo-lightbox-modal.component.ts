import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommunityPostMediaItem } from '../../models/community.models';

@Component({
  selector: 'app-photo-lightbox-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (photos.length > 0 && isOpen) {
      <div class="lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Post photo viewer" (click)="close.emit()">
        <div class="lightbox-card" (click)="$event.stopPropagation()">
          <button type="button" class="lightbox-close" (click)="close.emit()" aria-label="Close photo viewer">&times;</button>

          <div class="lightbox-stage">
            @if (photos.length > 1) {
              <button type="button" class="nav-arrow prev" (click)="prev()" aria-label="Previous photograph">&lsaquo;</button>
            }

            <img
              [src]="photos[activeIndex()].image_url"
              [alt]="photos[activeIndex()].alt_text || 'Community photograph'"
            />

            @if (photos.length > 1) {
              <button type="button" class="nav-arrow next" (click)="next()" aria-label="Next photograph">&rsaquo;</button>
            }
          </div>

          <div class="lightbox-meta">
            <span>{{ photos[activeIndex()].alt_text || 'Community Photograph' }}</span>
            <span>{{ activeIndex() + 1 }} / {{ photos.length }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(8, 43, 92, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .lightbox-card {
      position: relative;
      max-width: 880px;
      width: 100%;
      background: #0f172a;
      border-radius: 14px;
      overflow: hidden;
      padding: 1rem;
    }
    .lightbox-close {
      position: absolute;
      top: 0.65rem;
      right: 0.75rem;
      z-index: 2;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      font-size: 1.4rem;
      cursor: pointer;
    }
    .lightbox-stage {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      max-height: 75vh;
    }
    .lightbox-stage img {
      max-width: 100%;
      max-height: 72vh;
      object-fit: contain;
      border-radius: 8px;
    }
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      font-size: 1.6rem;
      cursor: pointer;
    }
    .nav-arrow.prev { left: 0.5rem; }
    .nav-arrow.next { right: 0.5rem; }
    .lightbox-meta {
      display: flex;
      justify-content: space-between;
      color: #cbd5e1;
      font-size: 0.85rem;
      margin-top: 0.65rem;
    }
  `],
})
export class PhotoLightboxModalComponent {
  @Input() photos: CommunityPostMediaItem[] = [];
  @Input() isOpen = false;
  @Input() set initialIndex(val: number) {
    if (Number.isFinite(val) && val >= 0) {
      this.activeIndex.set(val);
    }
  }
  @Output() close = new EventEmitter<void>();

  readonly activeIndex = signal(0);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close.emit();
  }

  prev(): void {
    if (!this.photos.length) return;
    this.activeIndex.update((i) => (i - 1 + this.photos.length) % this.photos.length);
  }

  next(): void {
    if (!this.photos.length) return;
    this.activeIndex.update((i) => (i + 1) % this.photos.length);
  }
}
