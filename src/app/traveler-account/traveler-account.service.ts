import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { NotificationSettings, TravelerPreferences } from './traveler-account.models';

@Injectable({
  providedIn: 'root',
})
export class TravelerAccountService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly travelerBaseUrl = `${environment.apiBaseUrl}/traveler`;

  private travelerHeaders(): { headers: HttpHeaders } {
    if (!this.authService.isAuthenticated()) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    const user = this.authService.currentUser();
    if (user && (user.role === 'provider' || user.role === 'admin')) {
      throw new Error('TRAVELER_ROLE_REQUIRED');
    }
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  getPreferences(): Observable<TravelerPreferences> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.travelerHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.get<TravelerPreferences>(`${this.travelerBaseUrl}/preferences`, opts);
  }

  savePreferences(payload: TravelerPreferences): Observable<TravelerPreferences> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.travelerHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.put<TravelerPreferences>(`${this.travelerBaseUrl}/preferences`, payload, opts);
  }

  getNotificationSettings(): Observable<NotificationSettings> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.travelerHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.get<NotificationSettings>(`${this.travelerBaseUrl}/settings/notifications`, opts);
  }

  updateNotificationSettings(payload: NotificationSettings): Observable<NotificationSettings> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.travelerHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.patch<NotificationSettings>(`${this.travelerBaseUrl}/settings/notifications`, payload, opts);
  }
}
