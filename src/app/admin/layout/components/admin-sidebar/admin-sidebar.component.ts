import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AdminAuthService } from '../../../core/services/admin-auth.service';

interface NavItem {
  id: string;
  label: string;
  route?: string;
  icon: string;
  badge?: string;
  tooltip?: string;
  isSuperAdminOnly?: boolean;
  isImplemented: boolean;
}

interface NavGroup {
  name: string;
  isSuperAdminOnly?: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  private readonly adminAuthService = inject(AdminAuthService);

  readonly collapsed = input<boolean>(false);
  readonly toggleCollapse = output<void>();
  readonly closeDrawer = output<void>();

  readonly isSuperAdmin = this.adminAuthService.isSuperAdmin;

  readonly navGroups: NavGroup[] = [
    {
      name: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          route: '/admin/dashboard',
          icon: 'dashboard',
          badge: 'Active',
          tooltip: 'Operational platform overview & metrics',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'User Management',
      items: [
        {
          id: 'travelers',
          label: 'Travelers',
          route: '/admin/travelers',
          icon: 'users',
          badge: 'Active',
          tooltip: 'Traveler directory & account management',
          isImplemented: true,
        },
        {
          id: 'providers',
          label: 'Service Providers',
          route: '/admin/providers',
          icon: 'building-office',
          badge: 'Active',
          tooltip: 'Service provider directory & credentials inspection',
          isImplemented: true,
        },
        {
          id: 'verifications',
          label: 'Verifications',
          route: '/admin/verifications',
          icon: 'shield-check',
          badge: 'Active',
          tooltip: 'Document & identity review queue',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'Service Management',
      items: [
        {
          id: 'homestays',
          label: 'Homestays',
          route: '/admin/homestays',
          icon: 'home',
          badge: 'Active',
          tooltip: 'Homestay listings & physical verification management',
          isImplemented: true,
        },
        {
          id: 'adventures',
          label: 'Adventures',
          route: '/admin/adventures',
          icon: 'mountain',
          badge: 'Active',
          tooltip: 'Adventure activity management & approval queue',
          isImplemented: true,
        },
        {
          id: 'rentals',
          label: 'Bike & Bicycles',
          route: '/admin/rentals',
          icon: 'bicycle',
          badge: 'Active',
          tooltip: 'Vehicle rental fleet management & transport compliance',
          isImplemented: true,
        },
        {
          id: 'tour-guides',
          label: 'Tour Guides',
          route: '/admin/guides',
          icon: 'map-pin',
          badge: 'Active',
          tooltip: 'Tour guide verification & management',
          isImplemented: true,
        },
        {
          id: 'artisans',
          label: 'Artisans',
          route: '/admin/artisans',
          icon: 'shopping-bag',
          badge: 'Active',
          tooltip: 'Artisan craft workshop management & showcase catalog',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'Operations',
      items: [
        {
          id: 'bookings',
          label: 'Bookings',
          route: '/admin/bookings',
          icon: 'calendar',
          badge: 'Active',
          tooltip: 'Cross-module booking management & oversight',
          isImplemented: true,
        },
        {
          id: 'payments',
          label: 'Payments & Refunds',
          route: '/admin/payments',
          icon: 'credit-card',
          badge: 'Active',
          tooltip: 'Transaction processing, payout reconciliation & refunds',
          isImplemented: true,
        },
        {
          id: 'community',
          label: 'Community Moderation',
          route: '/admin/community',
          icon: 'chat-bubble',
          badge: 'Active',
          tooltip: 'Review, comment & discussion moderation',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'Insights',
      items: [
        {
          id: 'reports',
          label: 'Reports & Analytics',
          route: '/admin/reports',
          icon: 'chart-bar',
          badge: 'Active',
          tooltip: 'Business performance analytics & KPI reports',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile & Settings',
          route: '/admin/profile',
          icon: 'user-circle',
          badge: 'Active',
          tooltip: 'Admin profile & account preferences',
          isImplemented: true,
        },
      ],
    },
    {
      name: 'Administration',
      isSuperAdminOnly: true,
      items: [
        {
          id: 'admin-management',
          label: 'Admin Accounts',
          route: '/admin/admins',
          icon: 'user-group',
          badge: 'Active',
          tooltip: 'Admin user provisioning, roles & invitation management',
          isSuperAdminOnly: true,
          isImplemented: true,
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          route: '/admin/audit-logs',
          icon: 'document-text',
          badge: 'Active',
          tooltip: 'System security trails & administrative audit logs',
          isSuperAdminOnly: true,
          isImplemented: true,
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          route: '/admin/settings',
          icon: 'cog',
          badge: 'Active',
          tooltip: 'Platform runtime configuration & security policies',
          isSuperAdminOnly: true,
          isImplemented: true,
        },
      ],
    },
  ];

  onNavClick(item: NavItem): void {
    if (item.isImplemented) {
      this.closeDrawer.emit();
    }
  }
}
