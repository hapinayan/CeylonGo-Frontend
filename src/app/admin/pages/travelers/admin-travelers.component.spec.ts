import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TravelerAccount, TravelerDirectory } from '../../core/models/admin-travelers.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminTravelersService } from '../../core/services/admin-travelers.service';
import { AdminTravelersComponent } from './admin-travelers.component';

describe('AdminTravelersComponent', () => {
  let component: AdminTravelersComponent;
  let fixture: ComponentFixture<AdminTravelersComponent>;

  let isSuperAdminSignal = signal<boolean>(true);
  let isDemoSignal = signal<boolean>(true);

  const mockTravelers: TravelerAccount[] = [
    {
      id: 1,
      full_name: 'Kavindu Perera',
      email: 'kavindu@example.com',
      is_active: true,
      created_at: '2026-01-10T08:30:00Z',
    },
    {
      id: 2,
      full_name: 'Elena Rostova',
      email: 'elena@example.com',
      is_active: false,
      created_at: '2026-01-15T10:15:00Z',
    },
  ];

  const mockDirectory: TravelerDirectory = {
    items: mockTravelers,
    total: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  let mockTravelersService: {
    getTravelers: ReturnType<typeof vi.fn>;
    getTravelerById: ReturnType<typeof vi.fn>;
    getTravelerHistory: ReturnType<typeof vi.fn>;
    updateTravelerStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    isSuperAdminSignal = signal<boolean>(true);
    isDemoSignal = signal<boolean>(true);

    mockTravelersService = {
      getTravelers: vi.fn().mockReturnValue(of(mockDirectory)),
      getTravelerById: vi.fn().mockReturnValue(of(mockTravelers[0])),
      getTravelerHistory: vi.fn().mockReturnValue(of([])),
      updateTravelerStatus: vi.fn().mockReturnValue(
        of({ ...mockTravelers[0], is_active: false })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AdminTravelersComponent],
      providers: [
        provideRouter([]),
        { provide: AdminTravelersService, useValue: mockTravelersService },
        {
          provide: AdminAuthService,
          useValue: {
            isSuperAdmin: isSuperAdminSignal,
            isDemoSession: isDemoSignal,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTravelersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load traveler directory on init', () => {
    expect(component).toBeTruthy();
    expect(mockTravelersService.getTravelers).toHaveBeenCalled();
    expect(component.travelers().length).toBe(2);
    expect(component.totalItems()).toBe(2);
  });

  it('should render traveler table rows with correct data and badges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.data-table tbody tr');
    expect(rows.length).toBe(2);

    expect(compiled.textContent).toContain('Kavindu Perera');
    expect(compiled.textContent).toContain('Elena Rostova');

    const activeBadges = compiled.querySelectorAll('.status-badge.active');
    expect(activeBadges.length).toBe(1);

    const suspendedBadges = compiled.querySelectorAll('.status-badge.suspended');
    expect(suspendedBadges.length).toBe(1);
  });

  it('should handle search input with debounce', async () => {
    component.onSearchChange('Elena');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockTravelersService.getTravelers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Elena' })
    );
  });

  it('should filter by active status', () => {
    component.onStatusFilterChange('active');
    expect(mockTravelersService.getTravelers).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true })
    );
  });

  it('should filter by suspended status', () => {
    component.onStatusFilterChange('suspended');
    expect(mockTravelersService.getTravelers).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
  });

  it('should clear all filters and reset search', () => {
    component.searchInput.set('test');
    component.statusFilter.set('suspended');
    component.clearFilters();

    expect(component.searchInput()).toBe('');
    expect(component.statusFilter()).toBe('all');
    expect(mockTravelersService.getTravelers).toHaveBeenCalled();
  });

  it('should open and close traveler detail modal', () => {
    component.openDetail(mockTravelers[0]);
    fixture.detectChanges();

    expect(component.detailModalTraveler()).toEqual(mockTravelers[0]);
    const modal = fixture.nativeElement.querySelector('app-admin-traveler-detail-modal');
    expect(modal).toBeTruthy();

    component.closeDetail();
    fixture.detectChanges();
    expect(component.detailModalTraveler()).toBeNull();
  });

  it('should allow Super Admin to open status change modal and confirm mutation', () => {
    isSuperAdminSignal.set(true);
    fixture.detectChanges();

    // Open suspend modal for active traveler
    component.openStatusModal(mockTravelers[0], false);
    expect(component.statusModalTraveler()).toEqual(mockTravelers[0]);
    expect(component.statusModalTargetActive()).toBe(false);

    // Confirm mutation
    component.confirmStatusChange({
      is_active: false,
      reason_code: 'policy_violation',
      note: 'Account suspended for policy violation.',
    });

    expect(mockTravelersService.updateTravelerStatus).toHaveBeenCalledWith(1, {
      is_active: false,
      reason_code: 'policy_violation',
      note: 'Account suspended for policy violation.',
    });

    expect(component.successBanner()).toContain('successfully suspended');
  });

  it('should close status modal on cancellation without triggering mutation', () => {
    isSuperAdminSignal.set(true);
    fixture.detectChanges();

    component.openStatusModal(mockTravelers[0], false);
    expect(component.statusModalTraveler()).toEqual(mockTravelers[0]);

    // Close without confirming
    component.closeStatusModal();
    expect(component.statusModalTraveler()).toBeNull();
    expect(mockTravelersService.updateTravelerStatus).not.toHaveBeenCalled();
  });

  it('should restrict Operational Admin from status change action', () => {
    isSuperAdminSignal.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Super Admin Only');

    // Method guard prevents opening
    component.openStatusModal(mockTravelers[0], false);
    expect(component.statusModalTraveler()).toBeNull();
  });

  it('should display error message on service failure and allow retry', () => {
    mockTravelersService.getTravelers.mockReturnValueOnce(
      throwError(() => new Error('Network error'))
    );

    component.loadTravelers();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Network error');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notification-banner.error')).toBeTruthy();
  });

  it('should handle refreshData, update lastRefreshed timestamp, and set success feedback', () => {
    vi.clearAllMocks();
    mockTravelersService.getTravelers.mockReturnValue(of(mockDirectory));

    component.refreshData();
    fixture.detectChanges();

    expect(mockTravelersService.getTravelers).toHaveBeenCalled();
    expect(component.lastRefreshed()).not.toBeNull();
    expect(component.successBanner()).toContain('refreshed successfully');
    expect(component.isRefreshing()).toBe(false);
  });

  it('should prevent concurrent refresh calls when isRefreshing is true', () => {
    vi.clearAllMocks();
    component.isRefreshing.set(true);

    component.refreshData();

    expect(mockTravelersService.getTravelers).not.toHaveBeenCalled();
  });
});
