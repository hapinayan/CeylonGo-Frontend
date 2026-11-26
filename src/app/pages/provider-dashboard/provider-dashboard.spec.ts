import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderDashboard } from './provider-dashboard';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderService } from '../../core/services/provider.service';

describe('ProviderDashboard Component', () => {
  let component: ProviderDashboard;
  let fixture: ComponentFixture<ProviderDashboard>;
  let router: Router;
  let providerAuthServiceMock: {
    currentProviderUser: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getProfile?: ReturnType<typeof vi.fn>;
  };
  let providerServiceMock: {
    getDashboardStats: ReturnType<typeof vi.fn>;
    getMyBookings: ReturnType<typeof vi.fn>;
    getMyListings: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerAuthServiceMock = {
      currentProviderUser: vi.fn().mockReturnValue({
        id: 1,
        email: 'safari@ceylongo.com',
        full_name: 'Safari Guide',
        role: 'provider',
        is_active: true,
        business_name: 'Yala Eco Safari',
        provider_type: 'safari',
        district: 'Hambantota',
        approval_status: 'approved',
      }),
      getToken: vi.fn().mockReturnValue('mock-token'),
      logout: vi.fn(),
      getProfile: vi.fn().mockReturnValue(of({ verification_status: 'approved' })),
    };

    providerServiceMock = {
      getDashboardStats: vi.fn().mockReturnValue(
        of({
          total_listings: 4,
          published_listings: 3,
          pending_approvals: 1,
          total_bookings: 12,
        })
      ),
      getMyBookings: vi.fn().mockReturnValue(of([])),
      getMyListings: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderDashboard],
      providers: [
        provideRouter([]),
        { provide: ProviderAuthService, useValue: providerAuthServiceMock },
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(ProviderDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render provider dashboard with business details', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Provider Dashboard');
    expect(compiled.querySelector('.subtitle')?.textContent).toContain('Yala Eco Safari');
    expect(compiled.textContent).toContain('safari@ceylongo.com');
    expect(compiled.textContent).toContain('Hambantota');
    expect(compiled.textContent).toContain('Total Listings');
    expect(compiled.textContent).toContain('4');
  });

  it('should call logout and navigate to /provider/login when Sign Out is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector('.btn-logout') as HTMLButtonElement;
    logoutBtn.click();

    expect(providerAuthServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/provider/login']);
  });
});
