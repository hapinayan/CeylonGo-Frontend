import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-community-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-banner.html',
  styleUrls: ['./community-banner.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityBanner {
  readonly actionClick = output<void>();

  onJoinCommunity(event: Event): void {
    event.preventDefault();
    this.actionClick.emit();
  }
}
