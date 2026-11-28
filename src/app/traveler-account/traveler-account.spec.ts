import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { User } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import {
  TravelerNotificationsService,
  resolveNotificationRoute,
} from '../core/services/traveler-notifications.service';
import { TravelerAccountSidebar } from '../shared/components/traveler-account-sidebar/traveler-account-sidebar';
import { TravelerAccountService } from './traveler-account.service';
import { TravelerNotificationsComponent } from './traveler-notifications.component';
import { TravelerProfileComponent } from './traveler-profile.component';
import { TravelerSettingsComponent } from './traveler-settings.component';

describe('Traveler Account Management — Final API Integrations', () => {
  const api = environment.apiBaseUrl;

  const sampleUser: User = {
    id: 404,
    full_name: 'Hapinayan Perera',
    email: 'hapinayan.very.long.traveler.email@ceylongo.example.com',
    phone: '+94 77 123 4567',
    country: 'Sri Lanka',
    avatar_url: null,
    email_verified: true,
    authentication_method: 'password',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-27T01:00:00Z',
  };

  it('calls PATCH /auth/me, POST/DELETE /auth/me/avatar, and POST /auth/change-password with session invalidation on AuthService', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('ceylongo_access_token', 'jwt-traveler-1');

    // Update Profile
    let updatedUser: User | undefined;
    auth.updateProfile({ full_name: 'Hapinayan Silva', country: 'Canada' }).subscribe((u) => (updatedUser = u));
    const patchReq = http.expectOne({ method: 'PATCH', url: `${api}/auth/me` });
    expect(patchReq.request.body).toEqual({ full_name: 'Hapinayan Silva', country: 'Canada' });
    patchReq.flush({ ...sampleUser, full_name: 'Hapinayan Silva', country: 'Canada' });
    expect(updatedUser?.full_name).toBe('Hapinayan Silva');
    expect(auth.currentUser()?.country).toBe('Canada');

    // Upload Avatar multipart field "file" + fetch GET /users/{id}/avatar
    const mockFile = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
    auth.uploadAvatar(mockFile).subscribe();
    const uploadReq = http.expectOne({ method: 'POST', url: `${api}/auth/me/avatar` });
    expect(uploadReq.request.body instanceof FormData).toBe(true);
    expect((uploadReq.request.body as FormData).has('file')).toBe(true);
    uploadReq.flush({ ...sampleUser, avatar_url: '/api/v1/users/404/avatar' });
    const blobReq = http.expectOne((r) => r.url.startsWith(`${api}/users/404/avatar`));
    blobReq.flush(new Blob(['img'], { type: 'image/png' }));

    // Delete Avatar
    auth.deleteAvatar().subscribe();
    const delReq = http.expectOne({ method: 'DELETE', url: `${api}/auth/me/avatar` });
    delReq.flush({ ...sampleUser, avatar_url: null });
    expect(auth.currentUser()?.avatar_url).toBeNull();
    expect(auth.avatarUrl()).toBeNull();

    // Change Password clears session when login_required = true
    auth.changePassword({
      current_password: 'OldPassword1!',
      new_password: 'NewPassword2!',
      confirm_password: 'NewPassword2!',
    }).subscribe();
    const pwReq = http.expectOne({ method: 'POST', url: `${api}/auth/change-password` });
    pwReq.flush({ message: 'Password changed', login_required: true });
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();

    http.verify();
  });

  it('integrates Profile edit, Avatar validation, and Travel Preferences (GET/PUT) on TravelerProfileComponent', async () => {
    const currentUserSig = signal<User | null>(sampleUser);
    const avatarUrlSig = signal<string | null>(null);
    const authMock = {
      currentUser: currentUserSig.asReadonly(),
      avatarUrl: avatarUrlSig.asReadonly(),
      isAuthenticated: vi.fn(() => true),
      getToken: vi.fn(() => 'jwt-1'),
      getCurrentUser: vi.fn(() => of(sampleUser)),
      updateProfile: vi.fn((patch: any) => {
        const next = { ...sampleUser, ...patch };
        currentUserSig.set(next);
        return of(next);
      }),
      uploadAvatar: vi.fn(() => throwError(() => ({ status: 500, error: { detail: 'Upload failed' } }))),
      deleteAvatar: vi.fn(() => of({ ...sampleUser, avatar_url: null })),
      logout: vi.fn(),
    };

    const acctMock = {
      getPreferences: vi.fn(() =>
        of({
          preferred_destinations: ['Kandy'],
          interests: ['culture'],
          accommodation_preferences: ['homestay'],
          transport_preferences: ['bicycle'],
          budget_min: 10000,
          budget_max: 50000,
          travel_style: 'cultural' as const,
        }),
      ),
      savePreferences: vi.fn((p: any) => of(p)),
    };

    await TestBed.configureTestingModule({
      imports: [TravelerProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: TravelerAccountService, useValue: acctMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravelerProfileComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(authMock.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(acctMock.getPreferences).toHaveBeenCalledTimes(1);

    // Partial Profile Update
    comp.toggleEdit();
    comp.fullNameDraft.set('Hapinayan Silva');
    comp.saveProfile();
    expect(authMock.updateProfile).toHaveBeenCalledWith({ full_name: 'Hapinayan Silva' });
    expect(comp.saveFeedback()?.message).toBe('Profile updated successfully.');

    // Invalid Avatar Type & Size rejected prior to HTTP call
    const badFile = new File(['bad'], 'anim.gif', { type: 'image/gif' });
    comp.onAvatarFileSelected({ target: { files: [badFile], value: '' } } as unknown as Event);
    expect(comp.avatarFeedback()?.kind).toBe('error');
    expect(comp.avatarFeedback()?.message).toContain('Unsupported image format');

    const hugeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    comp.onAvatarFileSelected({ target: { files: [hugeFile], value: '' } } as unknown as Event);
    expect(comp.avatarFeedback()?.message).toContain('5 MB');

    // Valid upload failure preserves existing state and shows error
    avatarUrlSig.set('blob:existing');
    const validPng = new File([new Uint8Array([1, 2])], 'ok.png', { type: 'image/png' });
    comp.onAvatarFileSelected({ target: { files: [validPng], value: '' } } as unknown as Event);
    comp.uploadPendingAvatar();
    expect(comp.avatarFeedback()?.kind).toBe('error');
    expect(comp.avatarFeedback()?.message).toContain('Upload failed');

    // Travel Preferences budget validation & save
    comp.budgetMin.set(90000);
    comp.budgetMax.set(40000);
    expect(comp.budgetError()).toContain('Maximum budget');
    comp.budgetMax.set(120000);
    comp.toggleInterest('heritage');
    comp.savePreferences();
    expect(acctMock.savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        interests: ['culture', 'heritage'],
        budget_min: 90000,
        budget_max: 120000,
      }),
    );
  });

  it('enforces Traveler isolation, pagination, read/read-all, and safe route resolution in TravelerNotificationsService & Page', async () => {
    const currentUserSig = signal<User | null>(sampleUser);
    const isAuthedSig = signal(true);

    TestBed.configureTestingModule({
      imports: [TravelerNotificationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUserSig.asReadonly(),
            isAuthenticated: () => isAuthedSig(),
            getToken: () => (isAuthedSig() ? 'jwt-traveler' : null),
            logout: vi.fn(),
          },
        },
      ],
    });

    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(TravelerNotificationsService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(TravelerNotificationsComponent);
    fixture.detectChanges();

    // Flush polling unread-count + component initial load
    http.match((r) => r.url === `${api}/notifications/unread-count`).forEach((r) => r.flush({ unread_count: 1 }));
    const initialReq = http.expectOne((r) => r.url === `${api}/notifications`);
    expect(initialReq.request.params.get('page')).toBe('1');

    const bookingNotif = {
      id: 11,
      notification_type: 'booking_confirmed',
      category: 'booking' as const,
      title: 'Booking Approved',
      message: 'See booking details.',
      related_entity_type: 'booking' as const,
      related_entity_id: 25,
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    const postNotif = {
      id: 12,
      notification_type: 'community_like',
      category: 'community' as const,
      title: 'New Like',
      message: 'Someone liked your post.',
      related_entity_type: 'community_post' as const,
      related_entity_id: 9,
      is_read: false,
      created_at: '2026-10-01T10:00:00Z',
      read_at: null,
    };
    initialReq.flush({ unread_count: 2, total: 3, page: 1, page_size: 20, items: [bookingNotif, postNotif] });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Booking Approved');
    expect(service.hasMore()).toBe(true);

    // Safe navigation mapping
    expect(resolveNotificationRoute(bookingNotif)).toEqual(['/my-bookings', '25']);
    expect(resolveNotificationRoute(postNotif)).toEqual(['/community/posts', '9']);
    expect(
      resolveNotificationRoute({
        ...bookingNotif,
        related_entity_type: 'account',
        notification_type: 'password_changed',
        related_entity_id: 0,
      }),
    ).toEqual(['/settings']);

    // Mark all read
    fixture.componentInstance.markAllAsRead();
    const readAllReq = http.expectOne({ method: 'POST', url: `${api}/notifications/read-all` });
    readAllReq.flush({ unread_count: 0, updated_count: 2 });
    expect(service.unreadCount()).toBe(0);

    // Logout clears state immediately and blocks provider tokens
    isAuthedSig.set(false);
    currentUserSig.set(null);
    fixture.detectChanges();
    expect(service.notifications()).toEqual([]);

    currentUserSig.set({ ...sampleUser, role: 'provider' });
    isAuthedSig.set(true);
    let roleErr: unknown;
    service.loadNotifications().subscribe({ error: (e) => (roleErr = e) });
    expect((roleErr as Error).message).toBe('TRAVELER_ROLE_REQUIRED');

    service.stopPolling();
    http.verify();
  });

  it('integrates Account Settings Change Password (POST /auth/change-password) and Notification Preferences rollback on failure', async () => {
    const currentUserSig = signal<User | null>(sampleUser);
    const authMock = {
      currentUser: currentUserSig.asReadonly(),
      isAuthenticated: vi.fn(() => !!currentUserSig()),
      getToken: vi.fn(() => (currentUserSig() ? 'jwt-1' : null)),
      getCurrentUser: vi.fn(() => of(sampleUser)),
      forgotPassword: vi.fn(() => of({ message: 'Reset sent' })),
      changePassword: vi.fn(() => {
        currentUserSig.set(null);
        return of({ message: 'Password updated. Please log in again.', login_required: true });
      }),
      logout: vi.fn(() => currentUserSig.set(null)),
    };

    const initialSettings = {
      booking_updates: true,
      payment_updates: true,
      community_activity: true,
      promotional_updates: false,
    };

    const acctMock = {
      getNotificationSettings: vi.fn(() => of(initialSettings)),
      updateNotificationSettings: vi
        .fn()
        .mockReturnValueOnce(throwError(() => ({ status: 500, error: { detail: 'DB write failed' } })))
        .mockReturnValueOnce(of({ ...initialSettings, promotional_updates: true })),
    };

    await TestBed.configureTestingModule({
      imports: [TravelerSettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: TravelerAccountService, useValue: acctMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TravelerSettingsComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // Toggle promotional_updates -> API failure triggers immediate rollback to false
    comp.toggleNotifSetting('promotional_updates', true);
    expect(comp.notifSettings().promotional_updates).toBe(false);
    expect(comp.notifSaveFeedback()?.kind).toBe('error');

    // Toggle again -> API succeeds and persists true
    comp.toggleNotifSetting('promotional_updates', true);
    expect(comp.notifSettings().promotional_updates).toBe(true);
    expect(comp.notifSaveFeedback()?.kind).toBe('success');

    // Change Password validation & submission
    comp.currentPassword = 'OldPassword1!';
    comp.newPassword = 'NewPassword2!';
    comp.confirmPassword = 'NewPassword2!';
    comp.submitPasswordChange();
    expect(authMock.changePassword).toHaveBeenCalledWith({
      current_password: 'OldPassword1!',
      new_password: 'NewPassword2!',
      confirm_password: 'NewPassword2!',
    });
    expect(comp.passwordChangeSuccess()).toContain('Password updated');
    expect(comp.user()).toBeNull();
  });

  it('renders synced photo and active highlighting on TravelerAccountSidebar', async () => {
    await TestBed.configureTestingModule({
      imports: [TravelerAccountSidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    const fix = TestBed.createComponent(TravelerAccountSidebar);
    fix.componentRef.setInput('account', sampleUser);
    fix.componentRef.setInput('photoUrl', 'blob:traveler-avatar');
    fix.componentRef.setInput('active', 'notifications');
    fix.componentRef.setInput('unreadNotifications', 4);
    fix.detectChanges();

    const img = fix.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img?.getAttribute('src')).toBe('blob:traveler-avatar');
    expect(fix.nativeElement.querySelector('.nav-count-pill')?.textContent?.trim()).toBe('4');
  });
});
