import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ActivityResponse } from '../../core/models/admin-activities.models';
import { AdminUser } from '../../core/models/admin-auth.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminAdventuresService } from '../../core/services/admin-adventures.service';
import { AdminAdventuresComponent } from './admin-adventures.component';

describe('AdminAdventuresComponent', () => {
  let component: AdminAdventuresComponent;
  let fixture: ComponentFixture<AdminAdventuresComponent>;

  let currentUser: AdminUser | null = {
    id: 1,
    email: 'admin@ceylongo.com',
    full_name: 'Lead Operations Admin',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  };

  const sampleActivity: ActivityResponse = {
    id: 1,
    provider_id: 4,
    provider_business_name: 'Kitulgala White Water Adventures',
    title: 'Grade III & IV White Water Rafting Kelani River',
    description: 'Thrilling white water rafting expedition.',
    category: 'rafting',
    location: 'Kitulgala',
    city: 'Kitulgala',
    district: 'Kegalle',
    province: 'Sabaragamuwa',
    price_per_person: 6500,
    duration_hours: 3.5,
    difficulty_level: 'moderate',
    max_participants: 8,
    min_participants: 2,
    is_active: true,
    approval_status: 'pending',
  };

  const mockAdventuresService = {
    getActivities: () =>
      of({
        items: [sampleActivity],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
      }),
    getSummary: () =>
      of({
        total: 1,
        pending_approval: 1,
        approved: 0,
        rejected: 0,
      }),
    approveActivity: (id: number) =>
      of({ ...sampleActivity, id, approval_status: 'approved' as const }),
    rejectActivity: (id: number, payload: { reason: string }) =>
      of({ ...sampleActivity, id, approval_status: 'rejected' as const, rejection_reason: payload.reason }),
  };

  const mockAuthService = {
    currentUser: () => currentUser,
    isDemoSession: () => false,
  };

  beforeEach(async () => {
    currentUser = {
      id: 1,
      email: 'admin@ceylongo.com',
      full_name: 'Lead Operations Admin',
      role: 'admin',
      admin_role: 'admin',
      is_active: true,
    };

    await TestBed.configureTestingModule({
      imports: [AdminAdventuresComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAdventuresService, useValue: mockAdventuresService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAdventuresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load activities and KPIs', () => {
    expect(component.activities().length).toBe(1);
    expect(component.activities()[0].title).toBe('Grade III & IV White Water Rafting Kelani River');
    expect(component.kpiTotal()).toBe(1);
    expect(component.kpiPending()).toBe(1);
  });

  it('should have district selector disabled when province is "all"', () => {
    expect(component.provinceFilter()).toBe('all');
    expect(component.isDistrictDisabled()).toBe(true);
  });

  it('should enable district selector and filter when a province is chosen', () => {
    component.onProvinceFilterChange('Northern');
    expect(component.provinceFilter()).toBe('Northern');
    expect(component.districtFilter()).toBe('all');
    expect(component.isDistrictDisabled()).toBe(false);
    expect(component.districtOptions().length).toBe(6); // All Districts + 5 Northern districts
  });

  it('should update category filter and reset pagination to page 1', () => {
    component.goToPage(2);
    component.onCategoryFilterChange('rafting');
    expect(component.categoryFilter()).toBe('rafting');
    expect(component.currentPage()).toBe(1);
  });

  it('should update status filter', () => {
    component.onStatusFilterChange('pending');
    expect(component.statusFilter()).toBe('pending');
  });

  it('should clear all filters', () => {
    component.onProvinceFilterChange('Sabaragamuwa');
    component.onCategoryFilterChange('rafting');
    component.clearFilters();

    expect(component.provinceFilter()).toBe('all');
    expect(component.districtFilter()).toBe('all');
    expect(component.categoryFilter()).toBe('all');
    expect(component.statusFilter()).toBe('all');
    expect(component.searchInput()).toBe('');
  });

  it('should open and close details modal', () => {
    component.openDetail(sampleActivity);
    expect(component.selectedActivity()).toBe(sampleActivity);

    component.closeDetail();
    expect(component.selectedActivity()).toBeNull();
  });

  it('should open and close reject dialog', () => {
    component.openRejectDialog(sampleActivity);
    expect(component.rejectingActivity()).toBe(sampleActivity);

    component.closeRejectDialog();
    expect(component.rejectingActivity()).toBeNull();
  });

  it('should approve an activity', () => {
    component.onApproveActivity(sampleActivity);
    expect(component.successBanner()).toContain('approved successfully');
  });

  it('should confirm rejection with valid reason', () => {
    component.onConfirmReject({ activityId: 1, reason: 'Lacks adequate guide certifications' });
    expect(component.successBanner()).toContain('rejected');
  });

  it('should change page size and reload', () => {
    component.onPageSizeChange(25);
    expect(component.pageSize()).toBe(25);
    expect(component.currentPage()).toBe(1);
  });
});
