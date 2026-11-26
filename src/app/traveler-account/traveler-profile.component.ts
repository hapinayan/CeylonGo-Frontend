import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ProfilePatchRequest, User } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import { ExperienceIcon } from '../experiences/components/icon';
import { AccountConfirmDialogComponent } from '../shared/account/account-confirm-dialog.component';
import { AccountLoadingSkeletonComponent } from '../shared/account/account-loading-skeleton.component';
import { AccountPageHeaderComponent } from '../shared/account/account-page-header.component';
import { AccountProfileAvatarComponent } from '../shared/account/account-profile-avatar.component';
import { AccountStatusBadgeComponent } from '../shared/account/account-status-badge.component';
import { TravelerAccountLayoutComponent } from '../shared/account/traveler-account-layout.component';
import {
  ACCOMMODATION_OPTIONS,
  AccommodationPreference,
  INTEREST_OPTIONS,
  TRANSPORT_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
  TravelStyle,
  TravelerInterest,
  TravelerPreferences,
  TransportPreference,
} from './traveler-account.models';
import { TravelerAccountService } from './traveler-account.service';

const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-traveler-profile',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    RouterLink,
    ExperienceIcon,
    TravelerAccountLayoutComponent,
    AccountPageHeaderComponent,
    AccountProfileAvatarComponent,
    AccountStatusBadgeComponent,
    AccountConfirmDialogComponent,
    AccountLoadingSkeletonComponent,
  ],
  template: `
    <app-traveler-account-layout [account]="profile()" active="profile" contentLabel="My Profile">
      <app-account-page-header
        title="My Profile"
        description="Manage your personal information and travel preferences."
        headingId="profile-heading"
      >
        <button type="button" class="btn-outline" (click)="refreshAll()" [disabled]="isLoading()">
          {{ isLoading() ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button type="button" class="btn-primary" (click)="toggleEdit()" [disabled]="isLoading() || !profile()">
          {{ isEditing() ? 'Close Editor' : 'Edit Profile' }}
        </button>
      </app-account-page-header>

      @if (isLoading() && !profile()) {
        <app-account-loading-skeleton variant="card" [count]="2" />
      } @else if (errorMessage() && !profile()) {
        <div class="state-banner error" role="alert">
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn-retry" (click)="refreshProfile()">Try again</button>
        </div>
      } @else if (profile(); as user) {
        @if (errorMessage()) {
          <div class="state-banner warning" role="alert">
            <span>{{ errorMessage() }}</span>
            <button type="button" class="btn-retry" (click)="refreshProfile()">Retry</button>
          </div>
        }

        <section class="account-card profile-hero-card" aria-label="Traveler Profile Information">
          <div class="hero-top">
            <div class="avatar-upload-block">
              <app-account-profile-avatar
                [fullName]="user.full_name"
                [photoUrl]="displayedAvatarUrl()"
                size="lg"
              />
              <div class="avatar-controls">
                <label class="btn-outline-sm file-trigger" [class.disabled]="isAvatarBusy()">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onAvatarFileSelected($event)"
                    [disabled]="isAvatarBusy()"
                  />
                  <span>{{ isAvatarBusy() ? 'Uploading...' : (hasRemoteAvatar() ? 'Replace Photo' : 'Upload Photo') }}</span>
                </label>

                @if (previewObjectUrl() && !isAvatarBusy()) {
                  <button type="button" class="btn-primary-sm" (click)="uploadPendingAvatar()">
                    Save Photo
                  </button>
                  <button type="button" class="btn-ghost-sm" (click)="clearPendingAvatar()">
                    Discard
                  </button>
                } @else if (hasRemoteAvatar() && !isAvatarBusy()) {
                  <button type="button" class="btn-danger-sm" (click)="deleteAvatarDialogOpen.set(true)">
                    Remove Photo
                  </button>
                }
                <small class="avatar-hint">JPEG, PNG, or WebP up to 5 MB.</small>
              </div>
            </div>

            <div class="hero-identity">
              <h2>{{ user.full_name }}</h2>
              <p class="email-line">{{ user.email }}</p>
              <div class="status-chips">
                <app-account-status-badge
                  [status]="user.email_verified ? 'confirmed' : 'pending'"
                  [labelOverride]="user.email_verified ? 'Email Verified' : 'Verification Pending'"
                />
                <app-account-status-badge
                  [status]="user.is_active ? 'confirmed' : 'cancelled'"
                  [labelOverride]="user.is_active ? 'Active Account' : 'Inactive Account'"
                />
                <span class="role-chip">{{ authMethodLabel() }}</span>
              </div>
            </div>
          </div>

          @if (avatarFeedback(); as afb) {
            <div class="feedback-banner" [class.error]="afb.kind === 'error'" role="status">
              {{ afb.message }}
            </div>
          }

          <dl class="info-grid">
            <div class="info-item">
              <dt>Full Name</dt>
              <dd>{{ user.full_name }}</dd>
            </div>
            <div class="info-item">
              <dt>Email Address</dt>
              <dd>{{ user.email }}</dd>
            </div>
            <div class="info-item">
              <dt>Phone Number</dt>
              <dd>{{ user.phone || 'Not provided' }}</dd>
            </div>
            <div class="info-item">
              <dt>Country</dt>
              <dd>{{ user.country || 'Not provided' }}</dd>
            </div>
            <div class="info-item">
              <dt>Account Role</dt>
              <dd class="cap">{{ user.role }}</dd>
            </div>
            <div class="info-item">
              <dt>Member Since</dt>
              <dd>{{ user.created_at ? (user.created_at | date: 'd MMM yyyy') : 'Verified Member' }}</dd>
            </div>
          </dl>
        </section>

        @if (isEditing()) {
          <section class="account-card" aria-labelledby="edit-profile-heading">
            <div class="card-head">
              <div>
                <h3 id="edit-profile-heading">Edit Profile</h3>
                <p>Update your personal details. Email address changes require verified re-authentication and cannot be edited directly.</p>
              </div>
            </div>

            @if (saveFeedback(); as sfb) {
              <div class="feedback-banner" [class.error]="sfb.kind === 'error'" role="status">
                {{ sfb.message }}
              </div>
            }

            <form class="profile-form" (submit)="$event.preventDefault(); saveProfile()">
              <div class="form-grid">
                <label class="field">
                  <span>Full Name *</span>
                  <input
                    type="text"
                    name="fullName"
                    maxlength="120"
                    [ngModel]="fullNameDraft()"
                    (ngModelChange)="fullNameDraft.set($event)"
                    [disabled]="isSavingProfile()"
                    placeholder="Enter your full name"
                  />
                  @if (fullNameError()) {
                    <small class="field-error">{{ fullNameError() }}</small>
                  }
                </label>

                <label class="field">
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    name="phone"
                    maxlength="32"
                    [ngModel]="phoneDraft()"
                    (ngModelChange)="phoneDraft.set($event)"
                    [disabled]="isSavingProfile()"
                    placeholder="+94 77 123 4567"
                  />
                  @if (phoneError()) {
                    <small class="field-error">{{ phoneError() }}</small>
                  }
                </label>

                <label class="field">
                  <span>Country</span>
                  <input
                    type="text"
                    name="country"
                    maxlength="80"
                    [ngModel]="countryDraft()"
                    (ngModelChange)="countryDraft.set($event)"
                    [disabled]="isSavingProfile()"
                    placeholder="Sri Lanka"
                  />
                </label>

                <label class="field">
                  <span>Email Address (Read-only)</span>
                  <input type="email" [value]="user.email" readonly aria-readonly="true" />
                </label>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-outline" (click)="cancelEdit()" [disabled]="isSavingProfile()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="isSavingProfile() || !!fullNameError() || !!phoneError()"
                >
                  {{ isSavingProfile() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </section>
        }

        <!-- Travel Preferences Card -->
        <section class="account-card" aria-labelledby="prefs-heading">
          <div class="card-head">
            <div>
              <h3 id="prefs-heading">Travel Preferences</h3>
              <p>Customize destinations, interests, stay types, transport, and budget preferences in CeylonGoDB.</p>
            </div>
            <a routerLink="/ai-planner" class="btn-outline-link">
              <app-experience-icon name="sparkles" />
              <span>Open AI Trip Planner</span>
            </a>
          </div>

          @if (isLoadingPrefs()) {
            <app-account-loading-skeleton variant="card" [count]="1" />
          } @else if (prefsLoadError()) {
            <div class="state-banner error" role="alert">
              <span>{{ prefsLoadError() }}</span>
              <button type="button" class="btn-retry" (click)="loadPreferences()">Retry</button>
            </div>
          } @else {
            @if (prefsFeedback(); as pfb) {
              <div class="feedback-banner" [class.error]="pfb.kind === 'error'" role="status">
                {{ pfb.message }}
              </div>
            }

            <div class="prefs-form">
              <div class="pref-block">
                <span class="pref-label">Preferred Destinations ({{ preferredDestinations().length }}/20)</span>
                <div class="dest-input-row">
                  <input
                    type="text"
                    maxlength="80"
                    [ngModel]="destinationInput()"
                    (ngModelChange)="destinationInput.set($event)"
                    (keydown.enter)="$event.preventDefault(); addDestination()"
                    placeholder="e.g., Ella, Kandy, Galle, Jaffna"
                    [disabled]="isSavingPrefs()"
                  />
                  <button
                    type="button"
                    class="btn-outline-sm"
                    (click)="addDestination()"
                    [disabled]="isSavingPrefs() || !destinationInput().trim()"
                  >
                    Add
                  </button>
                </div>
                @if (preferredDestinations().length > 0) {
                  <div class="chip-list">
                    @for (dest of preferredDestinations(); track dest) {
                      <button
                        type="button"
                        class="chip removable"
                        (click)="removeDestination(dest)"
                        [disabled]="isSavingPrefs()"
                        [attr.aria-label]="'Remove ' + dest"
                      >
                        <span>{{ dest }}</span>
                        <span aria-hidden="true">&times;</span>
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="pref-block">
                <span class="pref-label">Travel Interests</span>
                <div class="chip-list">
                  @for (opt of interestOptions; track opt.value) {
                    <button
                      type="button"
                      class="chip selectable"
                      [class.selected]="selectedInterests().includes(opt.value)"
                      (click)="toggleInterest(opt.value)"
                      [disabled]="isSavingPrefs()"
                    >
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="pref-two-col">
                <div class="pref-block">
                  <span class="pref-label">Accommodation Preferences</span>
                  <div class="chip-list">
                    @for (opt of accommodationOptions; track opt.value) {
                      <button
                        type="button"
                        class="chip selectable"
                        [class.selected]="selectedAccommodations().includes(opt.value)"
                        (click)="toggleAccommodation(opt.value)"
                        [disabled]="isSavingPrefs()"
                      >
                        {{ opt.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="pref-block">
                  <span class="pref-label">Transport Preferences</span>
                  <div class="chip-list">
                    @for (opt of transportOptions; track opt.value) {
                      <button
                        type="button"
                        class="chip selectable"
                        [class.selected]="selectedTransports().includes(opt.value)"
                        (click)="toggleTransport(opt.value)"
                        [disabled]="isSavingPrefs()"
                      >
                        {{ opt.label }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <div class="pref-three-col">
                <label class="field">
                  <span>Minimum Budget (LKR)</span>
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    [ngModel]="budgetMin()"
                    (ngModelChange)="budgetMin.set($event)"
                    [disabled]="isSavingPrefs()"
                    placeholder="e.g., 15000"
                  />
                </label>

                <label class="field">
                  <span>Maximum Budget (LKR)</span>
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    [ngModel]="budgetMax()"
                    (ngModelChange)="budgetMax.set($event)"
                    [disabled]="isSavingPrefs()"
                    placeholder="e.g., 75000"
                  />
                </label>

                <label class="field">
                  <span>Travel Style</span>
                  <select
                    [ngModel]="travelStyle() ?? ''"
                    (ngModelChange)="travelStyle.set($event || null)"
                    [disabled]="isSavingPrefs()"
                  >
                    <option value="">No preference</option>
                    @for (opt of travelStyleOptions; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                </label>
              </div>

              @if (budgetError()) {
                <p class="field-error" role="alert">{{ budgetError() }}</p>
              }

              <div class="form-actions">
                <button
                  type="button"
                  class="btn-outline"
                  (click)="clearPreferences()"
                  [disabled]="isSavingPrefs()"
                >
                  Clear Optional Preferences
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  (click)="savePreferences()"
                  [disabled]="isSavingPrefs() || !!budgetError()"
                >
                  {{ isSavingPrefs() ? 'Saving...' : 'Save Preferences' }}
                </button>
              </div>
            </div>
          }
        </section>
      }

      <app-account-confirm-dialog
        [open]="deleteAvatarDialogOpen()"
        title="Remove profile photo?"
        message="Your account will display your initials instead of a profile photo."
        confirmLabel="Remove Photo"
        cancelLabel="Keep Photo"
        [destructive]="true"
        [busy]="isAvatarBusy()"
        (confirmed)="confirmDeleteAvatar()"
        (cancelled)="deleteAvatarDialogOpen.set(false)"
      />
    </app-traveler-account-layout>
  `,
  styles: [`
    .account-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.3rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .hero-top {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .avatar-upload-block {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      flex-wrap: wrap;
    }

    .avatar-controls {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .file-trigger {
      position: relative;
      overflow: hidden;

      input[type='file'] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }

      &.disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    }

    .avatar-hint {
      color: #64748b;
      font-size: 0.74rem;
    }

    .hero-identity {
      min-width: 0;
      flex: 1;

      h2 {
        margin: 0;
        color: #082b5c;
        font-size: 1.32rem;
        font-weight: 700;
      }

      .email-line {
        margin: 0.2rem 0 0.55rem;
        color: #64748b;
        font-size: 0.92rem;
        overflow-wrap: anywhere;
      }
    }

    .status-chips {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .role-chip {
      padding: 0.25rem 0.68rem;
      border-radius: 999px;
      background: #edf5ff;
      color: #082b5c;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .info-grid {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem 1.25rem;
    }

    .info-item {
      padding: 0.75rem 0.9rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;

      dt {
        color: #64748b;
        font-size: 0.78rem;
        margin-bottom: 0.2rem;
      }

      dd {
        margin: 0;
        color: #0f172a;
        font-size: 0.92rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .cap {
        text-transform: capitalize;
      }
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;

      h3 {
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

    .feedback-banner {
      padding: 0.75rem 0.95rem;
      border-radius: 10px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 0.87rem;

      &.error {
        background: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;
      }
    }

    .profile-form,
    .prefs-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-grid,
    .pref-two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }

    .pref-three-col {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.9rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.32rem;

      span {
        font-size: 0.83rem;
        font-weight: 600;
        color: #0f172a;
      }

      input,
      select {
        min-height: 42px;
        padding: 0 0.8rem;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        font: inherit;
        font-size: 0.9rem;
        color: #0f172a;
        background: #ffffff;

        &[readonly] {
          background: #f8fafc;
          color: #64748b;
        }
      }
    }

    .field-error {
      margin: 0;
      color: #dc2626;
      font-size: 0.8rem;
    }

    .pref-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .pref-label {
      color: #082b5c;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .dest-input-row {
      display: flex;
      gap: 0.5rem;

      input {
        flex: 1;
        min-width: 0;
        min-height: 40px;
        padding: 0 0.8rem;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        font: inherit;
        font-size: 0.88rem;
      }
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.78rem;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;

      &.selected,
      &.removable {
        background: #eaf2ff;
        border-color: #0066ff;
        color: #0066ff;
      }

      &:hover:not(:disabled) {
        border-color: #0066ff;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .btn-primary,
    .btn-outline,
    .btn-outline-link,
    .btn-retry {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 40px;
      padding: 0 1rem;
      border-radius: 10px;
      font: inherit;
      font-size: 0.88rem;
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
    .btn-outline-link,
    .btn-retry {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #082b5c;

      &:hover:not(:disabled) {
        background: #edf5ff;
        border-color: #bfdbfe;
      }
    }

    .btn-primary-sm,
    .btn-outline-sm,
    .btn-danger-sm,
    .btn-ghost-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 0 0.78rem;
      border-radius: 8px;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary-sm {
      border: none;
      background: #0066ff;
      color: #ffffff;
    }

    .btn-outline-sm {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #082b5c;
    }

    .btn-danger-sm {
      border: 1px solid #fca5a5;
      background: #ffffff;
      color: #dc2626;
    }

    .btn-ghost-sm {
      border: none;
      background: transparent;
      color: #64748b;
    }

    .state-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.88rem;

      &.warning {
        background: #fffbeb;
        border-color: #fde68a;
        color: #92400e;
      }
    }

    @media (max-width: 780px) {
      .info-grid,
      .form-grid,
      .pref-two-col,
      .pref-three-col {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TravelerProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(TravelerAccountService);
  private readonly destroyRef = inject(DestroyRef);

  readonly interestOptions = INTEREST_OPTIONS;
  readonly accommodationOptions = ACCOMMODATION_OPTIONS;
  readonly transportOptions = TRANSPORT_OPTIONS;
  readonly travelStyleOptions = TRAVEL_STYLE_OPTIONS;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditing = signal(false);
  readonly isSavingProfile = signal(false);
  readonly saveFeedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  readonly fullNameDraft = signal('');
  readonly phoneDraft = signal('');
  readonly countryDraft = signal('');

  // Avatar state
  readonly isAvatarBusy = signal(false);
  readonly deleteAvatarDialogOpen = signal(false);
  readonly avatarFeedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);
  readonly pendingAvatarFile = signal<File | null>(null);
  readonly previewObjectUrl = signal<string | null>(null);

  // Travel preferences state
  readonly isLoadingPrefs = signal(false);
  readonly prefsLoadError = signal<string | null>(null);
  readonly isSavingPrefs = signal(false);
  readonly prefsFeedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);
  readonly preferredDestinations = signal<string[]>([]);
  readonly destinationInput = signal('');
  readonly selectedInterests = signal<TravelerInterest[]>([]);
  readonly selectedAccommodations = signal<AccommodationPreference[]>([]);
  readonly selectedTransports = signal<TransportPreference[]>([]);
  readonly budgetMin = signal<number | string | null>(null);
  readonly budgetMax = signal<number | string | null>(null);
  readonly travelStyle = signal<TravelStyle | null>(null);

  readonly profile = computed<User | null>(() => this.authService.currentUser());

  readonly hasRemoteAvatar = computed(() => Boolean(this.profile()?.avatar_url));
  readonly displayedAvatarUrl = computed(
    () => this.previewObjectUrl() || this.authService.avatarUrl?.() || this.profile()?.avatar_url || null,
  );

  readonly authMethodLabel = computed(() => {
    const m = this.profile()?.authentication_method;
    if (m === 'google') return 'Google Sign-In';
    if (m === 'password') return 'Email & Password';
    return 'Traveler';
  });

  readonly fullNameError = computed(() => {
    const val = this.fullNameDraft().trim();
    if (!val) return 'Full name is required.';
    if (val.length < 2) return 'Full name must be at least 2 characters.';
    if (val.length > 120) return 'Full name must be 120 characters or fewer.';
    return null;
  });

  readonly phoneError = computed(() => {
    const val = this.phoneDraft().trim();
    if (!val) return null;
    if (!/^[+\d\s\-()]{7,32}$/.test(val)) return 'Enter a valid phone number.';
    return null;
  });

  readonly budgetError = computed(() => {
    const min = this.parseNullableInt(this.budgetMin());
    const max = this.parseNullableInt(this.budgetMax());
    if (min !== null && (min < 0 || min > 1_000_000_000)) return 'Minimum budget must be between 0 and 1,000,000,000 LKR.';
    if (max !== null && (max < 0 || max > 1_000_000_000)) return 'Maximum budget must be between 0 and 1,000,000,000 LKR.';
    if (min !== null && max !== null && max < min) return 'Maximum budget must be greater than or equal to minimum budget.';
    return null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePreviewObjectUrl());
  }

  ngOnInit(): void {
    this.syncDraftsFromUser(this.profile());
    this.refreshAll();
  }

  refreshAll(): void {
    this.refreshProfile();
    this.loadPreferences();
  }

  refreshProfile(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.syncDraftsFromUser(user);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.status === 401
            ? 'Your session has expired. Please sign in again to view your profile.'
            : 'Unable to fetch the latest profile details from the server.',
        );
      },
    });
  }

  toggleEdit(): void {
    if (this.isEditing()) {
      this.cancelEdit();
      return;
    }
    this.syncDraftsFromUser(this.profile());
    this.saveFeedback.set(null);
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.saveFeedback.set(null);
    this.syncDraftsFromUser(this.profile());
  }

  saveProfile(): void {
    if (this.isSavingProfile() || this.fullNameError() || this.phoneError()) return;
    const current = this.profile();
    if (!current) return;

    const patch: ProfilePatchRequest = {};
    const nextName = this.fullNameDraft().trim();
    const nextPhone = this.phoneDraft().trim() || null;
    const nextCountry = this.countryDraft().trim() || null;

    if (nextName !== current.full_name) patch.full_name = nextName;
    if (nextPhone !== (current.phone ?? null)) patch.phone = nextPhone;
    if (nextCountry !== (current.country ?? null)) patch.country = nextCountry;

    if (Object.keys(patch).length === 0) {
      this.saveFeedback.set({ kind: 'success', message: 'Your profile is already up to date.' });
      return;
    }

    this.isSavingProfile.set(true);
    this.saveFeedback.set(null);

    this.authService.updateProfile(patch).subscribe({
      next: (updated) => {
        this.isSavingProfile.set(false);
        this.syncDraftsFromUser(updated);
        this.isEditing.set(false);
        this.saveFeedback.set({ kind: 'success', message: 'Profile updated successfully.' });
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingProfile.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.saveFeedback.set({
          kind: 'error',
          message: detail || 'Could not save profile changes. Please try again.',
        });
      },
    });
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.avatarFeedback.set(null);
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      this.avatarFeedback.set({
        kind: 'error',
        message: 'Unsupported image format. Please choose a JPEG, PNG, or WebP file.',
      });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      this.avatarFeedback.set({
        kind: 'error',
        message: 'Image exceeds the 5 MB limit. Please select a smaller file.',
      });
      return;
    }

    this.revokePreviewObjectUrl();
    this.pendingAvatarFile.set(file);
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      this.previewObjectUrl.set(URL.createObjectURL(file));
    }
  }

  clearPendingAvatar(): void {
    this.pendingAvatarFile.set(null);
    this.revokePreviewObjectUrl();
  }

  uploadPendingAvatar(): void {
    const file = this.pendingAvatarFile();
    if (!file || this.isAvatarBusy()) return;

    this.isAvatarBusy.set(true);
    this.avatarFeedback.set(null);

    this.authService.uploadAvatar(file).subscribe({
      next: () => {
        this.isAvatarBusy.set(false);
        this.clearPendingAvatar();
        this.avatarFeedback.set({ kind: 'success', message: 'Profile photo updated.' });
      },
      error: (err: HttpErrorResponse) => {
        this.isAvatarBusy.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.avatarFeedback.set({
          kind: 'error',
          message: detail || 'Could not upload profile photo. Your previous photo has been preserved.',
        });
      },
    });
  }

  confirmDeleteAvatar(): void {
    if (this.isAvatarBusy()) return;
    this.isAvatarBusy.set(true);
    this.avatarFeedback.set(null);

    this.authService.deleteAvatar().subscribe({
      next: () => {
        this.isAvatarBusy.set(false);
        this.deleteAvatarDialogOpen.set(false);
        this.clearPendingAvatar();
        this.avatarFeedback.set({ kind: 'success', message: 'Profile photo removed.' });
      },
      error: (err: HttpErrorResponse) => {
        this.isAvatarBusy.set(false);
        this.deleteAvatarDialogOpen.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.avatarFeedback.set({
          kind: 'error',
          message: detail || 'Could not remove profile photo. Please try again.',
        });
      },
    });
  }

  loadPreferences(): void {
    if (this.isLoadingPrefs()) return;
    this.isLoadingPrefs.set(true);
    this.prefsLoadError.set(null);

    this.accountService.getPreferences().subscribe({
      next: (prefs) => {
        this.isLoadingPrefs.set(false);
        this.applyPreferencesToSignals(prefs);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingPrefs.set(false);
        this.prefsLoadError.set(
          err?.status === 401
            ? 'Please sign in again to load your travel preferences.'
            : 'Unable to load travel preferences right now.',
        );
      },
    });
  }

  addDestination(): void {
    const val = this.destinationInput().trim().slice(0, 80);
    if (!val) return;
    if (this.preferredDestinations().length >= 20) return;
    if (!this.preferredDestinations().some((d) => d.toLowerCase() === val.toLowerCase())) {
      this.preferredDestinations.update((list) => [...list, val]);
    }
    this.destinationInput.set('');
  }

  removeDestination(dest: string): void {
    this.preferredDestinations.update((list) => list.filter((d) => d !== dest));
  }

  toggleInterest(interest: TravelerInterest): void {
    this.selectedInterests.update((list) =>
      list.includes(interest) ? list.filter((i) => i !== interest) : [...list, interest],
    );
  }

  toggleAccommodation(acc: AccommodationPreference): void {
    this.selectedAccommodations.update((list) =>
      list.includes(acc) ? list.filter((a) => a !== acc) : [...list, acc],
    );
  }

  toggleTransport(transport: TransportPreference): void {
    this.selectedTransports.update((list) =>
      list.includes(transport) ? list.filter((t) => t !== transport) : [...list, transport],
    );
  }

  savePreferences(): void {
    if (this.isSavingPrefs() || this.budgetError()) return;
    this.isSavingPrefs.set(true);
    this.prefsFeedback.set(null);

    const payload: TravelerPreferences = {
      preferred_destinations: this.preferredDestinations(),
      interests: this.selectedInterests(),
      accommodation_preferences: this.selectedAccommodations(),
      transport_preferences: this.selectedTransports(),
      budget_min: this.parseNullableInt(this.budgetMin()),
      budget_max: this.parseNullableInt(this.budgetMax()),
      travel_style: this.travelStyle(),
    };

    this.accountService.savePreferences(payload).subscribe({
      next: (saved) => {
        this.isSavingPrefs.set(false);
        this.applyPreferencesToSignals(saved);
        this.prefsFeedback.set({ kind: 'success', message: 'Travel preferences saved.' });
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingPrefs.set(false);
        const detail = typeof err?.error?.detail === 'string' ? err.error.detail : null;
        this.prefsFeedback.set({
          kind: 'error',
          message: detail || 'Could not save travel preferences. Please verify values and retry.',
        });
      },
    });
  }

  clearPreferences(): void {
    if (this.isSavingPrefs()) return;
    this.preferredDestinations.set([]);
    this.selectedInterests.set([]);
    this.selectedAccommodations.set([]);
    this.selectedTransports.set([]);
    this.budgetMin.set(null);
    this.budgetMax.set(null);
    this.travelStyle.set(null);
    this.savePreferences();
  }

  private applyPreferencesToSignals(prefs: TravelerPreferences): void {
    this.preferredDestinations.set(prefs.preferred_destinations ?? []);
    this.selectedInterests.set(prefs.interests ?? []);
    this.selectedAccommodations.set(prefs.accommodation_preferences ?? []);
    this.selectedTransports.set(prefs.transport_preferences ?? []);
    this.budgetMin.set(prefs.budget_min ?? null);
    this.budgetMax.set(prefs.budget_max ?? null);
    this.travelStyle.set(prefs.travel_style ?? null);
  }

  private parseNullableInt(val: number | string | null | undefined): number | null {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  private syncDraftsFromUser(user: User | null): void {
    this.fullNameDraft.set(user?.full_name ?? '');
    this.phoneDraft.set(user?.phone ?? '');
    this.countryDraft.set(user?.country ?? '');
  }

  private revokePreviewObjectUrl(): void {
    const existing = this.previewObjectUrl();
    if (existing && existing.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(existing);
      } catch {
        // Ignore cleanup failures
      }
    }
    this.previewObjectUrl.set(null);
  }
}
