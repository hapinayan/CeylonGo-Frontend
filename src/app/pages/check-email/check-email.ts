
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [],
  templateUrl: './check-email.html',
  styleUrl: './check-email.scss'
})
export class CheckEmail implements OnInit {
  private readonly router = inject(Router);

  email = '';

  ngOnInit(): void {
    this.email = history.state?.email || '';
  }

  continueToReset(): void {
    this.router.navigate(['/reset-password'], {
      state: { email: this.email }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { email: this.email }
    });
  }
}
