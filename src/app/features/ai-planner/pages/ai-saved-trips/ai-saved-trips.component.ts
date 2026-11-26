import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AiItineraryCardComponent } from '../../components/ai-itinerary-card/ai-itinerary-card.component';
import { AiSavedTripCardComponent } from '../../components/ai-saved-trip-card/ai-saved-trip-card.component';
import { AiServiceCardComponent } from '../../components/ai-service-card/ai-service-card.component';
import { AiSavedTrip } from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-saved-trips',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AiSavedTripCardComponent,
    AiItineraryCardComponent,
    AiServiceCardComponent,
  ],
  template: `
    <main class="saved-trips-page">
      <div class="saved-container">
        @if (selectedTripId() !== null) {
          <header class="page-head">
            <div>
              <a routerLink="/ai-planner/saved" class="sub-nav-link">&larr; All Saved Trips</a>
              <h1>{{ activeTrip()?.title || 'Saved Trip Details' }}</h1>
            </div>
            <a routerLink="/ai-planner" class="btn-primary-link">Open AI Chat</a>
          </header>

          @if (isLoading()) {
            <div class="state-box" aria-busy="true">Loading saved trip...</div>
          } @else if (errorMessage()) {
            <div class="state-box error" role="alert">
              <p>{{ errorMessage() }}</p>
              <button type="button" class="btn-primary" (click)="loadTripDetail(selectedTripId()!)">Retry</button>
            </div>
          } @else if (activeTrip(); as trip) {
            <app-ai-itinerary-card [itinerary]="trip.itinerary" [showActions]="false" />

            @if (trip.itinerary.listings.length > 0) {
              <section class="saved-services-section">
                <h2>Recommended CeylonGo Services</h2>
                <div class="services-grid">
                  @for (item of trip.itinerary.listings; track item.listing_id) {
                    <app-ai-service-card [listing]="item" />
                  }
                </div>
              </section>
            }
          }
        } @else {
          <header class="page-head">
            <div>
              <h1>Saved Trips</h1>
              <p>Your personalized Sri Lanka itineraries saved in CeylonGo.</p>
            </div>
            <a routerLink="/ai-planner" class="btn-primary-link">+ Plan a Trip</a>
          </header>

          @if (isLoading()) {
            <div class="state-box" aria-busy="true">Loading saved trips...</div>
          } @else if (errorMessage()) {
            <div class="state-box error" role="alert">
              <p>{{ errorMessage() }}</p>
              <button type="button" class="btn-primary" (click)="loadTrips()">Retry</button>
            </div>
          } @else if (trips().length === 0) {
            <div class="empty-box">
              <h2>No saved trips yet.</h2>
              <p>Start a conversation with CeylonGo AI and save your favorite trip itinerary.</p>
              <a routerLink="/ai-planner" class="btn-primary-link">Plan a Trip</a>
            </div>
          } @else {
            <div class="trips-grid">
              @for (trip of trips(); track trip.id) {
                <app-ai-saved-trip-card
                  [trip]="trip"
                  (renamed)="onRenameTrip($event)"
                  (deleteRequested)="deleteTarget.set($event)"
                />
              }
            </div>
          }
        }
      </div>

      @if (deleteTarget(); as candidate) {
        <div class="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-trip-title" (click)="deleteTarget.set(null)">
          <div class="confirm-modal" (click)="$event.stopPropagation()">
            <h2 id="delete-trip-title">Delete Saved Trip?</h2>
            <p>Remove “{{ candidate.title }}” from your Saved Trips permanently?</p>
            <div class="confirm-actions">
              <button type="button" class="btn-secondary" (click)="deleteTarget.set(null)" [disabled]="isDeleting()">Cancel</button>
              <button type="button" class="btn-danger" (click)="confirmDelete(candidate)" [disabled]="isDeleting()">
                {{ isDeleting() ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    .saved-trips-page {
      min-height: 70vh;
      background: #f5f8fc;
      padding: 1.5rem var(--cg-page-padding, 32px) 3rem;
      box-sizing: border-box;
    }

    .saved-container {
      width: 100%;
      max-width: none;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .page-head {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;

      h1 {
        margin: 0 0 0.2rem;
        color: #082b5c;
        font-size: 1.35rem;
      }

      p {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
      }
    }

    .sub-nav-link {
      display: inline-block;
      margin-bottom: 0.3rem;
      color: #0066ff;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
    }

    .btn-primary-link,
    .btn-primary {
      border: none;
      border-radius: 10px;
      padding: 0.55rem 1rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.88rem;
      text-decoration: none;
      cursor: pointer;

      &:hover { background: #0052cc; }
    }

    .trips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .saved-services-section h2 {
      margin: 0 0 0.75rem;
      color: #082b5c;
      font-size: 1.1rem;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.85rem;
    }

    .state-box,
    .empty-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 2.25rem 1.5rem;
      text-align: center;
      color: #475569;

      h2 {
        margin: 0 0 0.4rem;
        color: #082b5c;
      }

      p {
        margin: 0 0 1rem;
      }

      &.error { color: #b91c1c; }
    }

    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(8, 43, 92, 0.55);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .confirm-modal {
      width: 100%;
      max-width: 400px;
      background: #ffffff;
      border-radius: 14px;
      padding: 1.2rem;

      h2 {
        margin: 0 0 0.4rem;
        color: #082b5c;
        font-size: 1.08rem;
      }

      p {
        margin: 0 0 1rem;
        color: #475569;
        font-size: 0.88rem;
      }
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
    }

    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.48rem 0.9rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-danger {
      border: none;
      border-radius: 9px;
      padding: 0.48rem 0.95rem;
      background: #dc2626;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }
  `],
})
export class AiSavedTripsComponent implements OnInit {
  private readonly aiService = inject(AiPlannerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly selectedTripId = signal<number | null>(null);
  readonly trips = signal<AiSavedTrip[]>([]);
  readonly activeTrip = signal<AiSavedTrip | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly deleteTarget = signal<AiSavedTrip | null>(null);
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idStr = params.get('tripId');
      if (idStr) {
        const id = Number(idStr);
        this.selectedTripId.set(id);
        this.loadTripDetail(id);
      } else {
        this.selectedTripId.set(null);
        this.activeTrip.set(null);
        this.loadTrips();
      }
    });
  }

  loadTrips(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.aiService.listSavedTrips(30, 0).subscribe({
      next: (items) => {
        this.trips.set(items);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(formatAiPlannerError(err, 'Unable to load saved trips.').message);
      },
    });
  }

  loadTripDetail(tripId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.aiService.getSavedTrip(tripId).subscribe({
      next: (trip) => {
        this.activeTrip.set(trip);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(formatAiPlannerError(err, 'Could not load saved trip details.').message);
      },
    });
  }

  onRenameTrip(payload: { id: number; title: string }): void {
    this.aiService.updateSavedTrip(payload.id, payload.title).subscribe({
      next: (updated) => {
        this.trips.update((items) => items.map((t) => (t.id === updated.id ? updated : t)));
      },
      error: (err) => {
        this.errorMessage.set(formatAiPlannerError(err, 'Could not rename saved trip.').message);
      },
    });
  }

  confirmDelete(trip: AiSavedTrip): void {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.aiService.deleteSavedTrip(trip.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleteTarget.set(null);
        this.trips.update((items) => items.filter((t) => t.id !== trip.id));
        if (this.selectedTripId() === trip.id) {
          this.router.navigate(['/ai-planner/saved']);
        }
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.errorMessage.set(formatAiPlannerError(err, 'Could not delete saved trip.').message);
      },
    });
  }
}
