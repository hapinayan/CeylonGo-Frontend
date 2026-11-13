
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  errorMessage = '';
  isLoading = false;

  forgotForm = this.fb.group({
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254)
    ]]
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.forgotForm.patchValue({ email });
    }
  }

  sendResetLink(): void {
    this.errorMessage = '';

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = (
      this.forgotForm.value.email || ''
    ).trim().toLowerCase();

    // Frontend demo only.
    // No actual reset email is sent.
    this.router.navigate(['/check-email'], {
      state: { email }
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }
}
