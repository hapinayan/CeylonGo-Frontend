import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class TravelSession {
  private readonly auth = inject(AuthService);
  readonly account = computed(() => {
    const user = this.auth.currentUser();
    const token = this.auth.getToken();
    return user?.role === 'traveler' && user.is_active && token ? {id: user.id} : null;
  });
}
