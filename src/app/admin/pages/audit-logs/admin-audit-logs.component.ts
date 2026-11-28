import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import {
  AdminAuditLogItem,
  AuditLogQueryParams,
} from '../../core/models/admin-audit-logs.models';
import { AdminAuditLogsService } from '../../core/services/admin-audit-logs.service';
import { AdminSelectComponent, AdminSelectOption } from '../../shared/components/admin-select/admin-select.component';
import { AdminAuditLogDetailModalComponent } from './components/admin-audit-log-detail-modal/admin-audit-log-detail-modal.component';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSelectComponent,
    AdminAuditLogDetailModalComponent,
  ],
  templateUrl: './admin-audit-logs.component.html',
  styleUrls: ['./admin-audit-logs.component.scss'],
})
export class AdminAuditLogsComponent implements OnInit, OnDestroy {
  private readonly auditService = inject(AdminAuditLogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly canView = this.auditService.canViewAuditLogs;

  logs: AdminAuditLogItem[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedActionType = 'all';
  selectedEntityType = 'all';

  readonly actionTypeOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Action Types' },
    { key: 'homestay', label: 'Homestay Approvals' },
    { key: 'guide', label: 'Tour Guide Actions' },
    { key: 'community', label: 'Community Moderation' },
    { key: 'settlement', label: 'Settlement Actions' },
    { key: 'settings', label: 'Settings Updates' },
  ];

  readonly entityTypeOptions: readonly AdminSelectOption[] = [
    { key: 'all', label: 'All Entity Types' },
    { key: 'homestay_listing', label: 'Homestay Listing' },
    { key: 'tour_guide_credential', label: 'Tour Guide Credential' },
    { key: 'community_post', label: 'Community Post' },
    { key: 'provider_settlement', label: 'Provider Settlement' },
    { key: 'system_settings', label: 'System Settings' },
  ];

  readonly pageSizeOptions: readonly AdminSelectOption[] = [
    { key: 10, label: '10 per page' },
    { key: 20, label: '20 per page' },
    { key: 50, label: '50 per page' },
  ];

  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;

  selectedLog: AdminAuditLogItem | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.loadLogs();
      });

    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadLogs(): void {
    this.isLoading = true;
    const params: AuditLogQueryParams = {
      action_type: this.selectedActionType,
      entity_type: this.selectedEntityType,
      search: this.searchTerm.trim() || undefined,
      page: this.currentPage,
      page_size: this.pageSize,
    };

    this.auditService.getAuditLogs(params).subscribe({
      next: (res) => {
        this.logs = res.items;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.message || 'Failed to query immutable audit logs.';
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onActionChange(val: string | number): void {
    this.selectedActionType = String(val);
    this.currentPage = 1;
    this.loadLogs();
  }

  onEntityChange(val: string | number): void {
    this.selectedEntityType = String(val);
    this.currentPage = 1;
    this.loadLogs();
  }

  onPageSizeChange(val: string | number): void {
    this.pageSize = Number(val);
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.currentPage) {
      this.currentPage = p;
      this.loadLogs();
    }
  }

  openDetail(log: AdminAuditLogItem): void {
    this.selectedLog = log;
  }

  closeDetail(): void {
    this.selectedLog = null;
  }
}
