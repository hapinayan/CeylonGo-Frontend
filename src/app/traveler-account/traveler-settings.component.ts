import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { TravelerNotificationsService } from '../core/services/traveler-notifications.service';
import { AccountConfirmDialogComponent } from '../shared/account/account-confirm-dialog.component';
import { AccountLoadingSkeletonComponent } from '../shared/account/account-loading-skeleton.component';
import { AccountPageHeaderComponent } from '../shared/account/account-page-header.component';
import { AccountStatusBadgeComponent } from '../shared/account/account-status-badge.component';
import { TravelerAccountLayoutComponent } from '../shared/account/traveler-account-layout.component';
import { NotificationSettings } from './traveler-account.models';
import { TravelerAccountService } from './traveler-account.service';

@Component({
  selector: 'app-traveler-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TravelerAccountLayoutComponent,
    AccountPageHeaderComponent,
    AccountStatusBadgeComponent,
    AccountLoadingSkeletonComponent,
    AccountConfirmDialogComponent,
  ],
  template: `
    <app-traveler-account-layout [account]="user()" active="settings" contentLabel="Account Settings">
      <app-account-page-header
        title="Account Settings"
        description="Manage your account, security and preferences."
        headingId="settings-heading"
      />

      <!-- Section A: Account Information -->
      <section class="settings-card" aria-labelledby="section-account-info">
        <div class="card-head">
          <div>
            <h2 id="section-account-info">Account Information</h2>
            <p>Identity, verification, and authentication details synced with CeylonGo.</p>
          </div>
          <a routerLink="/profile" class="btn-outline-link">Manage Profile</a>
        </div>

        <dl class="spec-grid">
          <div class="spec-box">
            <dt>Registered Email</dt>
            <dd>{{ user()?.email || 'Session signed out' }}</dd>
          </div>
          <div class="spec-box">
            <dt>Account Type</dt>
            <dd>{{ user()?.role === 'traveler' ? 'Traveler Account' : (user()?.role || 'Traveler') }}</dd>
          </div>
          <div class="spec-box">
            <dt>Email Verification</dt>
            <dd>
              <app-account-status-badge
                [status]="user()?.email_verified ? 'confirmed' : 'pending'"
                [labelOverride]="user()?.email_verified ? 'Verified' : 'Pending'"
              />
            </dd>
          </div>
          <div class="spec-box">
            <dt>Authentication Method</dt>
            <dd>{{ authMethodDisplay() }}</dd>
          </div>
        </dl>
      </section>

      <!-- Section B: Security & Password -->
      <section class="settings-card" aria-labelledby="section-security">
        <div class="card-head">
          <div>
            <h2 id="section-security">Security &amp; Password</h2>
            <p>Update your account password or request a verified password recovery email.</p>
          </div>
        </div>

        @if (passwordChangeSuccess()) {
          <div class="feedback-banner" role="status">
            <div class="pw-success-row">
              <div>
                <strong>Password updated</strong>
                <p>{{ passwordChangeSuccess() }}</p>
              </div>
              <button type="button" class="btn-primary" (click)="openRelogin()">Log in again</button>
            </div>
          </div>
        } @else {
          @if (isGoogleOnlyAccount()) {
            <div class="info-banner" role="status">
              This account signs in using <strong>Google Sign-In</strong>. Manage your password directly in your Google account or request email recovery if enabled.
            </div>
          } @else {
            <form class="pw-form" (submit)="$event.preventDefault(); submitPasswordChange()">
              <label class="field">
                <span>Current Password</span>
                <div class="pw-input-wrap">
                  <input
                    [type]="showCurrentPw() ? 'text' : 'password'"
                    name="currentPassword"
                    autocomplete="current-password"
                    [(ngModel)]="currentPassword"
                    [disabled]="isChangingPassword()"
                    placeholder="Enter current password"
                  />
                  <button type="button" class="toggle-vis" (click)="showCurrentPw.update(v => !v)">
                    {{ showCurrentPw() ? 'Hide' : 'Show' }}
                  </button>
                </div>
              </label>

              <div class="pw-pair">
                <label class="field">
                  <span>New Password</span>
                  <div class="pw-input-wrap">
                    <input
                      [type]="showNewPw() ? 'text' : 'password'"
                      name="newPassword"
                      autocomplete="new-password"
                      [(ngModel)]="newPassword"
                      [disabled]="isChangingPassword()"
                      placeholder="At least 6 characters"
                    />
                    <button type="button" class="toggle-vis" (click)="showNewPw.update(v => !v)">
                      {{ showNewPw() ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </label>

                <label class="field">
                  <span>Confirm New Password</span>
                  <div class="pw-input-wrap">
                    <input
                      [type]="showConfirmPw() ? 'text' : 'password'"
                      name="confirmPassword"
                      autocomplete="new-password"
                      [(ngModel)]="confirmPassword"
                      [disabled]="isChangingPassword()"
                      placeholder="Repeat new password"
                    />
                    <button type="button" class="toggle-vis" (click)="showConfirmPw.update(v => !v)">
                      {{ showConfirmPw() ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </label>
              </div>

              @if (passwordError()) {
                <p class="field-error" role="alert">{{ passwordError() }}</p>
              }

              <div class="form-actions">
                <button type="submit" class="btn-primary" [disabled]="isChangingPassword()">
                  {{ isChangingPassword() ? 'Updating Password...' : 'Save Password' }}
                </button>
              </div>
            </form>
          }

          <div class="divider" role="separator"></div>

          <div class="reset-flow-box">
            <div>
              <strong>Forgot Password Recovery</strong>
              <p>Send a verified single-use reset link to <strong>{{ user()?.email }}</strong>.</p>
            </div>
            <button
              type="button"
              class="btn-outline"
              (click)="sendPasswordResetEmail()"
              [disabled]="isSendingReset() || !user()?.email"
            >
              {{ isSendingReset() ? 'Sending...' : 'Send Reset Email' }}
            </button>
          </div>

          @if (resetFeedback(); as fb) {
            <div class="feedback-banner" [class.error]="fb.kind === 'error'" role="status">
              {{ fb.message }}
            </div>
          }
        }
      </section>

      <!-- Section C: In-App Notification Preferences -->
      <section class="settings-card" aria-labelledby="section-notif-prefs">
        <div class="card-head">
          <div>
            <h2 id="section-notif-prefs">In-App Notification Preferences</h2>
            <p>Choose which activity updates appear in your CeylonGo inbox and Navbar bell. Mandatory account security notifications remain active.</p>
          </div>
        </div>

        @if (isLoadingNotifSettings()) {
          <app-account-loading-skeleton variant="card" [count]="1" />
        } @else if (notifLoadError()) {
          <div class="feedback-banner error" role="alert">
            <span>{{ notifLoadError() }}</span>
            <button type="button" class="btn-outline" (click)="loadNotificationSettings()">Retry</button>
          </div>
        } @else {
          @if (notifSaveFeedback(); as nfb) {
            <div class="feedback-banner" [class.error]="nfb.kind === 'error'" role="status">
              {{ nfb.message }}
            </div>
          }

          <ul class="pref-list">
            <li>
              <label class="pref-toggle-row">
                <div>
                  <strong>Booking updates</strong>
                  <small>In-app notifications for reservation requests, confirmations, and cancellations</small>
                </div>
                <input
                  type="checkbox"
                  [checked]="notifSettings().booking_updates"
                  [disabled]="isSavingNotifSettings()"
                  (change)="toggleNotifSetting('booking_updates', $any($event.target).checked)"
                />
              </label>
            </li>
            <li>
              <label class="pref-toggle-row">
                <div>
                  <strong>Payment updates</strong>
                  <small>In-app alerts for academic demo and at-location payment records</small>
                </div>
                <input
                  type="checkbox"
                  [checked]="notifSettings().payment_updates"
                  [disabled]="isSavingNotifSettings()"
                  (change)="toggleNotifSetting('payment_updates', $any($event.target).checked)"
                />
              </label>
            </li>
            <li>
              <label class="pref-toggle-row">
                <div>
                  <strong>Community activity</strong>
                  <small>In-app alerts for likes and comments on your travel posts</small>
                </div>
                <input
                  type="checkbox"
                  [checked]="notifSettings().community_activity"
                  [disabled]="isSavingNotifSettings()"
                  (change)="toggleNotifSetting('community_activity', $any($event.target).checked)"
                />
              </label>
            </li>
            <li>
              <label class="pref-toggle-row">
                <div>
                  <strong>Promotional updates</strong>
                  <small>Optional in-app announcements and seasonal CeylonGo travel offers</small>
                </div>
                <input
                  type="checkbox"
                  [checked]="notifSettings().promotional_updates"
                  [disabled]="isSavingNotifSettings()"
                  (change)="toggleNotifSetting('promotional_updates', $any($event.target).checked)"
                />
              </label>
            </li>
            <li class="mandatory-item">
              <div class="pref-toggle-row">
                <div>
                  <strong>Account &amp; Security alerts</strong>
                  <small>Password changes and essential security notices always remain enabled</small>
                </div>
                <span class="status-tag">Always On</span>
              </div>
            </li>
          </ul>
        }
      </section>

      <!-- Section D: Language & Currency -->
      <section class="settings-card" aria-labelledby="section-locale">
        <div class="card-head">
          <div>
            <h2 id="section-locale">Language &amp; Currency</h2>
            <p>Active platform defaults across CeylonGo listings and bookings.</p>
          </div>
        </div>

        <dl class="spec-grid two-col">
          <div class="spec-box">
            <dt>Language</dt>
            <dd>English</dd>
          </div>
          <div class="spec-box">
            <dt>Currency</dt>
            <dd>LKR (Sri Lankan Rupee)</dd>
          </div>
        </dl>
      </section>

      <!-- Section E: Account Management -->
      <section class="settings-card" aria-labelledby="section-manage">
        <div class="card-head">
          <div>
            <h2 id="section-manage">Account Management</h2>
            <p>Manage your current signed-in session.</p>
          </div>
        </div>

        <div class="manage-row">
          <div>
            <strong>Log out of CeylonGo</strong>
            <p>Clears your active JWT token and private Traveler state from this browser session.</p>
          </div>
          <button type="button" class="btn-danger-outline" (click)="logoutDialogOpen.set(true)">
            Log out
          </button>
        </div>
      </section>

      <app-account-confirm-dialog
        [open]="logoutDialogOpen()"
        title="Log out of your account?"
        message="You will be signed out of your current CeylonGo session and returned to the homepage."
        confirmLabel="Log out"
        cancelLabel="Stay Signed In"
        [destructive]="true"
        (confirmed)="confirmLogout()"
        (cancelled)="logoutDialogOpen.set(false)"
      />
    </app-traveler-account-layout>
  `,
  styles: [`
    .settings-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;

      h2 {
        margin: 0;
        color: #082b5c;
        font-size: 1.08rem;
        font-weight: 700;
      }

      p {
        margin: 0.25rem 0 0;
        color: #64748b;
        font-size: 0.87rem;
      }
    }

    .spec-grid {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .spec-box {
      padding: 0.8rem 0.95rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;

      dt {
        color: #64748b;
        font-size: 0.78rem;
        margin-bottom: 0.25rem;
      }

      dd {
        margin: 0;
        color: #0f172a;
        font-size: 0.92rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
    }

    .info-banner,
    .feedback-banner {
      padding: 0.8rem 0.95rem;
      border-radius: 10px;
      font-size: 0.87rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .info-banner {
      background: #edf5ff;
      border: 1px solid #bfdbfe;
      color: #082b5c;
    }

    .feedback-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;

      &.error {
        background: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;
      }
    }

    .pw-success-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      p {
        margin: 0.2rem 0 0;
      }
    }

    .reset-flow-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.95rem 1rem;
      border-radius: 11px;
      background: #f5f8fc;
      border: 1px solid #dbeafe;

      strong {
        color: #082b5c;
        font-size: 0.95rem;
      }

      p {
        margin: 0.25rem 0 0;
        color: #475569;
        font-size: 0.85rem;
      }
    }

    .divider {
      height: 1px;
      background: #e2e8f0;
    }

    .pw-form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .pw-pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;

      span {
        font-size: 0.83rem;
        font-weight: 600;
        color: #0f172a;
      }
    }

    .pw-input-wrap {
      display: flex;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      overflow: hidden;
      background: #ffffff;

      input {
        flex: 1;
        min-width: 0;
        min-height: 40px;
        border: 0;
        padding: 0 0.75rem;
        font: inherit;
        font-size: 0.88rem;

        &:focus {
          outline: none;
        }
      }
    }

    .toggle-vis {
      border: 0;
      border-left: 1px solid #e2e8f0;
      padding: 0 0.75rem;
      background: #f8fafc;
      color: #475569;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .field-error {
      margin: 0;
      color: #dc2626;
      font-size: 0.82rem;
    }

    .pref-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;

      li {
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
    }

    .pref-toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.8rem 0.95rem;
      cursor: pointer;

      strong {
        display: block;
        color: #082b5c;
        font-size: 0.92rem;
      }

      small {
        color: #64748b;
        font-size: 0.8rem;
      }

      input[type='checkbox'] {
        width: 20px;
        height: 20px;
        accent-color: #0066ff;
        cursor: pointer;
        flex-shrink: 0;
      }
    }

    .mandatory-item .pref-toggle-row {
      cursor: default;
    }

    .status-tag {
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: #eaf2ff;
      border: 1px solid #bfdbfe;
      color: #0066ff;
      font-size: 0.76rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .manage-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.85rem 0.95rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;

      strong {
        color: #082b5c;
        font-size: 0.92rem;
      }

      p {
        margin: 0.2rem 0 0;
        color: #64748b;
        font-size: 0.84rem;
      }
    }

    .btn-primary,
    .btn-outline,
    .btn-outline-link,
    .btn-danger-outline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 1rem;
      border-radius: 10px;
      font: inherit;
      font-size: 0.87rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-primary {
      border: none;
      background: #0066ff;
      color: #ffffff;

      &:hover:not(:disabled) {
        background: #0052cc;
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .btn-outline,
    .btn-outline-link {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #082b5c;

      &:hover {
        background: #edf5ff;
        border-color: #bfdbfe;
      }
    }

    .btn-danger-outline {
      border: 1px solid #fca5a5;
      background: #ffffff;
      color: #dc2626;

      &:hover {
        background: #fef2f2;
      }
    }

    @media (max-width: 780px) {
      .spec-grid,
      .pw-pair {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TravelerSettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly accountService = inject(TravelerAccountService);
  private readonly notificationsService = inject(TravelerNotificationsService);
  private readonly router = inject(Router);

  readonly user = computed(() => this.authService.currentUser());
  readonly isGoogleOnlyAccount = computed(() => this.user()?.authentication_method === 'google');

  readonly authMethodDisplay = computed(() => {
    const m = this.user()?.authentication_method;
    if (m === 'google') return 'Google Sign-In';
    if (m === 'password') return 'Email & Password';
    return 'Traveler Account';
  });

  // Password change state (never persisted in storage)
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly showCurrentPw = signal(false);
  readonly showNewPw = signal(false);
  readonly showConfirmPw = signal(false);
  readonly isChangingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordChangeSuccess = signal<string | null>(null);

  readonly isSendingReset = signal(false);
  readonly resetFeedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Notification preferences state
  readonly notifSettings = signal<NotificationSettings>({
    booking_updates: true,
    payment_updates: true,
    community_activity: true,
    promotional_updates: false,
  });
  readonly isLoadingNotifSettings = signal(false);
  readonly isSavingNotifSettings = signal(false);
  readonly notifLoadError = signal<string | null>(null);
  readonly notifSaveFeedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  readonly logoutDialogOpen = signal(false);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.getCurrentUser().subscribe({ error: () => {} });
      this.loadNotificationSettings();
    }
  }

  submitPasswordChange(): void {
    if (this.isChangingPassword() || this.isGoogleOnlyAccount()) return;

    if (!this.currentPassword) {
      this.passwordError.set('Current password is required.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError.set('New password must be at least 6 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }
    if (this.newPassword === this.currentPassword) {
      this.passwordError.set('New password must be different from your current password.');
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordError.set(null);

    const payload = {
      current_password: this.currentPassword,
      new_password: this.newPassword,
      confirm_password: this.confirmPassword,
    };

    this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.isChangingPassword.set(false);
        this.clearPasswordFields();
        this.notificationsService.clearOnLogout();
        this.passwordChangeSuccess.set(
          res?.message || 'Your password was updated and active sessions were signed out. Please log in again.',
        );
      },
      error: (err: HttpErrorResponse) => {
        this.isChangingPassword.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        if (err?.status === 429) {
          this.passwordError.set(detail || 'Too many password attempts. Please wait before trying again.');
        } else {
          this.passwordError.set(detail || 'Could not change password. Check your current password and policy.');
        }
      },
    });
  }

  openRelogin(): void {
    this.authModalService.open('login');
  }

  sendPasswordResetEmail(): void {
    const email = this.user()?.email?.trim();
    if (!email || this.isSendingReset()) return;

    this.isSendingReset.set(true);
    this.resetFeedback.set(null);

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isSendingReset.set(false);
        this.resetFeedback.set({
          kind: 'success',
          message: res?.message || `Password reset instructions sent to ${email}.`,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSendingReset.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.resetFeedback.set({
          kind: 'error',
          message: detail || 'Could not initiate password reset right now. Please try again later.',
        });
      },
    });
  }

  loadNotificationSettings(): void {
    if (this.isLoadingNotifSettings()) return;
    this.isLoadingNotifSettings.set(true);
    this.notifLoadError.set(null);

    this.accountService.getNotificationSettings().subscribe({
      next: (settings) => {
        this.isLoadingNotifSettings.set(false);
        this.notifSettings.set(settings);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingNotifSettings.set(false);
        this.notifLoadError.set(
          err?.status === 401
            ? 'Session expired. Sign in again to manage notification preferences.'
            : 'Unable to load notification preferences right now.',
        );
      },
    });
  }

  toggleNotifSetting(key: keyof NotificationSettings, value: boolean): void {
    if (this.isSavingNotifSettings()) return;
    const previous = { ...this.notifSettings() };
    const next: NotificationSettings = { ...previous, [key]: value };

    // Optimistic update with explicit rollback on failure.
    this.notifSettings.set(next);
    this.isSavingNotifSettings.set(true);
    this.notifSaveFeedback.set(null);

    this.accountService.updateNotificationSettings(next).subscribe({
      next: (saved) => {
        this.isSavingNotifSettings.set(false);
        this.notifSettings.set(saved);
        this.notifSaveFeedback.set({ kind: 'success', message: 'Notification preferences saved.' });
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingNotifSettings.set(false);
        this.notifSettings.set(previous);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.notifSaveFeedback.set({
          kind: 'error',
          message: detail || 'Failed to update notification preferences. Changes were reverted.',
        });
      },
    });
  }

  confirmLogout(): void {
    this.logoutDialogOpen.set(false);
    this.notificationsService.clearOnLogout();
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  private clearPasswordFields(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
