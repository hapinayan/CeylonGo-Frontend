import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ProviderDetailResponse,
  ProviderListItem,
  ProviderListResponse,
} from '../../core/models/admin-providers.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminProvidersService } from '../../core/services/admin-providers.service';
import { AdminProvidersComponent } from './admin-providers.component';

describe('AdminProvidersComponent', () => {
  let component: AdminProvidersComponent;
  let fixture: ComponentFixture<AdminProvidersComponent>;
  let mockProvidersService: {
    getProviders: ReturnType<typeof vi.fn>;
    getProviderById: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    currentUser: ReturnType<typeof signal>;
  };

  const mockProviderItems: ProviderListItem[] = [
    {
      id: 1,
      user_id: 101,
      full_name: 'Sunil Shantha',
      email: 'sunil.s@example.com',
      business_name: 'Kandy Serenity Homestay',
      provider_type: 'homestay',
      district: 'Kandy',
      approval_status: 'approved',
      created_at: '2026-01-05T09:00:00Z',
    },
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
    },
  ];

  const mockListResponse: ProviderListResponse = {
    items: mockProviderItems,
    total: 2,
    page: 1,
    limit: 5,
    total_pages: 1,
  };

  const mockDetailResponse: ProviderDetailResponse = {
    id: 1,
    user_id: 101,
    full_name: 'Sunil Shantha',
    email: 'sunil.s@example.com',
    role: 'provider',
    is_active: true,
    phone: '0771234567',
    identity_document_type: 'nic',
    business_name: 'Kandy Serenity Homestay',
    provider_type: 'homestay',
    district: 'Kandy',
    approval_status: 'approved',
    created_at: '2026-01-05T09:00:00Z',
    selfie_uploaded: true,
    nic_front_uploaded: true,
    nic_back_uploaded: true,
  };

  beforeEach(async () => {
    mockProvidersService = {
      getProviders: vi.fn().mockReturnValue(of(mockListResponse)),
      getProviderById: vi.fn().mockReturnValue(of(mockDetailResponse)),
    };

    mockAuthService = {
      currentUser: signal({
        id: '1',
        email: 'superadmin@ceylongo.com',
        role: 'super_admin',
        name: 'Super Administrator',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminProvidersComponent],
      providers: [
        provideRouter([]),
        { provide: AdminProvidersService, useValue: mockProvidersService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProvidersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load providers directory on init', () => {
    expect(component).toBeTruthy();
    expect(mockProvidersService.getProviders).toHaveBeenCalled();
    expect(component.providers().length).toBe(2);
    expect(component.totalItems()).toBe(2);
  });

  it('should render provider table rows with correct business name and badges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.data-table tbody tr');
    expect(rows.length).toBe(2);

    expect(compiled.textContent).toContain('Kandy Serenity Homestay');
    expect(compiled.textContent).toContain('Ella Peaks Tour Guiding');

    const approvedBadges = compiled.querySelectorAll('.status-badge.approved');
    expect(approvedBadges.length).toBe(1);

    const pendingBadges = compiled.querySelectorAll('.status-badge.pending');
    expect(pendingBadges.length).toBe(1);
  });

  it('should handle search input with debounce', async () => {
    component.onSearchChange('Ella');
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(mockProvidersService.getProviders).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Ella' })
    );
  });

  it('should filter by category', () => {
    component.onCategoryFilterChange('homestay');
    expect(mockProvidersService.getProviders).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'homestay' })
    );
  });

  it('should filter by approval status', () => {
    component.onStatusFilterChange('pending');
    expect(mockProvidersService.getProviders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });

  it('should clear all filters and reset pagination', () => {
    component.searchInput.set('test');
    component.categoryFilter.set('tour_guide');
    component.statusFilter.set('pending');
    component.currentPage.set(2);

    component.clearFilters();

    expect(component.searchInput()).toBe('');
    expect(component.categoryFilter()).toBe('all');
    expect(component.statusFilter()).toBe('all');
    expect(component.currentPage()).toBe(1);
    expect(mockProvidersService.getProviders).toHaveBeenCalled();
  });

  it('should navigate to valid page', () => {
    mockProvidersService.getProviders.mockReturnValue(
      of({ ...mockListResponse, page: 2, total_pages: 3 })
    );

    component.totalPages.set(3);
    component.goToPage(2);

    expect(component.currentPage()).toBe(2);
    expect(mockProvidersService.getProviders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('should open and close provider detail modal', () => {
    component.openDetail(mockProviderItems[0]);
    fixture.detectChanges();

    expect(mockProvidersService.getProviderById).toHaveBeenCalledWith(1);
    expect(component.selectedProvider()).toEqual(mockDetailResponse);

    const modal = fixture.nativeElement.querySelector('app-admin-provider-detail-modal');
    expect(modal).toBeTruthy();

    component.closeDetail();
    fixture.detectChanges();
    expect(component.selectedProvider()).toBeNull();
  });

  it('should display error message on service failure', () => {
    mockProvidersService.getProviders.mockReturnValueOnce(
      throwError(() => new Error('Backend service unavailable'))
    );

    component.loadProviders();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Backend service unavailable');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notification-banner.error')).toBeTruthy();
  });

  it('should render role badge accurately for Operational Admin', () => {
    mockAuthService.currentUser.set({
      id: '2',
      email: 'ops@ceylongo.com',
      role: 'operations_admin',
      name: 'Operations Admin',
    });
    fixture.detectChanges();

    expect(component.isSuperAdmin()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Operational View');
  });

  it('should handle refreshData, reload directory & KPIs, and update lastRefreshed', () => {
    vi.clearAllMocks();
    mockProvidersService.getProviders.mockReturnValue(of(mockListResponse));

    component.refreshData();
    fixture.detectChanges();

    expect(mockProvidersService.getProviders).toHaveBeenCalled();
    expect(component.lastRefreshed()).not.toBeNull();
    expect(component.successBanner()).toContain('refreshed successfully');
    expect(component.isRefreshing()).toBe(false);
  });

  it('should prevent concurrent refresh calls when isRefreshing is true', () => {
    vi.clearAllMocks();
    component.isRefreshing.set(true);

    component.refreshData();

    expect(mockProvidersService.getProviders).not.toHaveBeenCalled();
  });
});
