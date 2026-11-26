import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { User } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { TravelerNotificationsService } from '../../core/services/traveler-notifications.service';
import {
  TravelerAccountSection,
  TravelerAccountSidebar,
} from '../components/traveler-account-sidebar/traveler-account-sidebar';

@Component({
  selector: 'app-traveler-account-layout',
  standalone: true,
  imports: [CommonModule, TravelerAccountSidebar],
  template: `
    <div class="traveler-account-page">
      <div class="traveler-account-shell">
        <div class="account-sidebar-column">
          <app-traveler-account-sidebar
            [account]="resolvedAccount()"
            [photoUrl]="resolvedPhotoUrl()"
            [active]="active()"
            [preview]="preview()"
            [unreadNotifications]="notificationsService.unreadCount()"
            (signedOut)="onSignOut()"
          />
        </div>

        <section class="account-content-column" [attr.aria-label]="contentLabel()">
          <ng-content />
        </section>
      </div>
    </div>
  `,
  styles: [`
    .traveler-account-page {
      background: #ffffff;
      width: 100%;
    }

    .traveler-account-shell {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 24px var(--cg-page-padding, 32px) 56px;
      display: grid;
      grid-template-columns: 256px minmax(0, 1fr);
      gap: 24px;
      align-items: start;
      box-sizing: border-box;
    }

    .account-sidebar-column {
      position: sticky;
      top: 96px;
      align-self: start;
      z-index: 2;
    }

    .account-content-column {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    @media (max-width: 1080px) {
      .traveler-account-shell {
        grid-template-columns: 224px minmax(0, 1fr);
        gap: 20px;
      }
    }

    @media (max-width: 960px) {
      .traveler-account-shell {
        grid-template-columns: 1fr;
        padding: 16px var(--cg-page-padding, 16px) 42px;
        gap: 16px;
      }

      .account-sidebar-column {
        position: static;
      }
    }
  `],
})
export class TravelerAccountLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly notificationsService = inject(TravelerNotificationsService);

  readonly active = input.required<TravelerAccountSection>();
  readonly account = input<User | null | undefined>(undefined);
  readonly preview = input(false);
  readonly contentLabel = input('Account section');

  readonly resolvedAccount = computed(() => {
    const provided = this.account();
    return provided === undefined ? this.authService.currentUser() : provided;
  });

  readonly resolvedPhotoUrl = computed(() => {
    const acct = this.resolvedAccount();
    return this.authService.avatarUrl?.() || acct?.avatar_url || null;
  });

  onSignOut(): void {
    this.notificationsService.clearOnLogout();
    this.authService.logout();
    void this.router.navigate(['/']);
  }
}
