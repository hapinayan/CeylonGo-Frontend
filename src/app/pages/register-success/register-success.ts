import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  standalone: true,
  imports: [],
  templateUrl: './register-success.html',
  styleUrl: './register-success.scss',
})
export class RegisterSuccess implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  fullName = '';
  email = '';

  get firstName(): string {
    if (!this.fullName) {
      return '';
    }
    const trimmed = this.fullName.trim();
    const parts = trimmed.split(/\s+/);
    return parts[0] || trimmed;
  }

  ngOnInit(): void {
    const state = history.state;
    const queryEmail = this.route.snapshot.queryParamMap.get('email');
    const queryName =
      this.route.snapshot.queryParamMap.get('fullName') ||
      this.route.snapshot.queryParamMap.get('name');

    this.email = (state?.email || queryEmail || '').trim();
    this.fullName = (state?.fullName || queryName || '').trim();

    // If opened directly without confirmed registration data, redirect to /auth
    if (!this.email) {
      this.router.navigate(['/auth']);
      return;
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('success-page')) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        email: this.email,
        registered: 'true',
      },
    });
  }

  goToHome(): void {
    this.router.navigate(['/auth']);
  }

  goToAuth(): void {
    this.router.navigate(['/auth']);
  }
}
