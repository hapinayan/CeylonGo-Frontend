import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  MAP_CATEGORY_META,
  MapMarker,
  MapMarkerCategory,
  MapMarkersQuery,
  buildDirectionsUrl,
  formatMapPricingUnit,
  getMapMarkerDetailRoute,
  parseValidCoordinates,
  resolveApiMediaUrl,
} from '../../core/models/weather-map.models';
import { InteractiveMapService } from '../../core/services/interactive-map.service';

const SRI_LANKA_CENTER: L.LatLngTuple = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;
const MARKER_FETCH_LIMIT = 200;

const SRI_LANKA_DISTRICTS: readonly string[] = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

@Component({
  selector: 'app-interactive-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './interactive-map.html',
  styleUrl: './interactive-map.scss',
})
export class InteractiveMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mapService = inject(InteractiveMapService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('mapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private userLocationMarker: L.CircleMarker | null = null;
  private readonly markerById = new Map<number, L.Marker>();
  private resizeObserver: ResizeObserver | null = null;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private fetchSub?: Subscription;
  private suppressMoveEnd = false;

  readonly categoryOptions: readonly { id: MapMarkerCategory | ''; label: string }[] = [
    { id: '', label: 'All Services' },
    { id: 'homestay', label: MAP_CATEGORY_META.homestay.label },
    { id: 'adventure', label: MAP_CATEGORY_META.adventure.label },
    { id: 'guide', label: MAP_CATEGORY_META.guide.label },
    { id: 'bike', label: MAP_CATEGORY_META.bike.label },
    { id: 'bicycle', label: MAP_CATEGORY_META.bicycle.label },
    { id: 'artisan', label: MAP_CATEGORY_META.artisan.label },
  ];

  readonly selectedCategory = signal<MapMarkerCategory | ''>('');
  readonly selectedDistrict = signal<string>('');
  searchKeyword = '';
  readonly activeSearchKeyword = signal<string>('');
  readonly activeBbox = signal<string | null>(null);
  readonly searchOnMove = signal<boolean>(false);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly markers = signal<MapMarker[]>([]);
  readonly selectedListingId = signal<number | null>(null);
  readonly mobileView = signal<'list' | 'map'>('map');
  readonly tileError = signal<boolean>(false);

  readonly isLocating = signal<boolean>(false);
  readonly locationMessage = signal<string | null>(null);

  readonly availableDistricts = computed<string[]>(() => {
    const set = new Set<string>(SRI_LANKA_DISTRICTS);
    for (const m of this.markers()) {
      if (m.district && m.district.trim()) {
        set.add(m.district.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly isResultCapped = computed(() => this.markers().length >= MARKER_FETCH_LIMIT);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const cat = params.get('category') as MapMarkerCategory | null;
    if (cat && cat in MAP_CATEGORY_META) {
      this.selectedCategory.set(cat);
    }
    const dist = params.get('district')?.trim();
    if (dist) {
      this.selectedDistrict.set(dist);
    }
    const q = params.get('q')?.trim();
    if (q) {
      this.searchKeyword = q;
      this.activeSearchKeyword.set(q);
    }

    this.searchSub = this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.activeSearchKeyword.set(term.trim());
        this.loadMarkers();
      });

    this.loadMarkers();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.fetchSub?.unsubscribe();
    this.resizeObserver?.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  loadMarkers(): void {
    this.fetchSub?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const query: MapMarkersQuery = {
      category: this.selectedCategory() || undefined,
      district: this.selectedDistrict() || undefined,
      q: this.activeSearchKeyword() || undefined,
      bbox: this.activeBbox() || undefined,
      limit: MARKER_FETCH_LIMIT,
    };

    this.fetchSub = this.mapService.getMarkers(query).subscribe({
      next: (items) => {
        const valid = items.filter(
          (m) => parseValidCoordinates(m.latitude, m.longitude) !== null
        );
        this.markers.set(valid);
        this.isLoading.set(false);
        this.renderMapMarkers(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        const status = err?.status;
        if (status === 422) {
          this.errorMessage.set('Invalid map filter parameters. Please adjust or reset filters.');
        } else {
          this.errorMessage.set('Could not load Sri Lanka service markers. Please retry.');
        }
      },
    });
  }

  selectCategory(category: MapMarkerCategory | ''): void {
    this.selectedCategory.set(category);
    this.loadMarkers();
  }

  onDistrictChange(district: string): void {
    this.selectedDistrict.set(district);
    this.loadMarkers();
  }

  onSearchInput(value: string): void {
    this.searchKeyword = value;
    this.search$.next(value);
  }

  submitKeywordSearch(): void {
    this.activeSearchKeyword.set(this.searchKeyword.trim());
    this.loadMarkers();
  }

  searchCurrentArea(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    const bbox = [
      bounds.getWest().toFixed(5),
      bounds.getSouth().toFixed(5),
      bounds.getEast().toFixed(5),
      bounds.getNorth().toFixed(5),
    ].join(',');
    this.activeBbox.set(bbox);
    this.loadMarkers();
  }

  toggleSearchOnMove(enabled: boolean): void {
    this.searchOnMove.set(enabled);
    if (enabled && this.map) {
      this.searchCurrentArea();
    } else if (!enabled && this.activeBbox()) {
      this.activeBbox.set(null);
      this.loadMarkers();
    }
  }

  resetFiltersAndView(): void {
    this.selectedCategory.set('');
    this.selectedDistrict.set('');
    this.searchKeyword = '';
    this.activeSearchKeyword.set('');
    this.activeBbox.set(null);
    this.searchOnMove.set(false);
    this.selectedListingId.set(null);
    this.locationMessage.set(null);

    if (this.map) {
      this.suppressMoveEnd = true;
      this.map.setView(SRI_LANKA_CENTER, DEFAULT_ZOOM);
      setTimeout(() => {
        this.suppressMoveEnd = false;
      }, 250);
    }
    this.loadMarkers();
  }

  useCurrentLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator?.geolocation) {
      this.locationMessage.set('Browser geolocation is not available on this device.');
      return;
    }

    this.isLocating.set(true);
    this.locationMessage.set(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating.set(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (this.map) {
          this.suppressMoveEnd = true;
          this.map.setView([lat, lng], 12);
          if (this.userLocationMarker) {
            this.userLocationMarker.remove();
          }
          this.userLocationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#ffffff',
            fillColor: '#0066FF',
            fillOpacity: 1,
            weight: 3,
          })
            .bindPopup('<strong>Your Current Location</strong>')
            .addTo(this.map);
          setTimeout(() => {
            this.suppressMoveEnd = false;
          }, 300);
        }
        this.locationMessage.set('Centered on your current location.');
      },
      (err) => {
        this.isLocating.set(false);
        if (err.code === err.PERMISSION_DENIED) {
          this.locationMessage.set('Location permission was denied. You can browse Sri Lanka freely.');
        } else {
          this.locationMessage.set('Unable to determine your current location.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  setMobileView(view: 'list' | 'map'): void {
    this.mobileView.set(view);
    if (view === 'map') {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 60);
    }
  }

  focusMarker(marker: MapMarker): void {
    this.selectedListingId.set(marker.listing_id);
    if (this.mobileView() === 'list') {
      this.setMobileView('map');
    }
    if (!this.map) return;

    this.suppressMoveEnd = true;
    const targetZoom = Math.max(this.map.getZoom(), 13);
    this.map.setView([marker.latitude, marker.longitude], targetZoom);
    setTimeout(() => {
      this.suppressMoveEnd = false;
      this.renderMapMarkers(false);
      const leafletMarker = this.markerById.get(marker.listing_id);
      leafletMarker?.openPopup();
    }, 180);
  }

  navigateToDetail(marker: MapMarker): void {
    void this.router.navigate(getMapMarkerDetailRoute(marker));
  }

  categoryLabel(category: MapMarkerCategory): string {
    return MAP_CATEGORY_META[category]?.shortLabel || category;
  }

  categoryColor(category: MapMarkerCategory): string {
    return MAP_CATEGORY_META[category]?.color || '#0066FF';
  }

  categoryBg(category: MapMarkerCategory): string {
    return MAP_CATEGORY_META[category]?.bg || '#EAF5FF';
  }

  resolveImage(url: string | null): string | null {
    return resolveApiMediaUrl(url);
  }

  priceText(marker: MapMarker): string | null {
    if (marker.display_price === null || marker.display_price === undefined || marker.display_price === '') {
      return null;
    }
    const num = Number(marker.display_price);
    if (!Number.isFinite(num)) return null;
    const formatted = `${marker.currency || 'LKR'} ${num.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const unit = formatMapPricingUnit(marker.pricing_unit);
    return unit ? `${formatted} · ${unit}` : formatted;
  }

  directionsLink(marker: MapMarker): string {
    return buildDirectionsUrl(marker.latitude, marker.longitude);
  }

  private initMap(): void {
    const container = this.mapContainerRef?.nativeElement;
    if (!container) return;

    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    try {
      this.map = L.map(container, {
        center: SRI_LANKA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 6,
        maxZoom: 18,
        attributionControl: true,
      });

      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });

      tiles.on('tileerror', () => {
        this.tileError.set(true);
      });
      tiles.addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);

      this.map.on('zoomend', () => {
        this.renderMapMarkers(false);
      });

      this.map.on('moveend', () => {
        if (this.suppressMoveEnd) return;
        if (this.searchOnMove()) {
          this.searchCurrentArea();
        }
      });

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.map?.invalidateSize();
        });
        this.resizeObserver.observe(container);
      }

      this.renderMapMarkers(true);
      setTimeout(() => this.map?.invalidateSize(), 120);
    } catch {
      // Safe fallback in headless unit test environments without canvas layout
    }
  }

  private renderMapMarkers(fitBounds: boolean): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.markerById.clear();

    const list = this.markers();
    if (list.length === 0) return;

    const zoom = this.map.getZoom();
    const shouldCluster = zoom <= 10 && list.length > 18;

    if (shouldCluster) {
      this.renderClusteredMarkers(list, zoom);
    } else {
      for (const item of list) {
        const marker = this.createServiceMarker(item);
        marker.addTo(this.markersLayer);
        this.markerById.set(item.listing_id, marker);
      }
    }

    if (fitBounds && !this.activeBbox() && list.length > 0) {
      const bounds = L.latLngBounds(list.map((m) => [m.latitude, m.longitude] as L.LatLngTuple));
      if (bounds.isValid()) {
        this.suppressMoveEnd = true;
        this.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
        setTimeout(() => {
          this.suppressMoveEnd = false;
        }, 250);
      }
    }
  }

  private renderClusteredMarkers(list: MapMarker[], zoom: number): void {
    if (!this.markersLayer || !this.map) return;

    const cellDeg = zoom <= 7 ? 0.55 : zoom <= 8 ? 0.35 : 0.18;
    const buckets = new Map<string, MapMarker[]>();

    for (const item of list) {
      const key = `${Math.floor(item.latitude / cellDeg)}:${Math.floor(item.longitude / cellDeg)}`;
      const bucket = buckets.get(key) || [];
      bucket.push(item);
      buckets.set(key, bucket);
    }

    for (const bucket of buckets.values()) {
      if (bucket.length === 1) {
        const marker = this.createServiceMarker(bucket[0]);
        marker.addTo(this.markersLayer);
        this.markerById.set(bucket[0].listing_id, marker);
        continue;
      }

      const avgLat = bucket.reduce((sum, m) => sum + m.latitude, 0) / bucket.length;
      const avgLng = bucket.reduce((sum, m) => sum + m.longitude, 0) / bucket.length;

      const clusterIcon = L.divIcon({
        className: 'cg-cluster-marker-wrap',
        html: `<div class="cg-cluster-marker">${bucket.length}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const clusterMarker = L.marker([avgLat, avgLng], { icon: clusterIcon });
      clusterMarker.on('click', () => {
        const bounds = L.latLngBounds(
          bucket.map((m) => [m.latitude, m.longitude] as L.LatLngTuple)
        );
        this.map?.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      });
      clusterMarker.addTo(this.markersLayer);
    }
  }

  private createServiceMarker(item: MapMarker): L.Marker {
    const meta = MAP_CATEGORY_META[item.category] || MAP_CATEGORY_META.homestay;
    const isSelected = this.selectedListingId() === item.listing_id;

    const icon = L.divIcon({
      className: 'cg-pin-wrap',
      html: `<div class="cg-pin ${isSelected ? 'selected' : ''}" style="--pin-color:${meta.color};"><span>${this.categorySymbol(item.category)}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30],
    });

    const marker = L.marker([item.latitude, item.longitude], { icon });
    marker.bindPopup(this.buildPopupHtml(item), { maxWidth: 280, minWidth: 240 });

    marker.on('click', () => {
      this.selectedListingId.set(item.listing_id);
    });

    marker.on('popupopen', (evt) => {
      const popupEl = evt.popup.getElement();
      const detailsBtn = popupEl?.querySelector('.cg-popup-details-btn');
      if (detailsBtn) {
        detailsBtn.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.navigateToDetail(item);
          },
          { once: true }
        );
      }
    });

    return marker;
  }

  private categorySymbol(category: MapMarkerCategory): string {
    switch (category) {
      case 'homestay':
        return 'H';
      case 'adventure':
        return 'A';
      case 'guide':
        return 'G';
      case 'bike':
        return 'M';
      case 'bicycle':
        return 'B';
      case 'artisan':
        return 'C';
    }
  }

  private buildPopupHtml(item: MapMarker): string {
    const meta = MAP_CATEGORY_META[item.category] || MAP_CATEGORY_META.homestay;
    const imgUrl = this.resolveImage(item.cover_image_url);
    const price = this.priceText(item);
    const dirUrl = this.directionsLink(item);
    const titleEsc = this.escapeHtml(item.title);
    const districtEsc = this.escapeHtml(item.district || 'Sri Lanka');
    const catEsc = this.escapeHtml(meta.shortLabel);

    const imgHtml = imgUrl
      ? `<img class="cg-popup-img" src="${this.escapeHtml(imgUrl)}" alt="${titleEsc}" onerror="this.style.display='none'" />`
      : `<div class="cg-popup-img-placeholder">${catEsc}</div>`;

    const priceHtml = price
      ? `<div class="cg-popup-price">${this.escapeHtml(price)}</div>`
      : `<div class="cg-popup-price muted">Contact listing for details</div>`;

    return `
      <div class="cg-map-popup">
        ${imgHtml}
        <div class="cg-popup-body">
          <span class="cg-popup-cat" style="background:${meta.bg};color:${meta.color};">${catEsc}</span>
          <h4 class="cg-popup-title">${titleEsc}</h4>
          <div class="cg-popup-loc">${districtEsc}</div>
          ${priceHtml}
          <div class="cg-popup-actions">
            <button type="button" class="cg-popup-details-btn">View Details</button>
            <a class="cg-popup-dir-btn" href="${this.escapeHtml(dirUrl)}" target="_blank" rel="noopener noreferrer">Get Directions</a>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
