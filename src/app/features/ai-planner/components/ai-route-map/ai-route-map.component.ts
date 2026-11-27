import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
} from '@angular/core';
import * as L from 'leaflet';

import { AiListingResult, AiPlanDay } from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-route-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="route-section" aria-label="Route and Destination Order">
      <header class="route-head">
        <h3>Suggested Destination Sequence</h3>
        <span class="approx-tag">Approximate Route Order</span>
      </header>

      <ol class="stop-chips">
        @for (stop of orderedDestinations(); track $index) {
          <li>Day {{ stop.day }}: {{ stop.destination }}</li>
        }
      </ol>

      @if (verifiedCoordListings().length > 0) {
        <div class="map-box" #mapContainer aria-label="Verified service locations map"></div>
      } @else {
        <p class="no-coords-note">Verified geographic coordinates were not returned for the services in this plan.</p>
      }
    </section>
  `,
  styles: [`
    .route-section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      padding: 0.9rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .route-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;

      h3 {
        margin: 0;
        color: #082b5c;
        font-size: 0.94rem;
        font-weight: 700;
      }
    }

    .approx-tag {
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .stop-chips {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;

      li {
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: #eaf2ff;
        color: #082b5c;
        font-size: 0.78rem;
        font-weight: 600;
      }
    }

    .map-box {
      width: 100%;
      height: 220px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .no-coords-note {
      margin: 0;
      color: #64748b;
      font-size: 0.8rem;
    }
  `],
})
export class AiRouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() days: AiPlanDay[] = [];
  @Input() listings: AiListingResult[] = [];
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private layerGroup: L.LayerGroup | null = null;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  readonly orderedDestinations = computed(() =>
    (this.days ?? []).map((d) => ({ day: d.day, destination: d.destination })),
  );

  readonly verifiedCoordListings = computed(() =>
    (this.listings ?? []).filter(
      (l) =>
        l.latitude !== null &&
        l.latitude !== undefined &&
        l.longitude !== null &&
        l.longitude !== undefined &&
        Number.isFinite(Number(l.latitude)) &&
        Number.isFinite(Number(l.longitude)),
    ),
  );

  ngAfterViewInit(): void {
    this.renderMap();
  }

  ngOnChanges(): void {
    this.renderMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private renderMap(): void {
    if (!isPlatformBrowser(this.platformId) || !this.mapContainer?.nativeElement) {
      return;
    }
    const items = this.verifiedCoordListings();
    if (items.length === 0) {
      return;
    }

    if (!this.map) {
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [7.8731, 80.7718],
        zoom: 7,
        scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);
      this.layerGroup = L.layerGroup().addTo(this.map);
    }

    this.layerGroup?.clearLayers();
    const bounds: L.LatLngTuple[] = [];
    for (const item of items) {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      bounds.push([lat, lng]);
      L.circleMarker([lat, lng], {
        radius: 7,
        color: '#082b5c',
        weight: 2,
        fillColor: '#0066ff',
        fillOpacity: 0.9,
      })
        .bindPopup(`<strong>${this.escapeText(item.title)}</strong><br/>${this.escapeText(item.locality)}, ${this.escapeText(item.district)}`)
        .addTo(this.layerGroup!);
    }

    if (bounds.length >= 2) {
      L.polyline(bounds, { color: '#0066ff', weight: 2.5, dashArray: '6 6', opacity: 0.75 }).addTo(
        this.layerGroup!,
      );
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
    }
  }

  private escapeText(value: string): string {
    return (value || '').replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch),
    );
  }
}
