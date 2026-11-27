import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProviderDashboard } from './provider-dashboard';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderService } from '../../core/services/provider.service';
import {
  ProviderAccountService, ProviderDashboardData,
} from '../../core/services/provider-account.service';

const data: ProviderDashboardData = {
  total_services: 4, published_services: 3, pending_verification_services: 1, rejected_services: 0,
  total_bookings: 12, pending_bookings: 2, confirmed_bookings: 1, completed_bookings: 8,
  cancelled_bookings: 1, recent_bookings: [], upcoming_bookings: [], wallet_balance: '2500.00',
  currency: 'LKR', free_bookings_remaining: 2, net_commission_paid: '125.00',
};

describe('Provider dashboard', () => {
  function setup(dashboard = vi.fn(() => of(data))) {
    TestBed.configureTestingModule({
      imports: [ProviderDashboard],
      providers: [
        provideRouter([]),
        { provide: ProviderAccountService, useValue: { dashboard, avatar: () => null, profile: () => null } },
        { provide: ProviderAuthService, useValue: { currentProviderUser: () => ({ business_name: 'Ella Trails' }) } },
        { provide: ProviderService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(ProviderDashboard);
    fixture.detectChanges();
    return fixture;
  }

  it('uses the backend totals and booking lists', () => {
    const dashboard = vi.fn(() => of(data));
    const fixture = setup(dashboard);
    const result: HTMLElement = fixture.nativeElement;
    expect(dashboard).toHaveBeenCalledOnce();
    expect(result.textContent).toContain('Ella Trails');
    expect(result.textContent).toContain('No upcoming bookings');
    expect(result.textContent).toContain('2,500');
    expect(fixture.componentInstance.data()?.total_bookings).toBe(12);
  });

  it('offers a retry on network failure', () => {
    const dashboard = vi.fn().mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(of(data));
    const fixture = setup(dashboard);
    expect(fixture.nativeElement.textContent).toContain('unreachable');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.data()?.total_services).toBe(4);
  });
});
