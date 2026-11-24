import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private router = inject(Router);

  readonly isMobileMenuOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly activeSection = signal('hero');
  readonly infoToast = signal<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'scroll',
        () => {
          this.isScrolled.set(window.scrollY > 15);
        },
        { passive: true }
      );
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.closeMobileMenu();
    this.activeSection.set(sectionId);

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

  onContactUs(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu();
    this.activeSection.set('contact');
    this.infoToast.set('Contact Us: support@ceylongo.com | +94 11 234 5678');
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.infoToast.set(null);
      }, 4000);
    }
  }
}
