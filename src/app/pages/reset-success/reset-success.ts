
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-success',
  standalone: true,
  imports: [],
  templateUrl: './reset-success.html',
  styleUrl: './reset-success.scss'
})
export class ResetSuccess implements OnInit {
  private readonly router = inject(Router);

  email = '';

  ngOnInit(): void {
    this.email = history.state?.email || '';
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { email: this.email }
    });
  }
}
