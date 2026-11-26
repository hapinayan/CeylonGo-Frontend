import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { User } from '../../../core/models/auth.models';
import { ExperienceIcon } from '../../../experiences/components/icon';

@Component({
  selector: 'app-traveler-account-sidebar',
  imports: [RouterLink, ExperienceIcon],
  templateUrl: './traveler-account-sidebar.html',
  styleUrl: './traveler-account-sidebar.scss',
})
export class TravelerAccountSidebar {
  readonly account = input<User | null>(null);
  readonly preview = input(false);
  readonly active = input.required<'bookings' | 'wishlist'>();
  readonly premium = input(true);
  readonly signedOut = output<void>();
  readonly initials = computed(() => this.account()?.full_name?.trim().split(/\s+/).slice(0, 2)
    .map(part => part[0]).join('').toUpperCase() || 'CG');
}
