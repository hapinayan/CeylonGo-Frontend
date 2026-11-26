import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminVerificationsComponent } from './admin-verifications.component';
import { AdminVerificationsService } from '../../core/services/admin-verifications.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ProviderVerificationItem, VerificationQueueResponse } from '../../core/models/admin-verifications.models';

describe('AdminVerificationsComponent', () => {
  let component: AdminVerificationsComponent;
  let fixture: ComponentFixture<AdminVerificationsComponent>;
  let mockVerificationsService: {
    isPreviewMode: ReturnType<typeof vi.fn>;
    canReviewVerifications: ReturnType<typeof vi.fn>;
    getVerificationQueue: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    currentUser: ReturnType<typeof signal>;
  };

  const mockItems: ProviderVerificationItem[] = [
    {
      id: 2,
      user_id: 102,
      full_name: 'Mahesh Gunasekara',
      email: 'mahesh.g@example.com',
      business_name: 'Ella Peaks Tour Guiding',
      provider_type: 'tour_guide',
      district: 'Badulla',
      approval_status: 'pending',
      created_at: '2026-03-24T11:30:00Z',
      documents: [
        { type: 'selfie', title: 'Selfie', isAvailable: true },
        { type: 'nic_front', title: 'NIC Front', isAvailable: true },
        { type: 'nic_back', title: 'NIC Back', isAvailable: true },
      ],
    },
    {
      id: 3,
      user_id: 103,
      full_name: 'Fathima Rameez',
      email: 'fathima.r@example.com',
      business_name: 'Galle Fort Heritage Villa',
      provider_type: 'homestay',
      district: 'Galle',
      approval_status: 'approved',
      created_at: '2026-04-02T16:00:00Z',
      documents: [
        { type: 'selfie', title: 'Selfie', isAvailable: true },
        { type: 'nic_front', title: 'NIC Front', isAvailable: true },
        { type: 'nic_back', title: 'NIC Back', isAvailable: false },
      ],
    },
  ];

  const mockQueueResponse: VerificationQueueResponse = {
    items: mockItems,
    total: 2,
    page: 1,
    limit: 5,
    total_pages: 1,
  };

  beforeEach(async () => {
    mockVerificationsService = {
      isPreviewMode: vi.fn().mockReturnValue(true),
      canReviewVerifications: vi.fn().mockReturnValue(true),
      getVerificationQueue: vi.fn().mockReturnValue(of(mockQueueResponse)),
    };

    mockAuthService = {
      currentUser: signal({
        id: 'admin-1',
        email: 'admin@ceylongo.com',
        name: 'Super Admin',
        role: 'super_admin',
      } as any),
    };

    await TestBed.configureTestingModule({
      imports: [AdminVerificationsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminVerificationsService, useValue: mockVerificationsService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVerificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load queue data and KPIs on ngOnInit', () => {
    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalled();
    expect(component.queueItems().length).toBe(2);
    expect(component.totalItems()).toBe(2);
    expect(component.statusFilter()).toBe('pending');
  });

  it('should filter queue by status when status pill is clicked', () => {
    component.onStatusChange('approved');
    expect(component.statusFilter()).toBe('approved');
    expect(component.currentPage()).toBe(1);
    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', page: 1 })
    );
  });

  it('should filter queue by category', () => {
    component.onCategoryChange('homestay');
    expect(component.categoryFilter()).toBe('homestay');
    expect(component.currentPage()).toBe(1);
    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'homestay', page: 1 })
    );
  });

  it('should debounce search input changes by 300ms', async () => {
    component.onSearchChange('Mahesh');
    expect(component.searchQuery()).toBe('Mahesh');

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Mahesh', page: 1 })
    );
  });

  it('should reset filters to default pending state', () => {
    component.searchQuery.set('test');
    component.categoryFilter.set('homestay');
    component.statusFilter.set('rejected');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.categoryFilter()).toBe('all');
    expect(component.statusFilter()).toBe('pending');
    expect(component.currentPage()).toBe(1);
  });

  it('should handle pagination page navigation', () => {
    mockVerificationsService.getVerificationQueue.mockReturnValue(
      of({ ...mockQueueResponse, page: 2, total_pages: 3 })
    );
    component.totalPages.set(3);
    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('should open and close review modal studio', () => {
    const item = mockItems[0];
    component.openReviewModal(item);
    expect(component.selectedVerification()).toEqual(item);
    expect(component.isReviewModalOpen()).toBe(true);

    component.closeReviewModal();
    expect(component.selectedVerification()).toBeNull();
    expect(component.isReviewModalOpen()).toBe(false);
  });

  it('should refresh queue and KPIs on decisionComplete', () => {
    const initialCalls = mockVerificationsService.getVerificationQueue.mock.calls.length;
    component.onDecisionComplete(mockItems[0]);
    expect(mockVerificationsService.getVerificationQueue.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should display error message when queue loading fails', () => {
    mockVerificationsService.getVerificationQueue.mockReturnValue(
      throwError(() => new Error('Network failure'))
    );
    component.loadQueue();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Network failure');
  });

  it('should handle refreshData, reload queue & KPIs, and update lastRefreshed', () => {
    vi.clearAllMocks();
    mockVerificationsService.getVerificationQueue.mockReturnValue(of(mockQueueResponse));

    component.refreshData();
    fixture.detectChanges();

    expect(mockVerificationsService.getVerificationQueue).toHaveBeenCalled();
    expect(component.lastRefreshed()).not.toBeNull();
    expect(component.successBanner()).toContain('refreshed successfully');
    expect(component.isRefreshing()).toBe(false);
  });

  it('should prevent concurrent refresh calls when isRefreshing is true', () => {
    vi.clearAllMocks();
    component.isRefreshing.set(true);

    component.refreshData();

    expect(mockVerificationsService.getVerificationQueue).not.toHaveBeenCalled();
  });
});
