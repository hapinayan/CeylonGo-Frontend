import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderPreviewService } from '../provider-preview.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-provider-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './provider-layout.html',
  styleUrl: './provider-layout.scss',
})
export class ProviderLayout implements OnInit {
  private readonly providerAuthService = inject(ProviderAuthService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isSidebarOpenMobile = signal<boolean>(false);
  readonly isProfileMenuOpen = signal<boolean>(false);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;
  readonly user = computed(() => {
    if (this.isPreview()) {
      return this.previewService.previewUser;
    }
    return this.providerAuthService.currentProviderUser();
  });

  readonly businessName = computed(() => {
    return this.user()?.business_name || 'Ceylon Horizon Homestay';
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/provider/dashboard', icon: 'dashboard' },
    { label: 'My Profile', route: '/provider/profile', icon: 'person' },
    { label: 'Manage Listings', route: '/provider/listings', icon: 'inventory_2' },
    { label: 'Add New Service', route: '/provider/services/new', icon: 'add_circle' },
    { label: 'Rooms and Availability', route: '/provider/rooms', icon: 'meeting_room' },
    { label: 'Activity Availability', route: '/provider/activities/availability', icon: 'event_available' },
    { label: 'Tour Packages', route: '/provider/guides/packages', icon: 'tour_packages' },
    { label: 'Guide Availability', route: '/provider/guides/availability', icon: 'guide_schedule' },
    { label: 'Fleet & Availability', route: '/provider/rentals/availability', icon: 'rental_fleet' },
    { label: 'Bookings', route: '/provider/bookings', icon: 'calendar_month' },
    { label: 'Promotions', route: '/provider/promotions', icon: 'loyalty' },
    { label: 'Community Feed', route: '/provider/community', icon: 'forum' },
    { label: 'Payouts', route: '/provider/payouts', icon: 'payments' },
    { label: 'Settings', route: '/provider/settings', icon: 'settings' },
    { label: 'Help and Support', route: '/provider/help', icon: 'help_outline' },
  ];

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('preview');
    this.previewService.syncFromNavigation(this.router.url, param ?? undefined);
  }

  toggleMobileSidebar(): void {
    this.isSidebarOpenMobile.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.isSidebarOpenMobile.set(false);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((open) => !open);
  }

  onLogout(): void {
    if (this.isPreview()) {
      this.previewService.disable();
      void this.router.navigate(['/provider/login']);
      return;
    }
    this.providerAuthService.logout();
    void this.router.navigate(['/provider/login']);
  }
}
