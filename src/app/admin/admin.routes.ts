import { Routes } from '@angular/router';

import { adminAuthGuard, adminGuestGuard } from './core/guards/admin-auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [adminGuestGuard],
    loadComponent: () =>
      import('./pages/auth/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'travelers',
        data: { breadcrumb: 'Travelers' },
        loadComponent: () =>
          import('./pages/travelers/admin-travelers.component').then(
            (m) => m.AdminTravelersComponent
          ),
      },
      {
        path: 'providers',
        data: { breadcrumb: 'Service Providers' },
        loadComponent: () =>
          import('./pages/providers/admin-providers.component').then(
            (m) => m.AdminProvidersComponent
          ),
      },
      {
        path: 'verifications',
        data: { breadcrumb: 'Verifications' },
        loadComponent: () =>
          import('./pages/verifications/admin-verifications.component').then(
            (m) => m.AdminVerificationsComponent
          ),
      },
      {
        path: 'homestays',
        data: { breadcrumb: 'Homestays' },
        loadComponent: () =>
          import('./pages/homestays/admin-homestays.component').then(
            (m) => m.AdminHomestaysComponent
          ),
      },
      {
        path: 'adventures',
        data: { breadcrumb: 'Adventures' },
        loadComponent: () =>
          import('./pages/adventures/admin-adventures.component').then(
            (m) => m.AdminAdventuresComponent
          ),
      },
      {
        path: 'rentals',
        data: { breadcrumb: 'Bike & Bicycles' },
        loadComponent: () =>
          import('./pages/rentals/admin-rentals.component').then(
            (m) => m.AdminRentalsComponent
          ),
      },
      {
        path: 'guides',
        data: { breadcrumb: 'Tour Guides' },
        loadComponent: () =>
          import('./pages/tour-guides/admin-tour-guides.component').then(
            (m) => m.AdminTourGuidesComponent
          ),
      },
      {
        path: 'artisans',
        data: { breadcrumb: 'Artisans' },
        loadComponent: () =>
          import('./pages/artisans/admin-artisans.component').then(
            (m) => m.AdminArtisansComponent
          ),
      },
      {
        path: 'bookings',
        data: { breadcrumb: 'Bookings' },
        loadComponent: () =>
          import('./pages/bookings/admin-bookings.component').then(
            (m) => m.AdminBookingsComponent
          ),
      },
      {
        path: 'payments',
        data: { breadcrumb: 'Payments & Refunds' },
        loadComponent: () =>
          import('./pages/payments/admin-payments.component').then(
            (m) => m.AdminPaymentsComponent
          ),
      },
      {
        path: 'wallets',
        data: { breadcrumb: 'Wallet & Commission' },
        loadComponent: () =>
          import('./pages/wallets/admin-wallets.component').then(
            (m) => m.AdminWalletsComponent
          ),
      },
      {
        path: 'community',
        data: { breadcrumb: 'Community Moderation' },
        loadComponent: () =>
          import('./pages/community/admin-community.component').then(
            (m) => m.AdminCommunityComponent
          ),
      },
      {
        path: 'reports',
        data: { breadcrumb: 'Reports & Analytics' },
        loadComponent: () =>
          import('./pages/reports/admin-reports.component').then(
            (m) => m.AdminReportsComponent
          ),
      },
      {
        path: 'profile',
        data: { breadcrumb: 'Profile & Settings' },
        loadComponent: () =>
          import('./pages/profile/admin-profile.component').then(
            (m) => m.AdminProfileComponent
          ),
      },
      {
        path: 'admins',
        canActivate: [superAdminGuard],
        data: { breadcrumb: 'Admin Accounts' },
        loadComponent: () =>
          import('./pages/admins/admin-management.component').then(
            (m) => m.AdminManagementComponent
          ),
      },
      {
        path: 'audit-logs',
        canActivate: [superAdminGuard],
        data: { breadcrumb: 'Audit Logs' },
        loadComponent: () =>
          import('./pages/audit-logs/admin-audit-logs.component').then(
            (m) => m.AdminAuditLogsComponent
          ),
      },
      {
        path: 'settings',
        canActivate: [superAdminGuard],
        data: { breadcrumb: 'System Settings' },
        loadComponent: () =>
          import('./pages/settings/admin-system-settings.component').then(
            (m) => m.AdminSystemSettingsComponent
          ),
      },
    ],
  },
];
