import { Routes } from '@angular/router';

import { travelerAuthGuard } from '../../core/guards/traveler-auth.guard';

export const aiPlannerRoutes: Routes = [
  {
    path: '',
    title: 'AI Trip Planner | CeylonGo',
    loadComponent: () =>
      import('./pages/ai-planner-workspace/ai-planner-workspace.component').then(
        (m) => m.AiPlannerWorkspaceComponent,
      ),
  },
  {
    path: 'saved',
    title: 'Saved Trips | CeylonGo AI',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/ai-saved-trips/ai-saved-trips.component').then(
        (m) => m.AiSavedTripsComponent,
      ),
  },
  {
    path: 'saved/:tripId',
    title: 'Saved Trip Details | CeylonGo AI',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/ai-saved-trips/ai-saved-trips.component').then(
        (m) => m.AiSavedTripsComponent,
      ),
  },
  {
    path: 'chat/:conversationId',
    title: 'AI Trip Chat | CeylonGo',
    canActivate: [travelerAuthGuard],
    loadComponent: () =>
      import('./pages/ai-planner-workspace/ai-planner-workspace.component').then(
        (m) => m.AiPlannerWorkspaceComponent,
      ),
  },
];
