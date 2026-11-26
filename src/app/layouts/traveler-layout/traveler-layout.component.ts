import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '../../shared/components/footer/footer';
import { TravelerAuthModal } from '../../shared/components/traveler-auth-modal/traveler-auth-modal';
import { TravelerBackComponent } from '../../shared/components/traveler-back/traveler-back.component';
import { TravelerNavbar } from '../../shared/components/traveler-navbar/traveler-navbar';

@Component({
  selector: 'app-traveler-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TravelerNavbar,
    TravelerBackComponent,
    Footer,
    TravelerAuthModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="traveler-layout-shell">
      <app-traveler-navbar />
      <app-traveler-back />
      <div class="traveler-layout-outlet">
        <router-outlet />
      </div>
      <app-footer />
      <app-traveler-auth-modal />
    </div>
  `,
  styles: [`
    .traveler-layout-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    .traveler-layout-outlet {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class TravelerLayoutComponent {}
