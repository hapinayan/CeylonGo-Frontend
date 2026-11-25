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
          badge: 'Phase 2',
          isImplemented: false,
        },
        {
          id: 'providers',
          label: 'Service Providers',
          icon: 'badge-check',
          badge: 'Phase 2',
          isImplemented: false,
        },
        {
          id: 'verifications',
          label: 'Verifications',
          icon: 'shield-check',
          badge: 'Phase 2',
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
          badge: 'Phase 3',
          isImplemented: false,
        },
        {
          id: 'adventures',
          label: 'Adventures',
          icon: 'compass',
          badge: 'Phase 3',
          isImplemented: false,
        },
        {
          id: 'rentals',
          label: 'Bike & Bicycles',
          icon: 'bicycle',
          badge: 'Phase 3',
          isImplemented: false,
        },
        {
          id: 'tour-guides',
          label: 'Tour Guides',
          icon: 'map-pin',
          badge: 'Phase 4',
          isImplemented: false,
        },
        {
          id: 'artisans',
          label: 'Artisans',
          icon: 'shopping-bag',
          badge: 'Phase 4',
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
          badge: 'Phase 4',
          isImplemented: false,
        },
        {
          id: 'payments',
          label: 'Payments & Refunds',
          icon: 'credit-card',
          badge: 'Phase 5',
          isImplemented: false,
        },
        {
          id: 'community',
          label: 'Community Moderation',
          icon: 'chat-bubble',
          badge: 'Phase 5',
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
          badge: 'Phase 6',
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
          badge: 'Phase 6',
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
          badge: 'Phase 7',
          isSuperAdminOnly: true,
          isImplemented: false,
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: 'document-text',
          badge: 'Phase 8',
          isSuperAdminOnly: true,
          isImplemented: false,
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          icon: 'cog',
          badge: 'Phase 8',
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
