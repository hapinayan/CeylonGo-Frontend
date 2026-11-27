import { CanActivateFn, Routes } from '@angular/router';
import { travelerAuthGuard } from '../core/guards/traveler-auth.guard';
import { TravelerWishlist, WishlistNavigation } from './traveler-wishlist';
import { wishlistPreviewEnabled } from './wishlist-preview';

const wishlistAccess: CanActivateFn = (route, state) =>
  (wishlistPreviewEnabled && route.queryParamMap.get('preview') === '1') || travelerAuthGuard(route, state);

export const travelerWishlistRoutes: Routes = [{
  path: '',
  providers: [WishlistNavigation],
  children: [{ path: '', component: TravelerWishlist, canActivate: [wishlistAccess],
    runGuardsAndResolvers: 'paramsOrQueryParamsChange', title: 'My Wishlist | CeylonGo' }],
}];
