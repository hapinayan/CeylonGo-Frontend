import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CategoryShortcutItem {
  readonly id: string;
  readonly name: string;
  readonly icon: 'homestays' | 'experiences' | 'tour-guides' | 'bike-rentals' | 'community' | 'ai-planner';
  readonly targetId?: string;
  readonly route?: string;
}

@Component({
  selector: 'app-category-shortcut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-shortcut.html',
  styleUrls: ['./category-shortcut.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryShortcut {
  @Input({ required: true }) category!: CategoryShortcutItem;

  onClick(event: Event): void {
    if (this.category.targetId) {
      event.preventDefault();
      const el = document.getElementById(this.category.targetId);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}
