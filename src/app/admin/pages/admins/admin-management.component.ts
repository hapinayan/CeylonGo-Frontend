import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminAccountItem,
  AdminInvitationRequest,
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

  readonly canManage = this.managementService.canManageAdmins;

  admins: AdminAccountItem[] = [];
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
    { key: 'super_admin', label: 'Super Administrator' },
    { key: 'operations_admin', label: 'Operations Admin' },
    { key: 'finance_admin', label: 'Finance Admin' },
    { key: 'content_moderator', label: 'Content Moderator' },
    { key: 'support_admin', label: 'Support Admin' },
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
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Access restricted to Super Administrators.';
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
      next: () => {
        this.successMessage = `Invitation successfully dispatched to ${payload.email}.`;
        this.closeInviteModal();
        this.loadAdmins();
        setTimeout(() => (this.successMessage = null), 3500);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to dispatch invitation.';
      },
    });
  }

  toggleActive(admin: AdminAccountItem): void {
    const nextState = !admin.is_active;
    this.managementService.toggleAdminStatus(admin.id, nextState).subscribe({
      next: (updated) => {
        this.successMessage = `Administrator #${updated.id} status transitioned to ${updated.status}.`;
        this.loadAdmins();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to modify administrator status.';
      },
    });
  }
}
