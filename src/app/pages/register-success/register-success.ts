
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  standalone: true,
  imports: [],
  templateUrl: './register-success.html',
  styleUrl: './register-success.scss'
})
export class RegisterSuccess implements OnInit {

  private readonly router = inject(Router);

  fullName = '';
  email = '';

  ngOnInit(): void {
    const state = history.state;

    this.fullName = state?.fullName || '';
    this.email = state?.email || '';
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        email: this.email
      }
    });
  }

  goToHome(): void {
    this.router.navigate(['/auth']);
  }
}
