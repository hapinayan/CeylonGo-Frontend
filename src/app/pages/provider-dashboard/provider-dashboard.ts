import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ProviderAuthService } from '../../core/services/provider-auth.service';

/**
 * Minimal authenticated Provider Dashboard placeholder.
 * Strictly minimal as specified in requirements.
 */
@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './provider-dashboard.html',
  styleUrl: './provider-dashboard.scss',
})
export class ProviderDashboard {
  private readonly providerAuthService = inject(ProviderAuthService);
  private readonly router = inject(Router);

  readonly user = this.providerAuthService.currentProviderUser;

  onLogout(): void {
    this.providerAuthService.logout();
    void this.router.navigate(['/provider/login']);
  }
}
