import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  private router = inject(Router);

  readonly currentYear: number = new Date().getFullYear();
  readonly infoToast = signal<string | null>(null);

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    if (this.router.url === '/' || this.router.url === '') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      this.router.navigate(['/'], { fragment: sectionId }).then(() => {
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      });
    }
  }

  onUnavailableLink(event: Event, featureName: string): void {
    event.preventDefault();
    this.infoToast.set(`${featureName} is coming soon in the upcoming release.`);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.infoToast.set(null);
      }, 3500);
    }
  }

  onSocialClick(event: Event, platform: string): void {
    event.preventDefault();
    this.infoToast.set(`Official CeylonGo ${platform} page is coming soon!`);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.infoToast.set(null);
      }, 3500);
    }
  }
}
