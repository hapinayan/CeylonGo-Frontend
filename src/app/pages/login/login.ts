
import { Component, inject, signal, OnInit } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { DemoAuth } from '../../services/demo-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly demoAuth = inject(DemoAuth);

  showPassword = false;

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  loginForm = this.fb.group({
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254)
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(128)
    ]]
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.loginForm.patchValue({ email });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    const email = this.loginForm.value.email || '';

    this.router.navigate(['/forgot-password'], {
      queryParams: { email }
    });
  }

  onLogin(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = (
      this.loginForm.value.email || ''
    ).trim().toLowerCase();

    const password = this.loginForm.value.password || '';

    const valid = this.demoAuth.login(email, password);

    if (!valid) {
      this.errorMessage.set(
        'Invalid email or password. If you refreshed the page, register a new demo account to test login again.'
      );
      return;
    }

    this.successMessage.set('Demo login successful!');

    this.router.navigate(['/login-success'], {
      state: { email }
    });
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goBack(): void {
    this.router.navigate(['/auth']);
  }
}
