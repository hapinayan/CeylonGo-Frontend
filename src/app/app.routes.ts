
import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { AuthEntry } from './pages/auth-entry/auth-entry';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { providerAuthGuard } from './core/guards/provider-auth.guard';
import { travelerAuthGuard } from './core/guards/traveler-auth.guard';

export const routes: Routes = [

  // UNIFIED HOMEPAGE (CANONICAL)
  {
    path: '',
    loadComponent: () =>
      import('./pages/traveler-home/traveler-home')
        .then(m => m.TravelerHome),
    pathMatch: 'full'
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },

  // HOMESTAY DISCOVERY & BOOKING
  {
    path: 'homestays',
    loadComponent: () =>
      import('./pages/homestay-discovery/homestay-discovery')
        .then(m => m.HomestayDiscovery)
  },
  {
    path: 'homestays/:id/booking',
    loadComponent: () =>
      import('./pages/homestay-booking-review/homestay-booking-review')
        .then(m => m.HomestayBookingReview)
  },
  {
    path: 'homestays/:id',
    loadComponent: () =>
      import('./pages/homestay-detail/homestay-detail')
        .then(m => m.HomestayDetail)
  },
  {
    path: 'homestay',
    redirectTo: 'homestays',
    pathMatch: 'full'
  },
  {
    path: 'explore',
    redirectTo: 'homestays',
    pathMatch: 'full'
  },
  {
    path: 'stays',
    redirectTo: 'homestays',
    pathMatch: 'full'
  },
  {
    path: 'bike-rentals',
    redirectTo: 'bicycles',
    pathMatch: 'full'
  },
  {
    path: 'rentals',
    redirectTo: 'bicycles',
    pathMatch: 'full'
  },

  // LEGACY TRAVELER HOMEPAGE REDIRECT
  {
    path: 'traveler/home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'traveler',
    redirectTo: '',
    pathMatch: 'full'
  },

  // LEGACY MARKETING HOMEPAGE PRESERVED FOR REFERENCE
  {
    path: 'legacy-home',
    component: Home
  },

  // AUTH ENTRY
  {
    path: 'auth',
    component: AuthEntry
  },

  // LOGIN
  {
    path: 'login',
    component: Login
  },

  // REGISTER
  {
    path: 'register',
    component: Register
  },

  // REGISTER SUCCESS
  {
    path: 'register-success',
    loadComponent: () =>
      import('./pages/register-success/register-success')
        .then(m => m.RegisterSuccess)
  },

  // TERMS AND CONDITIONS
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/terms/terms')
        .then(m => m.Terms)
  },

  // PRIVACY POLICY
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy/privacy')
        .then(m => m.Privacy)
  },

  // LOGIN SUCCESS
  {
    path: 'login-success',
    loadComponent: () =>
      import('./pages/login-success/login-success')
        .then(m => m.LoginSuccess)
  },

  // FORGOT PASSWORD
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password')
        .then(m => m.ForgotPassword)
  },

  // CHECK EMAIL
  {
    path: 'check-email',
    loadComponent: () =>
      import('./pages/check-email/check-email')
        .then(m => m.CheckEmail)
  },

  // RESET PASSWORD
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password')
        .then(m => m.ResetPassword)
  },

  // RESET SUCCESS
  {
    path: 'reset-success',
    loadComponent: () =>
      import('./pages/reset-success/reset-success')
        .then(m => m.ResetSuccess)
  },

  // SERVICE PROVIDER PORTAL WELCOME PAGE
  {
    path: 'provider',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/provider-welcome/provider-welcome')
        .then(m => m.ProviderWelcome)
  },
  {
    path: 'provider/welcome',
    redirectTo: 'provider',
    pathMatch: 'full'
  },

  // SERVICE PROVIDER REGISTRATION
  {
    path: 'provider/register',
    loadComponent: () =>
      import('./provider/registration/provider-registration')
        .then(m => m.ProviderRegistration)
  },

  // PROVIDER LOGIN
  {
    path: 'provider/login',
    loadComponent: () =>
      import('./pages/provider-login-placeholder/provider-login-placeholder')
        .then(m => m.ProviderLoginPlaceholder)
  },

  // PROVIDER FORGOT PASSWORD
  {
    path: 'provider/forgot-password',
    loadComponent: () =>
      import('./pages/provider-forgot-password/provider-forgot-password')
        .then(m => m.ProviderForgotPassword)
  },

  // PROVIDER RESET PASSWORD
  {
    path: 'provider/reset-password',
    loadComponent: () =>
      import('./pages/provider-reset-password/provider-reset-password')
        .then(m => m.ProviderResetPassword)
  },

  // PROVIDER DASHBOARD (AUTHENTICATED)
  {
    path: 'provider/dashboard',
    canActivate: [providerAuthGuard],
    loadComponent: () =>
      import('./provider/layout/provider-layout').then((m) => m.ProviderLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/provider-dashboard/provider-dashboard').then(
            (m) => m.ProviderDashboard
          ),
      },
    ],
  },

  // AUTHENTICATED PROVIDER PORTAL WITH COMMON LAYOUT & SIDEBAR
  {
    path: 'provider',
    canActivate: [providerAuthGuard],
    loadComponent: () =>
      import('./provider/layout/provider-layout').then((m) => m.ProviderLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/provider-dashboard/provider-dashboard').then(
            (m) => m.ProviderDashboard
          ),
      },
      {
        path: 'services/new',
        loadComponent: () =>
          import('./provider/services-catalog/services-catalog').then(
            (m) => m.ServicesCatalog
          ),
      },
      {
        path: 'homestays/new',
        loadComponent: () =>
          import('./provider/homestays/wizard/homestay-wizard').then(
            (m) => m.HomestayWizard
          ),
      },
      {
        path: 'activities/new',
        loadComponent: () =>
          import('./provider/activities/wizard/adventure-wizard').then(
            (m) => m.AdventureWizard
          ),
      },
      {
        path: 'activities/:id/edit',
        loadComponent: () =>
          import('./provider/activities/wizard/adventure-wizard').then(
            (m) => m.AdventureWizard
          ),
      },
      {
        path: 'activities/availability',
        loadComponent: () =>
          import('./provider/activities/availability/activity-availability').then(
            (m) => m.ActivityAvailability
          ),
      },
      {
        path: 'guides/new',
        loadComponent: () =>
          import('./provider/guides/wizard/tour-guide-wizard').then(
            (m) => m.TourGuideWizard
          ),
      },
      {
        path: 'guides/:id/edit',
        loadComponent: () =>
          import('./provider/guides/wizard/tour-guide-wizard').then(
            (m) => m.TourGuideWizard
          ),
      },
      {
        path: 'guides/packages',
        loadComponent: () =>
          import('./provider/guides/packages/tour-guide-packages').then(
            (m) => m.TourGuidePackages
          ),
      },
      {
        path: 'guides/availability',
        loadComponent: () =>
          import('./provider/guides/availability/tour-guide-availability').then(
            (m) => m.TourGuideAvailability
          ),
      },
      {
        path: 'rentals/new',
        loadComponent: () =>
          import('./provider/rentals/wizard/rental-wizard').then(
            (m) => m.RentalWizard
          ),
      },
      {
        path: 'rentals/:id/edit',
        loadComponent: () =>
          import('./provider/rentals/wizard/rental-wizard').then(
            (m) => m.RentalWizard
          ),
      },
      {
        path: 'rentals/availability',
        loadComponent: () =>
          import('./provider/rentals/availability/rental-availability').then(
            (m) => m.RentalAvailability
          ),
      },
      {
        path: 'listings',
        loadComponent: () =>
          import('./provider/listings/provider-listings').then(
            (m) => m.ProviderListings
          ),
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./provider/rooms/provider-rooms').then((m) => m.ProviderRooms),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./provider/bookings/provider-bookings').then(
            (m) => m.ProviderBookings
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'My Provider Profile',
          description:
            'Manage your verified business credentials, contact phone, and registered district.',
        },
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'Promotions & Discounts',
          description:
            'Create seasonal promotional codes and discounts for upcoming holidays in Sri Lanka.',
        },
      },
      {
        path: 'community',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'Provider Community Feed',
          description:
            'Connect with fellow hosts, tour guides, and local artisans across Sri Lanka.',
        },
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'Payouts & Financial Settlements',
          description:
            'View your earnings, bank account details, and completed payouts in LKR.',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'Provider Account Settings',
          description:
            'Configure notifications, password, language preferences, and business policies.',
        },
      },
      {
        path: 'help',
        loadComponent: () =>
          import('./provider/placeholder/provider-placeholder').then(
            (m) => m.ProviderPlaceholder
          ),
        data: {
          title: 'Help & Host Support',
          description:
            'Access host guides, FAQs, and contact CeylonGo support representatives.',
        },
      },
    ],
  },

  // LOCAL TOUR GUIDES DISCOVER, PROFILE & BOOKING PAGES
  {
    path: 'tour-guides/:id/booking',
    loadComponent: () =>
      import('./pages/tour-guides/guide-booking/tour-guide-booking.component')
        .then((m) => m.TourGuideBookingComponent),
  },
  {
    path: 'tour-guides/:id',
    loadComponent: () =>
      import('./pages/tour-guides/guide-detail/tour-guide-detail.component')
        .then((m) => m.TourGuideDetailComponent),
  },

  // ARTISAN TRAVELER MODULE
  {
    path: 'artisans',
    loadChildren: () =>
      import('./features/artisan/artisan.routes')
        .then(m => m.artisanRoutes)
  },

  // LOCAL TOUR GUIDES DISCOVER PAGE
  {
    path: 'tour-guides',
    loadComponent: () =>
      import('./pages/tour-guides/tour-guides.component')
        .then((m) => m.TourGuidesComponent),
  },
  {
    path: 'tour-guide',
    redirectTo: 'tour-guides',
    pathMatch: 'full',
  },

  // EXPERIENCES MODULE
  {
    path: 'experiences',
    loadChildren: () =>
      import('./experiences/experiences.routes')
        .then(m => m.experiencesRoutes)
  },

  // BIKE & BICYCLE RENTAL MODULE
  {
    path: 'bicycles',
    loadChildren: () =>
      import('./bike-rentals/rental.routes')
        .then(module => module.rentalRoutes)
  },

  { path: 'my-bookings', loadChildren: () => import('./traveler-bookings/booking.routes').then(module => module.travelerBookingRoutes) },

  { path: 'wishlist', loadChildren: () => import('./traveler-wishlist/wishlist.routes').then(module => module.travelerWishlistRoutes) },

  // UNKNOWN URL - GO TO HOMEPAGE
  {
    path: '**',
    redirectTo: 'homestays'
  }

];
