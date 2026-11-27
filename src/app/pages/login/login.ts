import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';

import { User } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  showPassword = false;

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  get currentUser(): User | null {
    return this.authService.currentUser();
  }

  loginForm = this.fb.group({
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

  ngOnInit(): void {
    const isRegistered =
      this.route.snapshot.queryParamMap.get('registered') === 'true';
    if (isRegistered) {
      this.successMessage.set(
        'Account registered successfully! Please enter your credentials to log in.'
      );
    }

    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.loginForm.patchValue({ email: email.trim().toLowerCase() });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    const email = this.loginForm.value.email || '';
    this.router.navigate(['/forgot-password'], {
      queryParams: { email },
    });
  }

  onLogin(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isLoading()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = (this.loginForm.value.email || '').trim().toLowerCase();
    const password = this.loginForm.value.password || '';

    this.isLoading.set(true);

    this.authService
      .login({ email, password })
      .pipe(
        switchMap((response) => {
          this.successMessage.set(
            `Welcome back, ${response.user.full_name}! Login successful.`
          );

          return this.authService.getCurrentUser().pipe(
            catchError(() => of(response.user)),
            tap(() => {
              this.router.navigate(['/login-success'], {
                state: { email },
              });
            })
          );
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: () => {},
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.errorMessage.set('Invalid email or password.');
          } else if (err.status === 403) {
            this.errorMessage.set(
              err.error?.detail ||
                'Account is inactive. Please contact support.'
            );
          } else if (err.status === 429) {
            this.errorMessage.set(
              'Too many login attempts. Please try again in a few moments.'
            );
          } else if (err.status === 0) {
            this.errorMessage.set(
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.'
            );
          } else {
            this.errorMessage.set(
              err.error?.detail || 'Login failed. Please try again.'
            );
          }
        },
      });
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList.contains('login-page')) {
      this.closeModal();
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goBack(): void {
    this.router.navigate(['/auth']);
  }
}
