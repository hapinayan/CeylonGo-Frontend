
import { Component, inject, OnInit } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { DemoAuth } from '../../services/demo-auth';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;

  if (!password || !confirm) {
    return null;
  }

  return password === confirm
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly demoAuth = inject(DemoAuth);

  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  registerForm = this.fb.group({
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254)
    ]],

    fullName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100)
    ]],

    phone: ['', [
      Validators.required,
      Validators.pattern(/^[0-9]{9}$/)
    ]],

    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(128),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    ]],

    confirmPassword: ['', Validators.required]
  }, {
    validators: passwordMatchValidator
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.registerForm.patchValue({
        email: email.trim().toLowerCase()
      });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goBack(): void {
    this.router.navigate(['/auth']);
  }

  closeModal(): void {
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

    const email = (data.email || '').trim().toLowerCase();
    const fullName = (data.fullName || '').trim();
    const phone = data.phone || '';
    const password = data.password || '';

    if (this.demoAuth.isRegistered(email)) {
      this.errorMessage =
        'This email is already registered. Please sign in.';
      return;
    }

    this.isLoading = true;

    try {
      const registered = this.demoAuth.register(
        { email, fullName, phone },
        password
      );

      if (!registered) {
        this.errorMessage =
          'This email is already registered.';
        return;
      }

      // Keep existing Auth Entry email list synchronized.
      const emails = this.demoAuth.getUsers()
        .map(user => user.email);

      try {
        localStorage.setItem(
          'ceylongo_demo_emails',
          JSON.stringify(emails)
        );
      } catch {
        // Profile registration was already saved.
      }

      this.successMessage =
        'Demo registration completed successfully!';

      this.router.navigate(['/register-success'], {
        state: { fullName, email }
      });

    } catch {
      this.errorMessage =
        'Unable to complete demo registration.';
    } finally {
      this.isLoading = false;
    }
  }
}
