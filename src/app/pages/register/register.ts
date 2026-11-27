import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { finalize } from 'rxjs';

import { RegisterRequest } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;

  if (!password || !confirm) {
    return null;
  }

  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  registerForm = this.fb.group(
    {
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(254),
        ],
      ],
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: passwordMatchValidator,
    }
  );

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.registerForm.patchValue({
        email: email.trim().toLowerCase(),
      });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('register-page')) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  goBack(): void {
    this.router.navigate(['/auth']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  onRegister(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isLoading) {
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const data = this.registerForm.getRawValue();
    const fullName = (data.fullName || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';

    this.isLoading = true;

    const payload: RegisterRequest = {
      full_name: fullName,
      email: email,
      password: password,
    };

    this.authService
      .register(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (res) => {
          this.successMessage = 'Registration completed successfully!';
          const confirmedFullName = res?.user?.full_name || fullName;
          const confirmedEmail = res?.user?.email || email;
          this.router.navigate(['/register-success'], {
            state: { fullName: confirmedFullName, email: confirmedEmail },
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.errorMessage =
              'This email is already registered. Please sign in.';
          } else if (err.status === 422) {
            this.errorMessage =
              'Please verify your registration details (password must be at least 8 characters with uppercase, lowercase, and a number).';
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.';
          } else {
            this.errorMessage =
              err.error?.detail ||
              'Unable to complete registration. Please try again.';
          }
        },
      });
  }
}
