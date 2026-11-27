import { HttpClient, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProviderResponse } from '../models/provider-auth.models';
import { HomestayBookingDetails } from '../models/provider.models';
import { ProviderAuthService } from './provider-auth.service';

export interface ProviderProfileFields {
  full_name: string;
  personal_phone: string | null;
  personal_address: string | null;
  personal_district: string | null;
  business_name: string;
  business_category: string | null;
  business_description: string | null;
  business_phone: string;
  business_address: string | null;
  business_district: string;
  website_url: string | null;
  social_links: string[];
}
export interface ProviderProfile extends ProviderResponse, ProviderProfileFields {
  email: string;
  is_active: boolean;
  avatar_url: string | null;
  approval_status: string;
  profile_change?: {
    request_id: string;
    status: 'pending' | 'approved' | 'rejected';
    changes: Partial<Record<keyof ProviderProfileFields, string | null>>;
    requested_at: string;
    decided_at: string | null;
    decision_reason: string | null;
  } | null;
}
export interface ProviderSettings {
  dashboard_booking_limit: number;
  provider_notifications_available: false;
}
export interface ProviderDashboardData {
  total_services: number;
  published_services: number;
  pending_verification_services: number;
  rejected_services: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  recent_bookings: HomestayBookingDetails[];
  upcoming_bookings: HomestayBookingDetails[];
  wallet_balance: string;
  currency: 'LKR';
  free_bookings_remaining: number;
  net_commission_paid: string;
}
export interface ProviderPasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function providerError(error: HttpErrorResponse, fallback: string): string {
  const detail = error.error?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((entry) => [entry.loc?.at(-1)?.replaceAll('_', ' '), entry.msg]
      .filter(Boolean).join(' — ')).join('. ') || fallback;
  }
  return ({
    0: 'The server is unreachable. Check your connection and try again.',
    401: 'Your session expired. Please sign in again.',
    403: 'This operation requires an active, approved provider account.',
    404: 'This information is no longer available.',
    409: 'The information changed. Refresh and try again.',
  } as Record<number, string>)[error.status] ?? fallback;
}

@Injectable({ providedIn: 'root' })
export class ProviderAccountService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ProviderAuthService);
  private readonly base = environment.apiBaseUrl;
  private readonly me = this.base + '/providers/me';
  private readonly profileState = signal<ProviderProfile | null>(null);
  private readonly avatarState = signal<string | null>(null);
  private avatarGeneration = 0;
  private avatarVersion: string | null = null;
  private profileOwnerToken: string | null = null;
  readonly profile = this.profileState.asReadonly();
  readonly avatar = this.avatarState.asReadonly();

  constructor() {
    effect(() => {
      const token = this.auth.providerToken();
      if (token !== this.profileOwnerToken) this.clear();
    });
  }
  getProfile() { return this.track(this.http.get<ProviderProfile>(this.me)); }
  updateProfile(payload: Partial<ProviderProfileFields>) {
    return this.track(this.http.patch<ProviderProfile>(this.me, payload));
  }
  uploadAvatar(file: File): Observable<HttpEvent<ProviderProfile>> {
    const body = new FormData();
    body.append('file', file);
    const token = this.auth.getToken();
    return this.http.post<ProviderProfile>(this.me + '/avatar', body, {
      observe: 'events', reportProgress: true,
    }).pipe(tap((event) => {
      if (event.type === 4 && event.body) this.accept(event.body, token);
    }));
  }
  removeAvatar() {
    return this.track(this.http.delete<ProviderProfile>(this.me + '/avatar'));
  }
  getSettings() { return this.http.get<ProviderSettings>(this.base + '/provider/settings'); }
  updateSettings(limit: number) {
    return this.http.patch<ProviderSettings>(this.base + '/provider/settings', {
      dashboard_booking_limit: limit,
    });
  }
  dashboard() {
    return this.http.get<ProviderDashboardData>(this.base + '/provider/dashboard');
  }
  changePassword(payload: ProviderPasswordChange) {
    return this.http.post<{ message: string; login_required: boolean }>(
      this.base + '/providers/change-password', payload,
    ).pipe(tap(() => {
      this.clear();
      this.auth.clearSession();
    }));
  }
  clear(): void {
    this.profileOwnerToken = null;
    this.profileState.set(null);
    this.avatarVersion = null;
    this.avatarGeneration++;
    this.replaceAvatar(null);
  }
  private track(request: Observable<ProviderProfile>) {
    const token = this.auth.getToken();
    return request.pipe(tap((profile) => this.accept(profile, token)));
  }
  private accept(profile: ProviderProfile, token: string | null): void {
    if (!token || token !== this.auth.getToken()) return;
    this.profileOwnerToken = token;
    this.profileState.set(profile);
    if (profile.avatar_url === this.avatarVersion) return;
    this.avatarVersion = profile.avatar_url;
    const generation = ++this.avatarGeneration;
    this.replaceAvatar(null);
    if (!profile.avatar_url) return;
    // Use the canonical private endpoint. Never send the provider token to a URL supplied as data.
    this.http.get(this.me + '/avatar', { responseType: 'blob' }).pipe(
      catchError(() => of(null)),
    ).subscribe((blob) => {
      if (generation !== this.avatarGeneration || token !== this.auth.getToken()) return;
      if (blob) this.replaceAvatar(URL.createObjectURL(blob));
      else this.avatarVersion = null;
    });
  }
  private replaceAvatar(url: string | null): void {
    const previous = this.avatarState();
    if (previous) URL.revokeObjectURL(previous);
    this.avatarState.set(url);
  }
}
