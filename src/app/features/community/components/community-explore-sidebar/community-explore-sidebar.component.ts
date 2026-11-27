import { CommonModule } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../../../core/interceptors/auth.interceptor';
import { HomestayService } from '../../../../core/services/homestay.service';
import { ArtisanService } from '../../../artisan/services/artisan.service';

export interface ExploreHighlightItem {
  category: string;
  title: string;
  location: string;
  route: string;
}

@Component({
  selector: 'app-community-explore-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <aside class="explore-sidebar" aria-label="Explore Sri Lanka">
      <div class="sidebar-card">
        <div class="card-head">
          <h2>Explore Sri Lanka</h2>
          <a routerLink="/explore" class="see-all">All experiences</a>
        </div>

        <nav class="category-links" aria-label="Traveler categories">
          <a routerLink="/homestays" class="cat-pill">
            <span>Homestays</span>
            <small>Authentic local stays</small>
          </a>
          <a routerLink="/experiences" class="cat-pill">
            <span>Adventures &amp; Experiences</span>
            <small>Safaris, hikes &amp; culture</small>
          </a>
          <a routerLink="/tour-guides" class="cat-pill">
            <span>Tour Guides</span>
            <small>Certified local experts</small>
          </a>
          <a routerLink="/bicycles" class="cat-pill">
            <span>Bike &amp; Bicycle Rentals</span>
            <small>Scooters, bikes &amp; cycles</small>
          </a>
          <a routerLink="/artisans/discover" class="cat-pill">
            <span>Artisans &amp; Handicrafts</span>
            <small>Traditional Sri Lankan crafts</small>
          </a>
        </nav>
      </div>

      <div class="sidebar-card">
        <div class="card-head">
          <h3>Featured Picks</h3>
        </div>

        @if (isLoading()) {
          <div class="skeleton-list" aria-hidden="true">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
        } @else if (highlights().length > 0) {
          <ul class="highlight-list">
            @for (item of highlights(); track item.route + item.title) {
              <li>
                <a [routerLink]="item.route" class="highlight-link">
                  <span class="hl-cat">{{ item.category }}</span>
                  <strong>{{ item.title }}</strong>
                  @if (item.location) {
                    <span class="hl-loc">{{ item.location }}</span>
                  }
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="empty-note">Browse verified stays, local craftspeople, and guided tours across Sri Lanka.</p>
        }
      </div>
    </aside>
  `,
  styles: [`
    .explore-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .sidebar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem;
      box-shadow: 0 2px 10px rgba(8, 43, 92, 0.04);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    h2, h3 {
      margin: 0;
      color: #082b5c;
      font-size: 0.98rem;
      font-weight: 700;
    }
    .see-all {
      color: #0066ff;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
    }
    .see-all:hover { text-decoration: underline; }
    .category-links {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .cat-pill {
      display: flex;
      flex-direction: column;
      padding: 0.55rem 0.7rem;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
      background: #f8fafc;
      text-decoration: none;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .cat-pill:hover {
      border-color: #bfdbfe;
      background: #eff6ff;
    }
    .cat-pill span {
      color: #082b5c;
      font-weight: 600;
      font-size: 0.86rem;
    }
    .cat-pill small {
      color: #64748b;
      font-size: 0.75rem;
    }
    .highlight-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .highlight-link {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.6rem 0.7rem;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      text-decoration: none;
      transition: border-color 0.15s ease;
    }
    .highlight-link:hover { border-color: #0066ff; }
    .hl-cat {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0066ff;
    }
    .highlight-link strong {
      color: #082b5c;
      font-size: 0.86rem;
      line-height: 1.3;
    }
    .hl-loc {
      color: #64748b;
      font-size: 0.76rem;
    }
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .skeleton-item {
      height: 54px;
      border-radius: 10px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: pulse 1.3s infinite;
    }
    .empty-note {
      margin: 0;
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.5;
    }
    @keyframes pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class CommunityExploreSidebarComponent implements OnInit {
  private readonly homestayService = inject(HomestayService);
  private readonly artisanService = inject(ArtisanService);
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(true);
  readonly highlights = signal<ExploreHighlightItem[]>([]);

  ngOnInit(): void {
    const anonCtx = new HttpContext().set(ANONYMOUS_API_REQUEST, true);

    forkJoin({
      homestays: this.homestayService.getHomestays({ limit: 1 }).pipe(catchError(() => of(null))),
      artisans: this.artisanService.getListings({ page: 1, page_size: 1 }).pipe(catchError(() => of(null))),
      guides: this.http
        .get<{ items?: Array<{ id: string | number; title?: string; name?: string; district?: string }> }>(
          `${environment.apiBaseUrl}/tour-guides?limit=1`,
          { context: anonCtx },
        )
        .pipe(catchError(() => of(null))),
    }).subscribe(({ homestays, artisans, guides }) => {
      const items: ExploreHighlightItem[] = [];

      const stay = homestays?.items?.[0];
      if (stay) {
        items.push({
          category: 'Homestay',
          title: stay.name,
          location: [stay.city, stay.district].filter(Boolean).join(', '),
          route: `/homestays/${stay.id}`,
        });
      }

      const artisan = artisans?.items?.[0];
      if (artisan) {
        items.push({
          category: 'Local Artisan',
          title: artisan.title,
          location: [artisan.city, artisan.district].filter(Boolean).join(', '),
          route: `/artisans/${artisan.id}`,
        });
      }

      const guide = guides?.items?.[0];
      if (guide) {
        items.push({
          category: 'Tour Guide',
          title: guide.title || guide.name || 'Certified Tour Guide',
          location: guide.district || '',
          route: `/tour-guides/${guide.id}`,
        });
      }

      this.highlights.set(items);
      this.isLoading.set(false);
    });
  }
}
