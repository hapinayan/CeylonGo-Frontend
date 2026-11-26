import { Routes } from '@angular/router';
import { travelerAuthGuard } from '../../core/guards/traveler-auth.guard';

export const communityRoutes: Routes = [
  {
    path: '',
    title: 'Travel Community | CeylonGo',
    loadComponent: () =>
      import('./pages/community-feed/community-feed.component').then(
        (m) => m.CommunityFeedComponent,
      ),
  },
  {
    path: 'my-posts',
    title: 'My Community Posts | CeylonGo',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/community-my-posts/community-my-posts.component').then(
        (m) => m.CommunityMyPostsComponent,
      ),
  },
  {
    path: 'saved',
    title: 'Saved Community Posts | CeylonGo',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/community-saved/community-saved.component').then(
        (m) => m.CommunitySavedComponent,
      ),
  },
  {
    path: 'posts/:id',
    title: 'Community Post | CeylonGo',
    loadComponent: () =>
      import('./pages/community-post-details/community-post-details.component').then(
        (m) => m.CommunityPostDetailsComponent,
      ),
  },
];
