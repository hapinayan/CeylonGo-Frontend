import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAnalyticsOverview } from '../../core/models/admin-reports.models';
import { AdminReportsService } from '../../core/services/admin-reports.service';
import { AdminReportsComponent } from './admin-reports.component';

describe('AdminReportsComponent', () => {
  let component: AdminReportsComponent;
  let fixture: ComponentFixture<AdminReportsComponent>;

  const mockAnalytics: PlatformAnalyticsOverview = {
    total_travelers: 1248,
    active_travelers: 890,
    total_providers: 342,
    verified_providers: 285,
    total_revenue_lkr: 1458000,
    commission_revenue_lkr: 145800,
    period: 'Q1 2026',
    category_distribution: [
      { category: 'homestay', label: 'Homestays', count: 48, revenue: 620000, percentage: 42.5 },
    ],
    recent_booking_volume: [],
  };

  const mockService = {
    canViewReports: () => true,
    getAnalyticsOverview: vi.fn().mockReturnValue(of(mockAnalytics)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReportsComponent],
      providers: [{ provide: AdminReportsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load analytics on init', () => {
    expect(component).toBeTruthy();
    expect(component.analytics).toBeTruthy();
    expect(component.analytics?.total_travelers).toBe(1248);
  });
});
