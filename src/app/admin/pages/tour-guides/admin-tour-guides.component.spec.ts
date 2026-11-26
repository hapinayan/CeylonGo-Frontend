import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminTourGuideDetailResponse,
  AdminTourGuideListResponse,
  TourGuideKPIs,
} from '../../core/models/admin-tour-guides.models';
import { AdminTourGuidesService } from '../../core/services/admin-tour-guides.service';
import { AdminTourGuidesComponent } from './admin-tour-guides.component';

describe('AdminTourGuidesComponent', () => {
  let component: AdminTourGuidesComponent;
  let fixture: ComponentFixture<AdminTourGuidesComponent>;

  const mockGuidesResponse: AdminTourGuideListResponse = {
    items: [
      {
        id: 1,
        provider_profile_id: 101,
        business_name: 'Ceylon Heritage Explorers',
        provider_name: 'Dinesh Wickramasinghe',
        email: 'dinesh.w@ceylonheritage.lk',
        base_city: 'Kandy',
        base_district: 'Kandy',
        province: 'Central',
        daily_rate: 15000,
        currency: 'LKR',
        approval_status: 'approved',
        verification_status: 'verified',
        is_active: true,
        is_available: true,
        years_of_experience: 8,
        rating_average: 4.9,
        review_count: 42,
        pending_credentials_count: 0,
        approved_credentials_count: 2,
        created_at: '2026-01-15T09:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  const mockKPIs: TourGuideKPIs = {
    total_guides: 8,
    active_guides: 5,
    pending_approval: 2,
    verified_guides: 4,
  };

  const mockDetail: AdminTourGuideDetailResponse = {
    guide: {
      id: 1,
      provider_profile_id: 101,
      bio: 'Licensed national guide in Kandy.',
      years_of_experience: 8,
      daily_rate: 15000,
      currency: 'LKR',
      base_city: 'Kandy',
      base_district: 'Kandy',
      province: 'Central',
      is_available: true,
      approval_status: 'approved',
      verification_status: 'verified',
      is_active: true,
      rating_average: 4.9,
      review_count: 42,
      max_group_size: 10,
      created_at: '2026-01-15T09:00:00Z',
    },
    business_name: 'Ceylon Heritage Explorers',
    provider_name: 'Dinesh Wickramasinghe',
    email: 'dinesh.w@ceylonheritage.lk',
    provider_approval_status: 'approved',
    languages: [],
    service_areas: [],
    images: [],
    packages: [],
    credentials: [],
    verification_history: [],
  };

  const mockService = {
    canViewGuides: signal(true),
    canReviewGuides: signal(true),
    canVerifyCredentials: signal(true),
    getTourGuides: vi.fn().mockReturnValue(of(mockGuidesResponse)),
    getTourGuideById: vi.fn().mockReturnValue(of(mockDetail)),
    getTourGuideKPIs: vi.fn().mockReturnValue(of(mockKPIs)),
    approveTourGuide: vi.fn().mockReturnValue(of({ success: true, tour_guide_id: 1, message: 'Approved' })),
    rejectTourGuide: vi.fn().mockReturnValue(of({ success: true, tour_guide_id: 1, message: 'Rejected' })),
    suspendTourGuide: vi.fn().mockReturnValue(of({ success: true, tour_guide_id: 1, message: 'Suspended' })),
    updateTourGuideBadge: vi.fn().mockReturnValue(of({ success: true, tour_guide_id: 1, verification_status: 'verified', message: 'Badge granted' })),
    verifyGuideCredential: vi.fn().mockReturnValue(of({ success: true, credential_id: 101, message: 'Verified' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTourGuidesComponent],
      providers: [
        provideRouter([]),
        { provide: AdminTourGuidesService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTourGuidesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load data on init', () => {
    expect(component).toBeTruthy();
    expect(component.guides.length).toBe(1);
    expect(component.kpis.total_guides).toBe(8);
  });

  it('should update province and cascade district options', () => {
    component.onProvinceChange('Central');
    expect(component.selectedProvince).toBe('Central');
    expect(component.districtOptions.length).toBeGreaterThan(1);
    expect(component.districtOptions.some((d) => d.key === 'Kandy')).toBe(true);
  });

  it('should open and close inspection detail modal', () => {
    component.openDetail(1);
    expect(mockService.getTourGuideById).toHaveBeenCalledWith(1);
    expect(component.selectedGuideDetail).toBeTruthy();

    component.closeDetail();
    expect(component.selectedGuideDetail).toBeNull();
  });

  it('should open and close reject dialog', () => {
    component.openRejectDialog(1, 'reject');
    expect(component.isRejectDialogOpen).toBe(true);
    expect(component.targetGuideId).toBe(1);

    component.closeRejectDialog();
    expect(component.isRejectDialogOpen).toBe(false);
  });

  it('should handle pagination changes', () => {
    component.totalPages = 3;
    component.goToPage(2);
    expect(component.currentPage).toBe(2);
  });
});
