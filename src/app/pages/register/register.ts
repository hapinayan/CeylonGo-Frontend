import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { RegisterRequest } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  showPassword = false;
  showConfirmPassword = false;

  private readonly _isLoading = signal(false);
  private readonly _errorMessage = signal('');
  private readonly _successMessage = signal('');

  get isLoading(): boolean {
    return this._isLoading();
  }
  set isLoading(value: boolean) {
    this._isLoading.set(value);
  }

  get errorMessage(): string {
    return this._errorMessage();
  }
  set errorMessage(value: string) {
    this._errorMessage.set(value);
  }

  get successMessage(): string {
    return this._successMessage();
  }
  set successMessage(value: string) {
    this._successMessage.set(value);
  }

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.fb.group(
      {
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(100),
          ],
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(254),
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

        acceptTerms: [false, Validators.requiredTrue],
      },
      { validators: passwordMatchValidator }
    );
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onRegister() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    // Send only full_name, email, and password to backend
    const payload: RegisterRequest = {
      full_name: this.registerForm.value.fullName.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(),
      password: this.registerForm.value.password,
    };

    this.authService
      .register(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage =
            'Account registered successfully! Redirecting to login...';
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { registered: 'true' },
            });
          }, 1200);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.errorMessage =
              err.error?.detail ||
              'An account with this email already exists.';
          } else if (err.status === 422) {
            const detail = err.error?.detail;
            if (Array.isArray(detail) && detail.length > 0) {
              this.errorMessage =
                detail[0].msg || 'Invalid registration details provided.';
            } else if (typeof detail === 'string') {
              this.errorMessage = detail;
            } else {
              this.errorMessage = 'Please verify your form inputs.';
            }
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://localhost:8000.';
          } else {
            this.errorMessage =
              err.error?.detail ||
              'Registration failed. Please try again.';
          }
          this.cdr.markForCheck();
        },
      });
  }
}
