import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCommunityReportItem } from '../../core/models/admin-community.models';
import { AdminCommunityService } from '../../core/services/admin-community.service';
import { AdminCommunityComponent } from './admin-community.component';

describe('AdminCommunityComponent', () => {
  let component: AdminCommunityComponent;
  let fixture: ComponentFixture<AdminCommunityComponent>;

  const mockReport: AdminCommunityReportItem = {
    id: 1,
    entity_type: 'post',
    entity_id: 1042,
    reporter_id: 501,
    reporter_name: 'Oliver Schmidt',
    reported_user_id: 610,
    reported_user_name: 'TravelVlogger99',
    reason: 'Commercial spam',
    status: 'pending',
    created_at: '2026-03-25T16:00:00Z',
  };

  const mockService = {
    canViewCommunity: () => true,
    canModerateCommunity: () => true,
    getCommunityReports: vi.fn().mockReturnValue(
      of({ items: [mockReport], total: 1, page: 1, page_size: 20, total_pages: 1 })
    ),
    reviewReport: vi.fn().mockReturnValue(of({ success: true, message: 'Actioned' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityComponent],
      providers: [{ provide: AdminCommunityService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCommunityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load reports on init', () => {
    expect(component).toBeTruthy();
    expect(component.reports.length).toBe(1);
  });

  it('should filter by entity type and status', () => {
    component.onEntityTypeChange('post');
    expect(component.selectedEntityType).toBe('post');
    expect(mockService.getCommunityReports).toHaveBeenCalled();

    component.onStatusChange('actioned');
    expect(component.selectedStatus).toBe('actioned');
  });

  it('should execute moderation action on report', () => {
    component.openReview(mockReport);
    expect(component.selectedReport).toBeTruthy();

    component.executeAction({ action: 'hide', reason: 'Spam link' });
    expect(mockService.reviewReport).toHaveBeenCalledWith(1, { action: 'hide', reason: 'Spam link' });
    expect(component.selectedReport).toBeNull();
  });
});
