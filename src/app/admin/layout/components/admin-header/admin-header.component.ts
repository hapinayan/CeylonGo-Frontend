import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

const ROUTE_BREADCRUMB_MAP: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/travelers': 'Travelers',
  '/admin/providers': 'Service Providers',
  '/admin/verifications': 'Verifications',
  '/admin/homestays': 'Homestays',
  '/admin/adventures': 'Adventures',
  '/admin/rentals': 'Bike & Bicycles',
  '/admin/guides': 'Tour Guides',
  '/admin/artisans': 'Artisans',
  '/admin/bookings': 'Bookings',
  '/admin/payments': 'Payments & Refunds',
  '/admin/wallets': 'Wallet & Commission',
  '/admin/community': 'Community Moderation',
  '/admin/reports': 'Reports & Analytics',
  '/admin/profile': 'Profile & Preferences',
  '/admin/admins': 'Admin Accounts',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/settings': 'System Settings',
};

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss',
})
export class AdminHeaderComponent implements OnInit {
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly openMobileDrawer = output<void>();

  readonly currentUser = this.adminAuthService.currentUser;
  readonly isSuperAdmin = this.adminAuthService.isSuperAdmin;
  readonly roleDisplayName = this.adminAuthService.roleDisplayName;
  readonly isDemoPreview = signal<boolean>(!environment.production && !!environment.features?.adminPreviewMode);

  readonly isMenuOpen = signal<boolean>(false);
  readonly currentBreadcrumb = signal<string>('Dashboard');

  ngOnInit(): void {
    this.updateBreadcrumbFromUrl(this.router.url);

    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateBreadcrumbFromUrl(event.urlAfterRedirects || event.url);
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private updateBreadcrumbFromUrl(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Direct match against known mapping
    if (ROUTE_BREADCRUMB_MAP[cleanUrl]) {
      this.currentBreadcrumb.set(ROUTE_BREADCRUMB_MAP[cleanUrl]);
      return;
    }

    // Secondary resolution via active route snapshot data
    let route = this.router.routerState.root;
    let breadcrumb = 'Dashboard';
    while (route.firstChild) {
      route = route.firstChild;
      if (route.snapshot.data['breadcrumb']) {
        breadcrumb = route.snapshot.data['breadcrumb'];
      }
    }
    this.currentBreadcrumb.set(breadcrumb);
  }

  toggleProfileMenu(): void {
    this.isMenuOpen.update((val) => !val);
  }

  logout(): void {
    this.isMenuOpen.set(false);
    this.adminAuthService.logout();
  }

  get userInitials(): string {
    const user = this.currentUser();
    if (!user || !user.full_name) return 'A';
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }
}
