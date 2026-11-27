import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProviderAccountService, providerError } from '../../core/services/provider-account.service';
import { ProviderPreviewService } from '../provider-preview.service';

@Component({
  selector: 'app-provider-settings',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-settings.html',
  styleUrl: './provider-account.scss',
})
export class ProviderSettingsPage {
  readonly account = inject(ProviderAccountService);
  readonly preview = inject(ProviderPreviewService).isPreview;
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly limit = this.fb.control(5, [Validators.required, Validators.min(1), Validators.max(20),
    Validators.pattern(/^\d+$/)]);
  readonly fields = [
    { key: 'current_password', label: 'Current password', autocomplete: 'current-password' },
    { key: 'new_password', label: 'New password', autocomplete: 'new-password' },
    { key: 'confirm_password', label: 'Confirm new password', autocomplete: 'new-password' },
  ] as const;
  readonly password = this.fb.group({
    current_password: ['', [Validators.required, Validators.maxLength(128)]],
    new_password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirm_password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });
  readonly passwordOpen = signal(false);
  readonly visibility = signal<Record<string, boolean>>({});
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly changing = signal(false);
  readonly error = signal('');
  readonly passwordError = signal('');
  readonly notice = signal('');

  constructor() { if (!this.preview()) this.load(); }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.ready.set(false);
    this.error.set('');
    this.account.getSettings().pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (settings) => { this.limit.reset(settings.dashboard_booking_limit); this.ready.set(true); },
      error: (error) => this.error.set(providerError(error, 'Could not load settings.')),
    });
  }
  save(): void {
    if (!this.ready() || this.limit.invalid || this.saving() || !this.limit.dirty) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    this.account.updateSettings(this.limit.value).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: (settings) => {
        this.limit.reset(settings.dashboard_booking_limit);
        this.notice.set('Dashboard preference saved.');
      },
      error: (error) => this.error.set(providerError(error, 'Could not save your settings.')),
    });
  }
  toggle(key: string): void {
    this.visibility.update((visible) => ({ ...visible, [key]: !visible[key] }));
  }
  closePassword(): void {
    this.password.reset();
    this.visibility.set({});
    this.passwordError.set('');
    this.passwordOpen.set(false);
  }
  change(): void {
    if (this.changing() || this.password.invalid) return;
    const value = this.password.getRawValue();
    this.passwordError.set('');
    if (!value.new_password.trim() || value.new_password === value.current_password) {
      this.passwordError.set('Choose a different password with at least 12 characters.'); return;
    }
    if (value.new_password !== value.confirm_password) {
      this.passwordError.set('New passwords do not match.'); return;
    }
    this.changing.set(true);
    this.account.changePassword(value).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.changing.set(false)),
    ).subscribe({
      next: () => {
        this.closePassword();
        void this.router.navigate(['/provider/login'], {
          replaceUrl: true, queryParams: { passwordChanged: 'true' },
        });
      },
      error: (error) => this.passwordError.set(providerError(error, 'Could not change your password.')),
    });
  }
}
