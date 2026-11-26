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
          icon: 'users',
          badge: 'Upcoming',
          tooltip: 'Traveler directory & account management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'providers',
          label: 'Service Providers',
          icon: 'badge-check',
          badge: 'Upcoming',
          tooltip: 'Provider onboarding & credentials (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'verifications',
          label: 'Verifications',
          icon: 'shield-check',
          badge: 'Upcoming',
          tooltip: 'Document & identity review queue (Upcoming)',
          isImplemented: false,
        },
      ],
    },
    {
      name: 'Service Management',
      items: [
        {
          id: 'homestays',
          label: 'Homestays',
          icon: 'home',
          badge: 'Upcoming',
          tooltip: 'Homestay listings & approval management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'adventures',
          label: 'Adventures',
          icon: 'compass',
          badge: 'Upcoming',
          tooltip: 'Adventure activity management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'rentals',
          label: 'Bike & Bicycles',
          icon: 'bicycle',
          badge: 'Upcoming',
          tooltip: 'Vehicle rental fleet management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'tour-guides',
          label: 'Tour Guides',
          icon: 'map-pin',
          badge: 'Upcoming',
          tooltip: 'Tour guide verification & management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'artisans',
          label: 'Artisans',
          icon: 'shopping-bag',
          badge: 'Upcoming',
          tooltip: 'Artisan craft shop management (Upcoming)',
          isImplemented: false,
        },
      ],
    },
    {
      name: 'Operations',
      items: [
        {
          id: 'bookings',
          label: 'Bookings',
          icon: 'calendar',
          badge: 'Upcoming',
          tooltip: 'Platform reservation management (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'payments',
          label: 'Payments & Refunds',
          icon: 'credit-card',
          badge: 'Upcoming',
          tooltip: 'Transaction processing & refunds (Upcoming)',
          isImplemented: false,
        },
        {
          id: 'community',
          label: 'Community Moderation',
          icon: 'chat-bubble',
          badge: 'Upcoming',
          tooltip: 'Review & forum moderation (Upcoming)',
          isImplemented: false,
        },
      ],
    },
    {
      name: 'Insights',
      items: [
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: 'chart-bar',
          badge: 'Upcoming',
          tooltip: 'Business performance analytics (Upcoming)',
          isImplemented: false,
        },
      ],
    },
    {
      name: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile & Settings',
          icon: 'user-circle',
          badge: 'Upcoming',
          tooltip: 'Admin profile & preferences (Upcoming)',
          isImplemented: false,
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
          icon: 'user-group',
          badge: 'Upcoming',
          tooltip: 'Admin user provisioning & roles (Upcoming)',
          isSuperAdminOnly: true,
          isImplemented: false,
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: 'document-text',
          badge: 'Upcoming',
          tooltip: 'System security & audit trails (Upcoming)',
          isSuperAdminOnly: true,
          isImplemented: false,
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          icon: 'cog',
          badge: 'Upcoming',
          tooltip: 'Platform system configuration (Upcoming)',
          isSuperAdminOnly: true,
          isImplemented: false,
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
