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
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

const SRI_LANKA_DEFAULT: L.LatLngTuple = [6.8667, 81.0466]; // Ella by default

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude: number | null = 6.8667;
  @Input() longitude: number | null = 81.0466;

  @Output() coordinatesChange = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('pickerMap') pickerMapRef?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  readonly latInput = signal<number>(6.8667);
  readonly lngInput = signal<number>(81.0466);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['latitude'] || changes['longitude']) {
      const lat = this.latitude ?? SRI_LANKA_DEFAULT[0];
      const lng = this.longitude ?? SRI_LANKA_DEFAULT[1];
      this.latInput.set(lat);
      this.lngInput.set(lng);

      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      }
      if (this.map) {
        this.map.panTo([lat, lng]);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.pickerMapRef?.nativeElement) return;

    const initialLat = this.latitude ?? SRI_LANKA_DEFAULT[0];
    const initialLng = this.longitude ?? SRI_LANKA_DEFAULT[1];

    this.map = L.map(this.pickerMapRef.nativeElement, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    const icon = L.divIcon({
      className: 'picker-marker-icon',
      html: `
        <div style="background-color: #0066FF; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #FFFFFF; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    this.marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon,
    }).addTo(this.map);

    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      const lat = Number(pos.lat.toFixed(6));
      const lng = Number(pos.lng.toFixed(6));
      this.latInput.set(lat);
      this.lngInput.set(lng);
      this.coordinatesChange.emit({ lat, lng });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      this.marker?.setLatLng([lat, lng]);
      this.latInput.set(lat);
      this.lngInput.set(lng);
      this.coordinatesChange.emit({ lat, lng });
    });

    // Invalidate map size after container renders
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);
  }

  onManualCoordinateChange(): void {
    const lat = Number(this.latInput());
    const lng = Number(this.lngInput());
    if (!isNaN(lat) && !isNaN(lng)) {
      this.marker?.setLatLng([lat, lng]);
      this.map?.panTo([lat, lng]);
      this.coordinatesChange.emit({ lat, lng });
    }
  }
}
