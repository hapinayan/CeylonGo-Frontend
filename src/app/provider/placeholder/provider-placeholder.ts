import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ProviderPreviewService } from '../provider-preview.service';

@Component({
  selector: 'app-provider-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="placeholder-shell">
      <div class="placeholder-card">
        <div class="icon-wrap">⚙️</div>
        @if (isPreview()) {
          <span class="preview-pill">Preview Mode · Sample View</span>
        }
        <h2 class="title">{{ sectionTitle() }}</h2>
        <p class="subtitle">{{ sectionDescription() }}</p>
        <div class="actions">
          <a routerLink="/provider/dashboard" [queryParams]="previewQueryParams()" class="btn-primary">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .placeholder-shell {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 50vh;
      }
      .placeholder-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 3rem 2rem;
        text-align: center;
        max-width: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .icon-wrap {
        font-size: 2.5rem;
      }
      .preview-pill {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        color: #92400e;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
      }
      .title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #082b5c;
        margin: 0;
      }
      .subtitle {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
      }
      .actions {
        margin-top: 1rem;
      }
      .btn-primary {
        background: #0066ff;
        color: #ffffff;
        padding: 0.65rem 1.25rem;
        border-radius: 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
      }
      .btn-primary:hover {
        background: #0052cc;
      }
    `,
  ],
})
export class ProviderPlaceholder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly previewService = inject(ProviderPreviewService);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;
  readonly sectionTitle = signal<string>('Provider Module');
  readonly sectionDescription = signal<string>(
    'This module is active in your provider workspace and will be populated with data as operations occur.'
  );

  ngOnInit(): void {
    const title = this.route.snapshot.data['title'];
    const desc = this.route.snapshot.data['description'];
    if (title) this.sectionTitle.set(title);
    if (desc) this.sectionDescription.set(desc);
  }
}
