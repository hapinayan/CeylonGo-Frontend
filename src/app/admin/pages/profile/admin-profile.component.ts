import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminProfileDetails } from '../../core/models/admin-profile.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminProfileService } from '../../core/services/admin-profile.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss'],
})
export class AdminProfileComponent implements OnInit {
  private readonly profileService = inject(AdminProfileService);
  private readonly authService = inject(AdminAuthService);

  profile: AdminProfileDetails | null = null;
  isLoading = false;
  isSaving = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  editFullName = '';
  editPhone = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getProfile().subscribe({
      next: (prof) => {
        this.profile = prof;
        this.editFullName = prof.full_name;
        this.editPhone = prof.phone || '';
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to load profile details.';
      },
    });
  }

  saveProfile(): void {
    if (!this.profile) return;
    this.isSaving = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.profileService
      .updateProfile({
        full_name: this.editFullName.trim(),
        phone: this.editPhone.trim(),
        notification_preferences: this.profile.notification_preferences,
      })
      .subscribe({
        next: (updated) => {
          this.profile = updated;
          this.isSaving = false;
          this.successMessage = 'Profile updated successfully.';
          setTimeout(() => (this.successMessage = null), 3000);
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.message || 'Failed to update profile.';
        },
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
