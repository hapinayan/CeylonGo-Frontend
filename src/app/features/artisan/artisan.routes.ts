import { Routes } from '@angular/router';
import { travelerAuthGuard } from '../../core/guards/traveler-auth.guard';

export const artisanRoutes: Routes = [
  {
    path: '',
    title: 'Local Artisans & Small Businesses | CeylonGo',
    loadComponent: () =>
      import('./pages/artisan-landing/artisan-landing.component').then(
        (m) => m.ArtisanLandingComponent
      ),
  },
  {
    path: 'discover',
    title: 'Discover Local Artisans | CeylonGo',
    loadComponent: () =>
      import('./pages/artisan-discovery/artisan-discovery.component').then(
        (m) => m.ArtisanDiscoveryComponent
      ),
  },
  {
    // STATIC ROUTE REGISTERED BEFORE DYNAMIC PARAMETER ROUTES
    path: 'favorites',
    title: 'My Favorites | CeylonGo',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/my-favorites/my-favorites.component').then(
        (m) => m.MyFavoritesComponent
      ),
  },
  {
    path: 'products/:productId',
    title: 'Product Details | CeylonGo',
    loadComponent: () =>
      import('./pages/product-details/product-details.component').then(
        (m) => m.ProductDetailsComponent
      ),
  },
  {
    path: ':id',
    title: 'Artisan Profile | CeylonGo',
    loadComponent: () =>
      import('./pages/artisan-profile/artisan-profile.component').then(
        (m) => m.ArtisanProfileComponent
      ),
  },
  {
    path: ':id/products/:productId',
    title: 'Product Details | CeylonGo',
    loadComponent: () =>
      import('./pages/product-details/product-details.component').then(
        (m) => m.ProductDetailsComponent
      ),
  },
  {
    path: ':id/contact',
    title: 'Contact Artisan | CeylonGo',
    loadComponent: () =>
      import('./pages/contact-artisan/contact-artisan.component').then(
        (m) => m.ContactArtisanComponent
      ),
  },
];
