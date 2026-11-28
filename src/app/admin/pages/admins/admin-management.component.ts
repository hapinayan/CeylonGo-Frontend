import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminAccountItem,
  AdminInvitationRequest,
  AdminInvitationItem,
  AdminManagementQueryParams,
} from '../../core/models/admin-management.models';
import { AdminManagementService } from '../../core/services/admin-management.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminInviteModalComponent } from './components/admin-invite-modal/admin-invite-modal.component';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSelectComponent,
    AdminInviteModalComponent,
  ],
  templateUrl: './admin-management.component.html',
  styleUrls: ['./admin-management.component.scss'],
})
export class AdminManagementComponent implements OnInit, OnDestroy {
  private readonly managementService = inject(AdminManagementService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly canManage = this.managementService.canManageAdmins;
  readonly currentUser = this.managementService.currentUser;

  admins: AdminAccountItem[] = [];
  invitations: AdminInvitationItem[] = [];
  invitationsLoading = false;
  invitationError: string | null = null;
  updatingInvitation = false;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedRole = 'all';
  selectedStatus = 'all';

  readonly roleOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Roles' },
    { key: 'admin', label: 'Administrator' },
    { key: 'super_admin', label: 'Super Administrator' },
  ];

  readonly statusOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'active', label: 'Active', badgeColor: '#10b981' },
    { key: 'invited', label: 'Invited (Pending)', badgeColor: '#f59e0b' },
    { key: 'inactive', label: 'Deactivated', badgeColor: '#ef4444' },
  ];

  isInviteModalOpen = false;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.loadAdmins();
      });

    this.loadAdmins();
    this.loadInvitations();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadAdmins(): void {
    this.isLoading = true;
    const params: AdminManagementQueryParams = {
      role: this.selectedRole,
      status: this.selectedStatus,
      search: this.searchTerm.trim() || undefined,
    };

    this.managementService.getAdminAccounts(params).subscribe({
      next: (res) => {
        this.admins = res.items;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Access restricted to Super Administrators.';
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onRoleChange(val: string | number): void {
    this.selectedRole = String(val);
    this.loadAdmins();
  }

  onStatusChange(val: string | number): void {
    this.selectedStatus = String(val);
    this.loadAdmins();
  }

  openInviteModal(): void {
    this.isInviteModalOpen = true;
  }

  closeInviteModal(): void {
    this.isInviteModalOpen = false;
  }

  handleInvite(payload: AdminInvitationRequest): void {
    this.managementService.inviteAdmin(payload).subscribe({
      next: ({ delivery_status }) => {
        this.errorMessage = null;
        this.successMessage = null;
        if (delivery_status === 'sent') {
          this.successMessage = `Invitation sent to ${payload.email}.`;
        } else if (delivery_status === 'preview') {
          this.successMessage = 'Preview invitation created.';
        } else {
          this.errorMessage = 'Invitation saved, but email delivery was unsuccessful.';
        }
        this.closeInviteModal();
        this.loadAdmins();
        this.loadInvitations();
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = null;
          this.cdr.markForCheck();
        }, 3500);
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail || err?.message || 'Failed to dispatch invitation.';
        this.cdr.markForCheck();
      },
    });
  }

  loadInvitations(): void {
    this.invitationsLoading = true;
    this.invitationError = null;
    this.managementService.getInvitations().subscribe({
      next: (items) => {
        this.invitations = items;
        this.invitationsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.invitationsLoading = false;
        this.invitationError = err?.error?.detail || 'Could not load invitations.';
        this.cdr.markForCheck();
      },
    });
  }

  changeInvitation(id: number, action: 'resend' | 'revoke'): void {
    this.updatingInvitation = true;
    this.managementService.updateInvitation(id, action).subscribe({
      next: (response) => {
        this.updatingInvitation = false;
        this.loadInvitations();
        this.loadAdmins();
        if (action === 'resend' && response.delivery_status !== 'sent') {
          this.invitationError = 'Invitation refreshed, but email delivery was unsuccessful.';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.updatingInvitation = false;
        this.invitationError = err?.error?.detail || 'Could not update the invitation.';
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(admin: AdminAccountItem): void {
    const nextState = !admin.is_active;
    this.managementService.toggleAdminStatus(admin.id, nextState).subscribe({
      next: (updated) => {
        this.successMessage = `Administrator #${updated.id} status transitioned to ${updated.status}.`;
        this.loadAdmins();
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = null;
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail || err?.message || 'Failed to modify administrator status.';
        this.cdr.markForCheck();
      },
    });
  }
}
