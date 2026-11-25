import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { TravelerHome } from '../traveler-home/traveler-home';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [TravelerHome],
  templateUrl: './check-email.html',
  styleUrl: './check-email.scss',
})
export class CheckEmail implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authModalService = inject(AuthModalService);

  email = '';

  ngOnInit(): void {
    this.email = (
      history.state?.email ||
      this.route.snapshot.queryParamMap.get('email') ||
      ''
    ).trim().toLowerCase();
  }

  openEmailApp(): void {
    if (typeof window !== 'undefined') {
      window.location.href = 'mailto:';
    }
  }

  backToLogin(): void {
    this.authModalService.open('login');
    if (this.email) {
      this.authModalService.userEmail.set(this.email);
    }
    this.router.navigate(['/']);
  }

  closeModal(): void {
    this.router.navigate(['/']);
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.classList.contains('status-page') || target?.classList.contains('auth-modal-backdrop')) {
      this.closeModal();
    }
  }
}
