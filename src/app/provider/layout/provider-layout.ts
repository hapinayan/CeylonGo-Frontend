import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ProviderAccountService } from '../../core/services/provider-account.service';
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
  readonly account = inject(ProviderAccountService);
  private readonly destroy = inject(DestroyRef);
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
    return this.account.profile()?.business_name || this.user()?.business_name || 'Service provider';
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/provider/dashboard', icon: 'dashboard' },
    { label: 'My Profile', route: '/provider/profile', icon: 'person' },
    { label: 'My Services', route: '/provider/listings', icon: 'inventory_2' },
    { label: 'Add New Service', route: '/provider/services/new', icon: 'add_circle' },
    { label: 'Availability', route: '/provider/availability', icon: 'event_available' },
    { label: 'Bookings', route: '/provider/bookings', icon: 'calendar_month' },
    { label: 'Wallet', route: '/provider/wallet', icon: 'account_balance_wallet' },
    { label: 'Community', route: '/provider/community', icon: 'forum' },
    { label: 'Settings', route: '/provider/settings', icon: 'settings' },
    { label: 'Help & Support', route: '/provider/help', icon: 'help_outline' },
  ];

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('preview');
    this.previewService.syncFromNavigation(this.router.url, param ?? undefined);
    if (!this.isPreview()) this.account.getProfile().pipe(
      takeUntilDestroyed(this.destroy),
    ).subscribe({
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          this.providerAuthService.clearSession();
          void this.router.navigate(['/provider/login']);
        }
      },
    });
  }

  toggleMobileSidebar(): void {
    this.isSidebarOpenMobile.update((open) => !open);
  }

  @HostListener('document:keydown.escape')
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
    this.account.clear();
    this.providerAuthService.logout();
    void this.router.navigate(['/provider/login']);
  }
}
