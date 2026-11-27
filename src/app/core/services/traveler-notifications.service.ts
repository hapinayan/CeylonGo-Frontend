import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type TravelerNotificationCategory = 'booking' | 'payment' | 'community' | 'account';
export type NotificationEntityType = 'booking' | 'community_post' | 'account';

export interface TravelerNotificationItem {
  id: number;
  notification_type: string;
  category: TravelerNotificationCategory;
  title: string;
  message: string;
  related_entity_type: NotificationEntityType;
  related_entity_id: number;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPageResponse {
  unread_count: number;
  items: TravelerNotificationItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

export interface NotificationReadAllResponse {
  unread_count: number;
  updated_count: number;
}

export interface NotificationLoadOptions {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  category?: TravelerNotificationCategory | null;
}

export function resolveNotificationRoute(item: TravelerNotificationItem): string[] | null {
  const id = Number(item.related_entity_id);
  switch (item.related_entity_type) {
    case 'booking':
      return Number.isInteger(id) && id > 0 ? ['/my-bookings', String(id)] : ['/my-bookings'];
    case 'community_post':
      return Number.isInteger(id) && id > 0 ? ['/community/posts', String(id)] : ['/community'];
    case 'account':
      return /password|setting|security|notif/i.test(item.notification_type || '') ? ['/settings'] : ['/profile'];
    default:
      return null;
  }
}

@Injectable({ providedIn: 'root' })
export class TravelerNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  readonly backendFeedSupported = true;
  readonly notifications = signal<TravelerNotificationItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly unreadCount = signal(0);
  readonly isLoading = signal(false);
  readonly isMutating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasMore = computed(() => this.notifications().length < this.total());

  private sessionEpoch = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastLoadOpts: NotificationLoadOptions = { page: 1, pageSize: 20, unreadOnly: false, category: null };

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());

    effect(() => {
      const authed = this.authService.isAuthenticated();
      const user = this.authService.currentUser();
      if (!authed || (user && user.role !== 'traveler')) {
        this.clearOnLogout();
        return;
      }
      if (authed && (!user || user.role === 'traveler')) {
        this.startPolling();
      }
    });
  }

  private isTravelerSessionActive(): boolean {
    if (!this.authService.isAuthenticated()) return false;
    const user = this.authService.currentUser();
    if (user && user.role !== 'traveler') return false;
    return typeof this.authService.getToken === 'function' && !!this.authService.getToken();
  }

  private authHeaders(): { headers: HttpHeaders } {
    if (!this.authService.isAuthenticated()) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    const user = this.authService.currentUser();
    if (user && user.role !== 'traveler') {
      throw new Error('TRAVELER_ROLE_REQUIRED');
    }
    const token = typeof this.authService.getToken === 'function' ? this.authService.getToken() : null;
    if (!token) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    };
  }

  loadNotifications(options: NotificationLoadOptions = {}, append = false): Observable<NotificationPageResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.authHeaders();
    } catch (err) {
      return throwError(() => err);
    }

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const unreadOnly = options.unreadOnly ?? false;
    const category = options.category ?? null;
    this.lastLoadOpts = { page, pageSize, unreadOnly, category };

    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize))
      .set('unread_only', String(unreadOnly));
    if (category) {
      params = params.set('category', category);
    }

    const epoch = this.sessionEpoch;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.get<NotificationPageResponse>(this.baseUrl, { ...opts, params }).pipe(
      tap({
        next: (res) => {
          if (epoch !== this.sessionEpoch || !this.isTravelerSessionActive()) return;
          this.unreadCount.set(res.unread_count ?? 0);
          this.total.set(res.total ?? 0);
          this.page.set(res.page ?? page);
          this.pageSize.set(res.page_size ?? pageSize);
          this.notifications.update((existing) => {
            if (!append) return res.items ?? [];
            const map = new Map<number, TravelerNotificationItem>();
            for (const item of [...existing, ...(res.items ?? [])]) {
              map.set(item.id, item);
            }
            return [...map.values()];
          });
          this.isLoading.set(false);
        },
        error: () => {
          if (epoch === this.sessionEpoch) {
            this.isLoading.set(false);
          }
        },
      }),
    );
  }

  refresh(options?: NotificationLoadOptions): void {
    if (!this.isTravelerSessionActive()) return;
    this.loadNotifications(options ?? this.lastLoadOpts, false).subscribe({
      error: (err) => {
        if (!this.isTravelerSessionActive()) return;
        this.errorMessage.set(
          err?.status === 401
            ? 'Your session has expired. Please sign in again.'
            : 'Unable to load notifications right now.',
        );
      },
    });
  }

  refreshUnreadCount(): Observable<NotificationUnreadCountResponse | null> {
    if (!this.isTravelerSessionActive()) return of(null);
    let opts: { headers: HttpHeaders };
    try {
      opts = this.authHeaders();
    } catch {
      return of(null);
    }
    const epoch = this.sessionEpoch;
    return this.http.get<NotificationUnreadCountResponse>(`${this.baseUrl}/unread-count`, opts).pipe(
      tap((res) => {
        if (epoch === this.sessionEpoch && this.isTravelerSessionActive()) {
          this.unreadCount.set(res.unread_count ?? 0);
        }
      }),
      catchError(() => of(null)),
    );
  }

  markAsRead(notificationId: number): Observable<TravelerNotificationItem> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.authHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    const epoch = this.sessionEpoch;
    return this.http.patch<TravelerNotificationItem>(`${this.baseUrl}/${notificationId}/read`, {}, opts).pipe(
      tap((updated) => {
        if (epoch !== this.sessionEpoch || !this.isTravelerSessionActive()) return;
        let decremented = false;
        this.notifications.update((items) =>
          items.map((item) => {
            if (item.id === notificationId) {
              if (!item.is_read) decremented = true;
              return updated;
            }
            return item;
          }),
        );
        if (decremented) {
          this.unreadCount.update((c) => Math.max(0, c - 1));
        }
      }),
    );
  }

  markAllAsRead(): Observable<NotificationReadAllResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.authHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    const epoch = this.sessionEpoch;
    this.isMutating.set(true);
    return this.http.post<NotificationReadAllResponse>(`${this.baseUrl}/read-all`, {}, opts).pipe(
      tap({
        next: (res) => {
          if (epoch !== this.sessionEpoch || !this.isTravelerSessionActive()) {
            this.isMutating.set(false);
            return;
          }
          const nowIso = new Date().toISOString();
          this.notifications.update((items) =>
            items.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? nowIso })),
          );
          this.unreadCount.set(res.unread_count ?? 0);
          this.isMutating.set(false);
        },
        error: () => {
          this.isMutating.set(false);
        },
      }),
    );
  }

  startPolling(intervalMs = 60_000): void {
    if (this.pollTimer || typeof window === 'undefined' || !this.isTravelerSessionActive()) return;
    this.refreshUnreadCount().subscribe();
    this.pollTimer = setInterval(() => {
      if (!this.isTravelerSessionActive()) {
        this.stopPolling();
        return;
      }
      this.refreshUnreadCount().subscribe();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  clearOnLogout(): void {
    this.sessionEpoch++;
    this.stopPolling();
    this.notifications.set([]);
    this.total.set(0);
    this.page.set(1);
    this.unreadCount.set(0);
    this.isLoading.set(false);
    this.isMutating.set(false);
    this.errorMessage.set(null);
  }
}
