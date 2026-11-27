import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { HomestaySummary } from '../../../../core/models/homestay.models';
import { NEUTRAL_HOMESTAY_PLACEHOLDER } from '../../../../core/services/homestay.service';

// Sri Lanka geographical center and integer overview zoom for complete tile loading
const DEFAULT_CENTER: L.LatLngTuple = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;

@Component({
  selector: 'app-homestay-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './homestay-map.component.html',
  styleUrl: './homestay-map.component.scss',
})
export class HomestayMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() homestays: HomestaySummary[] = [];
  @Input() selectedId: number | null = null;
  @Input() hoveredId: number | null = null;

  @Output() markerClick = new EventEmitter<HomestaySummary>();
  @Output() markerHover = new EventEmitter<number | null>();

  @ViewChild('mapElement') mapElementRef?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private readonly markersMap = new Map<number, L.Marker>();
  private resizeObserver: ResizeObserver | null = null;
  private readonly onWindowResize = () => this.map?.invalidateSize();

  readonly validCoordinatesCount = signal<number>(0);
  readonly tileLoadFailed = signal<boolean>(false);

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly router: Router
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['homestays']) {
      this.renderMarkers(true);
    } else {
      if (changes['hoveredId']) {
        this.updateMarkerState(
          changes['hoveredId'].previousValue,
          changes['hoveredId'].currentValue
        );
      }
      if (changes['selectedId']) {
        this.updateMarkerState(
          changes['selectedId'].previousValue,
          changes['selectedId'].currentValue
        );
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private initMap(): void {
    if (!this.mapElementRef?.nativeElement) return;
    const container = this.mapElementRef.nativeElement;

    // Guard against re-initialization on existing container
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    try {
      this.map = L.map(container, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
        minZoom: 6,
        maxZoom: 18,
        preferCanvas: false,
      });

      // OpenStreetMap standard tile layer with distributed subdomains
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });

      tileLayer.addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);

      // Render initial markers (or center overview when empty)
      this.renderMarkers(true);

      // Schedule multiple invalidateSize calls to guarantee tile grid recalculation across DOM layout passes
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
      });

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 300);

      // Setup ResizeObserver for responsive resizing and mobile view toggling
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.map?.invalidateSize();
        });
        this.resizeObserver.observe(container);
      }

      // Window resize listener
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.onWindowResize);
      }
    } catch {
      // Graceful fallback if map cannot be created
    }
  }

  private destroyMap(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.markersMap.clear();

    if (this.markersLayer) {
      this.markersLayer.clearLayers();
      this.markersLayer = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  renderMarkers(autoFit: boolean = false): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.markersMap.clear();

    const validItems = (this.homestays || []).filter((h) => this.hasValidCoordinates(h));
    this.validCoordinatesCount.set(validItems.length);

    const latLngs: L.LatLngExpression[] = [];

    for (const h of validItems) {
      const isSelected = this.selectedId === h.id;
      const isHovered = this.hoveredId === h.id;
      const isActive = isSelected || isHovered;

      const icon = this.createPriceIcon(h.price_per_night, isActive);

      const marker = L.marker([h.latitude!, h.longitude!], {
        icon,
        zIndexOffset: isActive ? 1000 : 10,
        keyboard: true,
        title: `${h.name} - LKR ${h.price_per_night}`,
      });

      const popupContent = this.createPopupElement(h);
      marker.bindPopup(popupContent, {
        maxWidth: 240,
        minWidth: 210,
        className: 'cg-leaflet-popup-custom',
        closeButton: true,
      });

      marker.on('click', () => {
        this.markerClick.emit(h);
      });

      marker.on('mouseover', () => {
        this.markerHover.emit(h.id);
      });

      marker.on('mouseout', () => {
        this.markerHover.emit(null);
      });

      this.markersLayer.addLayer(marker);
      this.markersMap.set(h.id, marker);
      latLngs.push([h.latitude!, h.longitude!]);
    }

    if (autoFit) {
      this.fitMapToBounds(latLngs);
    }
  }

  private updateMarkerState(prevId: number | null, nextId: number | null): void {
    if (prevId && this.markersMap.has(prevId)) {
      const h = this.homestays.find((item) => item.id === prevId);
      if (h) {
        const isStillActive = this.selectedId === prevId || this.hoveredId === prevId;
        const marker = this.markersMap.get(prevId)!;
        marker.setIcon(this.createPriceIcon(h.price_per_night, isStillActive));
        marker.setZIndexOffset(isStillActive ? 1000 : 10);
      }
    }

    if (nextId && this.markersMap.has(nextId)) {
      const h = this.homestays.find((item) => item.id === nextId);
      if (h) {
        const marker = this.markersMap.get(nextId)!;
        marker.setIcon(this.createPriceIcon(h.price_per_night, true));
        marker.setZIndexOffset(1000);
      }
    }
  }

  private createPriceIcon(price: number, isActive: boolean): L.DivIcon {
    const formattedPrice = `LKR ${Number(price).toLocaleString('en-US')}`;
    const activeClass = isActive ? 'is-active' : '';

    return L.divIcon({
      className: 'cg-price-marker-host',
      html: `
        <div class="price-marker-anchor ${activeClass}">
          <div class="price-marker-pill ${activeClass}">
            <span class="price-text">${this.escapeHtml(formattedPrice)}</span>
          </div>
          <div class="price-marker-dot ${activeClass}"></div>
        </div>
      `,
      iconSize: [92, 38],
      iconAnchor: [46, 38],
      popupAnchor: [0, -42],
    });
  }

  private createPopupElement(h: HomestaySummary): HTMLElement {
    const root = document.createElement('div');
    root.className = 'cg-map-popup-body';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'cg-popup-img-wrap';
    const img = document.createElement('img');
    img.className = 'cg-popup-img';
    img.src = h.image_url || NEUTRAL_HOMESTAY_PLACEHOLDER;
    img.alt = h.name || 'Homestay';
    imgWrap.appendChild(img);

    const details = document.createElement('div');
    details.className = 'cg-popup-details';

    const title = document.createElement('h4');
    title.className = 'cg-popup-title';
    title.textContent = h.name || 'Homestay';

    const location = document.createElement('p');
    location.className = 'cg-popup-loc';
    location.textContent = h.location || h.city || 'Sri Lanka';

    const priceRow = document.createElement('div');
    priceRow.className = 'cg-popup-price-row';
    const priceText = document.createElement('span');
    priceText.className = 'cg-popup-price';
    priceText.textContent = `LKR ${Number(h.price_per_night).toLocaleString('en-US')}`;
    const perNight = document.createElement('span');
    perNight.className = 'cg-popup-period';
    perNight.textContent = ' / night';
    priceRow.appendChild(priceText);
    priceRow.appendChild(perNight);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cg-popup-btn-view';
    btn.textContent = 'View Details →';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.router.navigate(['/homestays', h.id]);
    });

    details.appendChild(title);
    details.appendChild(location);
    details.appendChild(priceRow);
    details.appendChild(btn);

    root.appendChild(imgWrap);
    root.appendChild(details);

    return root;
  }

  fitMapToBounds(latLngs?: L.LatLngExpression[]): void {
    if (!this.map) return;
    const coords =
      latLngs ||
      Array.from(this.markersMap.values()).map((m) => m.getLatLng() as L.LatLngExpression);

    if (coords.length === 1) {
      this.map.setView(coords[0], 13, { animate: true });
    } else if (coords.length > 1) {
      const bounds = L.latLngBounds(coords as L.LatLngTuple[]);
      this.map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 14,
        animate: true,
      });
    } else {
      // Complete Sri Lanka overview view when no listings or markers exist
      this.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
    }

    // Recalculate tile viewport
    this.map.invalidateSize();
  }

  zoomIn(event?: Event): void {
    if (event) event.stopPropagation();
    this.map?.zoomIn();
  }

  zoomOut(event?: Event): void {
    if (event) event.stopPropagation();
    this.map?.zoomOut();
  }

  recenter(event?: Event): void {
    if (event) event.stopPropagation();
    this.fitMapToBounds();
  }

  hasValidCoordinates(h: HomestaySummary): boolean {
    const lat = h.latitude;
    const lng = h.longitude;
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      (lat !== 0 || lng !== 0)
    );
  }

  private escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
