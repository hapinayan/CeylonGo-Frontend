import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';

import { User } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  showPassword = false;

  // Reactive signals backing state for reliable Angular zoneless change detection
  private readonly _isLoading = signal(false);
  private readonly _errorMessage = signal('');
  private readonly _successMessage = signal('');
  private readonly _currentUser = signal<User | null>(null);

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

  get currentUser(): User | null {
    return this._currentUser();
  }
  set currentUser(value: User | null) {
    this._currentUser.set(value);
  }

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
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
        ],
      ],
    });
  }

  ngOnInit(): void {
    const isRegistered =
      this.route.snapshot.queryParamMap.get('registered') === 'true';
    if (isRegistered) {
      this.successMessage =
        'Account registered successfully! Please enter your credentials to log in.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    alert('Password reset is coming soon.');
  }

  onLogin(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    const credentials = {
      email: this.loginForm.value.email.trim().toLowerCase(),
      password: this.loginForm.value.password,
    };

    this.authService
      .login(credentials)
      .pipe(
        switchMap((response) => {
          this.currentUser = response.user;
          this.successMessage = `Welcome back, ${response.user.full_name}! Login successful.`;

          // Request profile via /auth/me with Bearer token
          return this.authService.getCurrentUser().pipe(
            catchError(() => of(response.user))
          );
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (profile) => {
          this.currentUser = profile;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.errorMessage = 'Invalid email or password.';
          } else if (err.status === 403) {
            this.errorMessage =
              err.error?.detail ||
              'Account is inactive. Please contact support.';
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://localhost:8000.';
          } else {
            this.errorMessage =
              err.error?.detail || 'Login failed. Please try again.';
          }
          this.cdr.markForCheck();
        },
      });
  }
}
