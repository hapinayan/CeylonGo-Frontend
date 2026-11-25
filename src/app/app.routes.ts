
import { Routes } from '@angular/router';

import { AuthEntry } from './pages/auth-entry/auth-entry';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

export const routes: Routes = [

  // DEFAULT ROUTE - HOMESTAY DISCOVERY
  {
    path: '',
    redirectTo: 'homestays',
    pathMatch: 'full'
  },

  // HOMESTAY DISCOVERY & BOOKING - TRAVELER FRONTEND (PHASE 1 & PHASE 2)
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

  // PROVIDER LOGIN (PLACEHOLDER ROUTE)
  {
    path: 'provider/login',
    loadComponent: () =>
      import('./pages/provider-login-placeholder/provider-login-placeholder')
        .then(m => m.ProviderLoginPlaceholder)
  },

  // UNKNOWN URL - GO TO HOMESTAY DISCOVERY
  {
    path: '**',
    redirectTo: 'homestays'
  }

];
