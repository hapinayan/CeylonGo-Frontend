
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  registerForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group(
      {
        fullName: ['', [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100)
        ]],

        email: ['', [
          Validators.required,
          Validators.email,
          Validators.maxLength(254)
        ]],

        password: ['', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/
          )
        ]],

        confirmPassword: ['', Validators.required],

        acceptTerms: [false, Validators.requiredTrue]
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Frontend-only validation.
    // No account is created until backend integration.
    alert('Form validation successful. Registration is not connected yet.');
  }
}
