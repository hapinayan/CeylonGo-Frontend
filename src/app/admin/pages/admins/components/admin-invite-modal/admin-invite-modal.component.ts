import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminRole } from '../../../../core/models/admin-auth.models';
import { AdminInvitationRequest } from '../../../../core/models/admin-management.models';

@Component({
  selector: 'app-admin-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-invite-modal.component.html',
  styleUrls: ['./admin-invite-modal.component.scss'],
})
export class AdminInviteModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() invite = new EventEmitter<AdminInvitationRequest>();

  email = '';
  fullName = '';
  role: AdminRole = 'admin';
  department = 'Service Operations';
  invitationNote = '';

  validationError: string | null = null;

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.email || !this.email.includes('@')) {
      this.validationError = 'A valid official email is required.';
      return;
    }
    if (!this.fullName || this.fullName.trim().length < 2) {
      this.validationError = 'Administrator full name is required.';
      return;
    }

    this.invite.emit({
      email: this.email.trim(),
      full_name: this.fullName.trim(),
      role: this.role,
      department: this.department,
      invitation_note: this.invitationNote.trim() || undefined,
    });
  }
}
