import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-planner-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-planner-banner.html',
  styleUrls: ['./ai-planner-banner.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPlannerBanner {
  readonly actionClick = output<void>();

  onTryPlanner(event: Event): void {
    event.preventDefault();
    this.actionClick.emit();
  }
}
