
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-entry',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-entry.html',
  styleUrl: './auth-entry.css'
})
export class AuthEntry {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Frontend social login demo message
  readonly socialMessage = signal('');

  emailForm = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254)
      ]
    ]
  });

  // EMAIL LOGIN / REGISTER
  continueWithEmail(): void {

    this.socialMessage.set('');

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = (
      this.emailForm.value.email ?? ''
    ).trim().toLowerCase();

    // Frontend testing only.
    // Read demo users created during registration.
    let registeredEmails: string[] = [];

    try {
      const savedEmails = JSON.parse(
        localStorage.getItem('ceylongo_demo_emails') || '[]'
      );

      if (Array.isArray(savedEmails)) {
        registeredEmails = savedEmails.filter(
          (value): value is string =>
            typeof value === 'string'
        );
      }

      // Also support existing register.ts demo storage.
      const savedUsers = JSON.parse(
        localStorage.getItem('ceylongo_demo_users') || '[]'
      );

      if (Array.isArray(savedUsers)) {
        for (const user of savedUsers) {
          if (
            user &&
            typeof user.email === 'string'
          ) {
            registeredEmails.push(user.email);
          }
        }
      }

    } catch {
      this.socialMessage.set(
        'Unable to read demo accounts. Please try again.'
      );
      return;
    }

    const isRegistered = registeredEmails.some(
      savedEmail =>
        savedEmail.trim().toLowerCase() === email
    );

    if (isRegistered) {
      this.router.navigate(['/login'], {
        queryParams: { email }
      });
    } else {
      this.router.navigate(['/register'], {
        queryParams: { email }
      });
    }
  }

  // GOOGLE - FRONTEND DEMO
  continueWithGoogle(): void {
    this.socialMessage.set(
      'Google Sign In is available in frontend demo mode only. Real authentication will be connected later.'
    );
  }

  // APPLE - FRONTEND DEMO
  continueWithApple(): void {
    this.socialMessage.set(
      'Apple Sign In is available in frontend demo mode only. Real authentication will be connected later.'
    );
  }

  // WHATSAPP - FRONTEND DEMO
  continueWithWhatsApp(): void {
    this.socialMessage.set(
      'WhatsApp Sign In is available in frontend demo mode only. Real authentication will be connected later.'
    );
  }

  // CLOSE MODAL
  closeModal(): void {
    this.router.navigate(['/']);
  }
}
