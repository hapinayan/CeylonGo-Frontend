import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditLogItem } from '../../core/models/admin-audit-logs.models';
import { AdminAuditLogsService } from '../../core/services/admin-audit-logs.service';
import { AdminAuditLogsComponent } from './admin-audit-logs.component';

describe('AdminAuditLogsComponent', () => {
  let component: AdminAuditLogsComponent;
  let fixture: ComponentFixture<AdminAuditLogsComponent>;

  const mockLog: AdminAuditLogItem = {
    id: 101,
    admin_user_id: 1,
    action_type: 'homestay.approve',
    entity_type: 'homestay_listing',
    entity_id: 1,
    details: { title: 'Misty Mountain' },
    created_at: '2026-03-26T08:15:00Z',
    actor: {
      id: 1,
      full_name: 'Platform Super Administrator',
      email: 'admin@ceylongo.lk',
      role: 'super_admin',
      admin_role: 'super_admin',
    },
  };

  const mockService = {
    canViewAuditLogs: () => true,
    getAuditLogs: vi.fn().mockReturnValue(
      of({ items: [mockLog], total: 1, page: 1, page_size: 20, total_pages: 1 })
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAuditLogsComponent],
      providers: [{ provide: AdminAuditLogsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load audit logs on init', () => {
    expect(component).toBeTruthy();
    expect(component.logs.length).toBe(1);
    expect(component.logs[0].action_type).toBe('homestay.approve');
  });

  it('should filter by action type and entity type', () => {
    component.onActionChange('homestay');
    expect(component.selectedActionType).toBe('homestay');
    expect(mockService.getAuditLogs).toHaveBeenCalled();

    component.onEntityChange('homestay_listing');
    expect(component.selectedEntityType).toBe('homestay_listing');
  });

  it('should open and close payload modal', () => {
    component.openDetail(mockLog);
    expect(component.selectedLog).toBeTruthy();

    component.closeDetail();
    expect(component.selectedLog).toBeNull();
  });
});
