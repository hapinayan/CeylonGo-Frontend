import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-traveler-header',
  imports: [RouterLink, RouterLinkActive, ExperienceIcon],
  template: `
    <header class="traveler-header">
      <span class="traveler-brand"><img src="images/ceylongo-logo.png" alt="">CeylonGo</span>
      <nav aria-label="Traveler navigation">
        <button type="button" disabled>Stays</button>
        <a routerLink="/experiences" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" ariaCurrentWhenActive="page">Experiences</a>
        <button type="button" disabled>Tour Guides</button>
        <button type="button" disabled>Bike Rentals</button>
        <button type="button" disabled>Community</button>
        <button type="button" disabled>AI Trip Planner</button>
      </nav>
      <div class="traveler-actions">
        <a routerLink="/experiences/wishlist" routerLinkActive="active" ariaCurrentWhenActive="page" aria-label="Saved Experiences"><app-experience-icon name="heart" /></a>
        <a routerLink="/experiences/bookings" routerLinkActive="active" ariaCurrentWhenActive="page" aria-label="My Experience Bookings"><app-experience-icon name="calendar" /></a>
        <button type="button" aria-label="Notifications unavailable" disabled><app-experience-icon name="bell" /></button>
        @if (user(); as traveler) {
          <button type="button" disabled [attr.aria-label]="traveler.full_name + ', profile unavailable'">
            <app-experience-icon name="user" /><span>{{ traveler.full_name }}</span>
          </button>
        } @else {
          <a routerLink="/auth" aria-label="Traveler sign-in"><app-experience-icon name="user" /><span>Traveler</span></a>
        }
      </div>
    </header>
  `,
})
export class TravelerHeader {
  readonly user = inject(AuthService).currentUser;
}
