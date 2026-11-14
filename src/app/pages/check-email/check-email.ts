import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [],
  templateUrl: './check-email.html',
  styleUrl: './check-email.scss',
})
export class CheckEmail implements OnInit {
  private readonly router = inject(Router);

  email = '';

  ngOnInit(): void {
    this.email = (history.state?.email || '').trim().toLowerCase();
  }

  openEmailApp(): void {
    if (typeof window !== 'undefined') {
      window.location.href = 'mailto:';
    }
  }

  backToLogin(): void {
    if (this.email) {
      this.router.navigate(['/login'], {
        queryParams: { email: this.email },
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList.contains('status-page')) {
      this.closeModal();
    }
  }
}
