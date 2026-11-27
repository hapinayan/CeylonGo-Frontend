import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { ProviderAccountService, ProviderProfile } from '../../core/services/provider-account.service';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderLayout } from '../layout/provider-layout';
import { ProviderSettingsPage } from './provider-settings';
import { ProviderProfilePage } from './provider-profile';

const base = environment.apiBaseUrl;
const profile: ProviderProfile = {
  id: 5, user_id: 1, business_name: 'Ella Trails', full_name: 'Guide Example',
  email: 'provider@example.test', is_active: true, phone: '0771234567',
  district: 'Badulla', approval_status: 'approved', verification_status: 'approved',
  created_at: '2026-11-01', avatar_url: null, personal_phone: null, personal_address: null,
  personal_district: null, business_category: 'tour_guide', business_description: null,
  business_phone: '0771234567', business_address: null, business_district: 'Badulla',
  website_url: null, social_links: [],
};

describe('Provider account workspace', () => {
  let http: HttpTestingController;
  let auth: ProviderAuthService;
  let account: ProviderAccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(ProviderAuthService);
    auth.setSession('test-provider', {
      id: 1, email: profile.email, full_name: profile.full_name, role: 'provider',
      is_active: true, business_name: profile.business_name, provider_type: 'tour_guide',
      district: profile.district, approval_status: 'approved',
    });
    account = TestBed.inject(ProviderAccountService);
  });

  afterEach(() => {
    http.verify();
    auth.clearSession();
    vi.unstubAllGlobals();
  });

  it('patches only editable fields and displays verified values separately from pending changes', () => {
    const fixture = TestBed.createComponent(ProviderProfilePage);
    http.expectOne(base + '/providers/me').flush(profile);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.startEdit(profile);
    page.form.controls['business_name'].setValue('Proposed name');
    page.form.controls['personal_phone'].setValue('0779876543');
    page.save(profile);
    const patch = http.expectOne(base + '/providers/me');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ business_name: 'Proposed name', personal_phone: '0779876543' });
    const review = { ...profile, personal_phone: '0779876543', profile_change: {
      request_id: 'request-id', status: 'pending' as const, changes: { business_name: 'Proposed name' },
      requested_at: '2026-11-27', decided_at: null, decision_reason: null,
    } };
    patch.flush(review);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Current: Ella Trails');
    expect(fixture.nativeElement.textContent).toContain('Requested: Proposed name');
    page.startEdit(review);
    expect(page.form.controls['business_name'].disabled).toBe(true);
    expect(page.form.controls['personal_phone'].disabled).toBe(false);
  });

  it('fetches the avatar as a private Blob, uses the multipart file field and revokes the URL on removal', () => {
    const createObjectURL = vi.fn(() => 'blob:provider-avatar');
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal('URL', class extends NativeURL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    account.getProfile().subscribe();
    http.expectOne(base + '/providers/me').flush(profile);
    expect(account.avatar()).toBeNull();
    const file = new File(['avatar'], 'photo.png', { type: 'image/png' });
    account.uploadAvatar(file).subscribe();
    const upload = http.expectOne(base + '/providers/me/avatar');
    expect(upload.request.body.get('file')).toEqual(file);
    upload.flush({ ...profile, avatar_url: '/api/v1/providers/me/avatar?v=sample' });
    const get = http.expectOne(base + '/providers/me/avatar');
    expect(get.request.headers.get('Authorization')).toBe('Bearer test-provider');
    expect(get.request.responseType).toBe('blob');
    get.flush(new Blob(['photo'], { type: 'image/jpeg' }));
    expect(account.avatar()).toBe('blob:provider-avatar');
    account.removeAvatar().subscribe();
    const remove = http.expectOne(base + '/providers/me/avatar');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(profile);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:provider-avatar');
    expect(account.avatar()).toBeNull();
  });

  it('persists only the supported preference and clears the local account after password change', () => {
    const fixture = TestBed.createComponent(ProviderSettingsPage);
    const settings = fixture.componentInstance;
    http.expectOne(base + '/provider/settings').flush({ dashboard_booking_limit: 5 });
    settings.limit.setValue(21);
    settings.limit.markAsDirty();
    settings.save();
    http.expectNone(base + '/provider/settings');
    settings.limit.setValue(10);
    settings.save();
    const patch = http.expectOne(base + '/provider/settings');
    expect(patch.request.body).toEqual({ dashboard_booking_limit: 10 });
    patch.flush({ dashboard_booking_limit: 10 });
    settings.password.setValue({
      current_password: 'previous-password', new_password: 'next-password-123',
      confirm_password: 'different-password',
    });
    settings.change();
    expect(settings.passwordError()).toContain('do not match');
    http.expectNone(base + '/providers/change-password');
    account.changePassword({
      current_password: 'previous-password', new_password: 'next-password-123',
      confirm_password: 'next-password-123',
    }).subscribe();
    http.expectOne(base + '/providers/change-password').flush({ login_required: true });
    expect(auth.getToken()).toBeNull();
    expect(account.profile()).toBeNull();
  });

  it('offers only supported sidebar destinations', () => {
    const layout = TestBed.createComponent(ProviderLayout).componentInstance;
    expect(layout.navItems.map((item) => item.route)).toEqual([
      '/provider/dashboard', '/provider/profile', '/provider/listings', '/provider/services/new',
      '/provider/availability', '/provider/bookings', '/provider/wallet', '/provider/community',
      '/provider/settings', '/provider/help',
    ]);
  });

  it('displays disabled notification preferences without fake saves and renders Availability & Help pages', async () => {
    const settingsFix = TestBed.createComponent(ProviderSettingsPage);
    http.expectOne(base + '/provider/settings').flush({
      dashboard_booking_limit: 5,
      provider_notifications_available: false,
    });
    settingsFix.detectChanges();
    const settingsText = settingsFix.nativeElement.textContent as string;
    expect(settingsText).toContain('Notifications');
    expect(settingsText).toContain('Booking updates');
    expect(settingsText).toContain('Wallet updates');
    expect(settingsText).toContain('Service verification updates');
    expect(settingsText).toContain('Community activity');
    expect(settingsText).toContain('Backend Unavailable');

    const { ProviderAvailabilityPage, ProviderHelpPage } = await import('./provider-guidance');
    const availFix = TestBed.createComponent(ProviderAvailabilityPage);
    availFix.detectChanges();
    expect(availFix.nativeElement.textContent).toContain('Homestay rooms');
    expect(availFix.nativeElement.textContent).toContain('Artisan showcase products');

    const helpFix = TestBed.createComponent(ProviderHelpPage);
    helpFix.detectChanges();
    const helpText = helpFix.nativeElement.textContent as string;
    expect(helpText).toContain('first three free bookings');
    expect(helpText).toContain('10% commission');
    expect(helpText).toContain('support@ceylongo.com');
  });
});
