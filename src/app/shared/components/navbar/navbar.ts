import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthModalService } from '../../../core/services/auth-modal.service';

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
  readonly authModalService = inject(AuthModalService);

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

  openAuthModal(mode: 'login' | 'register', event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();
    this.authModalService.open(mode);
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
    this.router.navigate(['/contact']);
  }

  onAbout(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu();
    this.activeSection.set('about');
    this.router.navigate(['/about']);
  }
}
