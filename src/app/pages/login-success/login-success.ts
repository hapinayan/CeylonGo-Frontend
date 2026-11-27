
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-success',
  standalone: true,
  imports: [],
  templateUrl: './login-success.html',
  styleUrl: './login-success.scss'
})
export class LoginSuccess implements OnInit {

  private readonly router = inject(Router);

  email = '';

  ngOnInit(): void {
    const state = history.state;

    this.email = state?.email || '';
  }

  continueExploring(): void {
    this.router.navigate(['/auth']);
  }

  backToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        email: this.email
      }
    });
  }
}
