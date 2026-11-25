
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
      import('./pages/provider-dashboard/provider-dashboard')
        .then(m => m.ProviderDashboard)
  },

  // LOCAL TOUR GUIDES DISCOVER PAGE
  {
    path: 'tour-guides',
    loadComponent: () =>
      import('./pages/tour-guides/tour-guides.component')
        .then(m => m.TourGuidesComponent)
  },
  {
    path: 'tour-guide',
    redirectTo: 'tour-guides',
    pathMatch: 'full'
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

  // UNKNOWN URL - GO TO HOMEPAGE
  {
    path: '**',
    redirectTo: 'homestays'
  }

];
