import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { TravelerHome } from '../traveler-home/traveler-home';

@Component({
  selector: 'app-reset-success',
  standalone: true,
  imports: [TravelerHome],
  templateUrl: './reset-success.html',
  styleUrl: './reset-success.scss',
})
export class ResetSuccess implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authModalService = inject(AuthModalService);

  email = '';
  isDemoMode = false;

  ngOnInit(): void {
    this.email = (
      history.state?.email ||
      this.route.snapshot.queryParamMap.get('email') ||
      ''
    ).trim().toLowerCase();

    this.isDemoMode =
      history.state?.demo === true ||
      this.route.snapshot.queryParamMap.get('demo') === 'true';
  }

  goToLogin(): void {
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
    if (target?.classList.contains('success-page') || target?.classList.contains('auth-modal-backdrop')) {
      this.closeModal();
    }
  }
}
