
import { Component, inject, OnInit } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { DemoAuth } from '../../services/demo-auth';

// Password Match Validator
function passwordsMatch(
  control: AbstractControl
): ValidationErrors | null {

  const password = control.get('password')?.value;
  const confirmPassword =
    control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly demoAuth = inject(DemoAuth);

  email = '';

  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  isLoading = false;

  // Reset Password Form
  resetForm = this.fb.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/
          )
        ]
      ],

      confirmPassword: [
        '',
        Validators.required
      ]
    },
    {
      validators: passwordsMatch
    }
  );

  // Get Email from Previous Page
  ngOnInit(): void {
    const state = history.state;

    this.email = (state?.email || '')
      .trim()
      .toLowerCase();
  }

  // Show / Hide Password
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Show / Hide Confirm Password
  toggleConfirmPassword(): void {
    this.showConfirmPassword =
      !this.showConfirmPassword;
  }

  // Reset Password - Frontend Demo
  resetPassword(): void {

    this.errorMessage = '';

    if (this.isLoading) {
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (!this.email) {
      this.errorMessage =
        'Email not found. Please restart the reset process.';
      return;
    }

    const newPassword =
      this.resetForm.value.password || '';

    this.isLoading = true;

    try {

      // Update temporary demo password
      const updated = this.demoAuth.resetPassword(
        this.email,
        newPassword
      );

      if (!updated) {
        this.errorMessage =
          'Demo account not found. Please register first.';
        return;
      }

      // Navigate to Reset Success Page
      this.router.navigate(['/reset-success'], {
        state: {
          email: this.email
        }
      });

    } catch {
      this.errorMessage =
        'Unable to reset demo password. Please try again.';

    } finally {
      this.isLoading = false;
    }
  }

  // Back to Login
  backToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        email: this.email
      }
    });
  }
}
