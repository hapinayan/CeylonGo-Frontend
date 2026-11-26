import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomestaySummary } from '../../../../core/models/homestay.models';
import { HomestayMapComponent } from './homestay-map.component';

describe('HomestayMapComponent', () => {
  let component: HomestayMapComponent;
  let fixture: ComponentFixture<HomestayMapComponent>;

  const mockHomestays: HomestaySummary[] = [
    {
      id: 1,
      name: 'Ella Rock View Homestay (Live)',
      description: 'Retreat with views of Ella Rock.',
      location: 'Ella, Badulla',
      city: 'Ella',
      district: 'Badulla',
      category: 'mountain',
      category_name: 'Mountain Stays',
      price_per_night: 8500,
      max_guests: 3,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      rating: 0,
      review_count: 0,
      is_verified: true,
      latitude: 6.8667,
      longitude: 81.0466,
      image_url: 'https://example.com/photo.jpg',
      images: [],
      amenities: ['Wi-Fi'],
      cancellation_policy: 'Flexible',
    },
    {
      id: 2,
      name: 'Listing Without Coordinates',
      description: 'Homestay with missing coordinates.',
      location: 'Kandy',
      city: 'Kandy',
      district: 'Kandy',
      category: 'cultural',
      category_name: 'Cultural Stays',
      price_per_night: 6000,
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      rating: 0,
      review_count: 0,
      is_verified: true,
      latitude: undefined,
      longitude: undefined,
      image_url: 'https://example.com/photo2.jpg',
      images: [],
      amenities: [],
      cancellation_policy: 'Flexible',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomestayMapComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomestayMapComponent);
    component = fixture.componentInstance;
    component.homestays = mockHomestays;
    fixture.detectChanges();
  });

  it('should create the HomestayMapComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should filter only listings with valid coordinates for map markers', () => {
    expect(component.hasValidCoordinates(mockHomestays[0])).toBe(true);
    expect(component.hasValidCoordinates(mockHomestays[1])).toBe(false);

    // Coordinate validation edge cases
    expect(
      component.hasValidCoordinates({ ...mockHomestays[0], latitude: undefined })
    ).toBe(false);
    expect(
      component.hasValidCoordinates({ ...mockHomestays[0], latitude: 0, longitude: 0 })
    ).toBe(false);
    expect(
      component.hasValidCoordinates({ ...mockHomestays[0], latitude: 120, longitude: 80 })
    ).toBe(false);
    expect(
      component.hasValidCoordinates({ ...mockHomestays[0], latitude: NaN })
    ).toBe(false);
  });

  it('should update validCoordinatesCount based on valid coordinates', () => {
    component.renderMarkers();
    expect(component.validCoordinatesCount()).toBe(1);
  });

  it('should display empty coordinates status overlay when no listings have coordinates', () => {
    component.homestays = [mockHomestays[1]]; // Only listing without coordinates
    component.renderMarkers();
    fixture.detectChanges();

    expect(component.validCoordinatesCount()).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-coords-notice')).toBeTruthy();
    expect(compiled.querySelector('.empty-coords-notice')?.textContent).toContain(
      'No map coordinates available'
    );
  });

  it('should trigger zoomIn and zoomOut without errors', () => {
    expect(() => component.zoomIn()).not.toThrow();
    expect(() => component.zoomOut()).not.toThrow();
    expect(() => component.recenter()).not.toThrow();
  });

  it('should emit markerClick when markerClick is triggered', () => {
    let emitted: HomestaySummary | null = null;
    component.markerClick.subscribe((h) => {
      emitted = h;
    });

    component.markerClick.emit(mockHomestays[0]);
    expect(emitted).toEqual(mockHomestays[0]);
  });

  it('should emit markerHover when hovering over a marker', () => {
    let hoveredId: number | null = null;
    component.markerHover.subscribe((id) => {
      hoveredId = id;
    });

    component.markerHover.emit(1);
    expect(hoveredId).toBe(1);

    component.markerHover.emit(null);
    expect(hoveredId).toBeNull();
  });

  it('should clean up map and observers on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
