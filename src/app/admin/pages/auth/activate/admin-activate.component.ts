import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  AdminInvitationVerifyResponse,
  AdminManagementService,
} from '../../../core/services/admin-management.service';

@Component({
  selector: 'app-admin-activate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-activate.component.html',
  styleUrl: './admin-activate.component.scss',
})
export class AdminActivateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly managementService = inject(AdminManagementService);

  readonly token = signal<string>('');
  readonly isVerifying = signal<boolean>(true);
  readonly verificationError = signal<string | null>(null);
  readonly invitation = signal<AdminInvitationVerifyResponse | null>(null);

  readonly isSubmitting = signal<boolean>(false);
  readonly activationError = signal<string | null>(null);
  readonly activationSuccess = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);

  readonly form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const rawToken = this.route.snapshot.queryParams['token'] || '';
    if (!rawToken || rawToken.trim().length < 16) {
      this.isVerifying.set(false);
      this.verificationError.set(
        'Missing or invalid invitation token. Please check the invitation link sent to your email.'
      );
      return;
    }

    this.token.set(rawToken.trim());
    this.verifyToken(rawToken.trim());
  }

  verifyToken(token: string): void {
    this.isVerifying.set(true);
    this.verificationError.set(null);

    this.managementService.verifyInvitation(token).subscribe({
      next: (res) => {
        this.invitation.set(res);
        this.isVerifying.set(false);
      },
      error: (err) => {
        this.isVerifying.set(false);
        const detail = err?.error?.detail || err?.message || 'Invalid or expired invitation token.';
        this.verificationError.set(detail);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token()) return;

    const { password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.activationError.set('Passwords do not match. Please re-enter.');
      return;
    }

    this.isSubmitting.set(true);
    this.activationError.set(null);

    this.managementService.activateAccount(this.token(), password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.activationSuccess.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.message || 'Activation failed. Please try again.';
        this.activationError.set(detail);
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/admin/login']);
  }
}
