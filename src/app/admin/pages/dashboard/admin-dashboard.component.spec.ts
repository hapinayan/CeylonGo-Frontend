import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { AdminDashboardResponse } from '../../core/models/admin-dashboard.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminDashboardService } from '../../core/services/admin-dashboard.service';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let dashboardServiceMock: {
    getDashboard: ReturnType<typeof vi.fn>;
  };

  const mockDashboardData: AdminDashboardResponse = {
    providers: {
      total_profiles: 42,
      pending_applications: 5,
    },
    bookings: {
      homestay: 128,
      rental_vehicle: 94,
      tour_guide: 31,
    },
    pending_approvals: {
      homestay_listings: 3,
      activity_listings: 2,
      eco_experience_listings: 1,
      artisan_listings: 4,
      rental_vehicles: 6,
      tour_guide_profiles: 2,
    },
    traveler_eligibility: {
      pending_rental_checks: 7,
    },
  };

  beforeEach(async () => {
    dashboardServiceMock = {
      getDashboard: vi.fn().mockReturnValue(of(mockDashboardData)),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        { provide: AdminDashboardService, useValue: dashboardServiceMock },
        {
          provide: AdminAuthService,
          useValue: {
            currentUser: signal({ full_name: 'Super Admin User' }),
            isSuperAdmin: signal(true),
            roleDisplayName: signal('Super Admin'),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create dashboard component and load data on init', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(dashboardServiceMock.getDashboard).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.dashboardData()).toEqual(mockDashboardData);
  });

  it('should render core metrics with live data', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('42'); // Total providers
    expect(compiled.textContent).toContain('128'); // Homestay bookings
    expect(compiled.textContent).toContain('94'); // Rental bookings
    expect(compiled.textContent).toContain('31'); // Tour guide bookings
  });

  it('should calculate total pending review queue items accurately', () => {
    fixture.detectChanges();

    // 3 + 2 + 1 + 4 + 6 + 2 = 18 pending approvals
    expect(component.totalPendingApprovals).toBe(18);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('18 Pending Items');
  });

  it('should render traveler eligibility checks accurately', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('7');
    expect(compiled.textContent).toContain('Pending Rental Driving License Checks');
  });

  it('should display error banner and retry button on HTTP failure', () => {
    dashboardServiceMock.getDashboard.mockReturnValue(
      throwError(() => ({ status: 500, error: { detail: 'Internal Server Error' } }))
    );

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Internal Server Error');

    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('.btn-retry') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();

    // Retry recovery
    dashboardServiceMock.getDashboard.mockReturnValue(of(mockDashboardData));
    retryBtn.click();

    expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(2);
    expect(component.dashboardData()).toEqual(mockDashboardData);
    expect(component.errorMessage()).toBeNull();
  });

  it('should display permission notice when navigated with accessDenied query parameter', () => {
    const route = TestBed.inject(ActivatedRoute);
    route.snapshot.queryParams = { accessDenied: 'super-admin-required' };

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.permissionNotice()).toContain('Access Restricted: That module requires Super Admin privileges');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-warning')).toBeTruthy();

    component.dismissNotice();
    expect(component.permissionNotice()).toBeNull();
  });
});
