import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomestayQuote } from '../../core/models/homestay.models';
import { AuthService } from '../../core/services/auth.service';
import { HomestayService } from '../../core/services/homestay.service';
import { HomestayDetail } from './homestay-detail';

describe('HomestayDetail Component', () => {
  let component: HomestayDetail;
  let fixture: ComponentFixture<HomestayDetail>;
  let homestayService: HomestayService;
  let authService: AuthService;
  let router: Router;

  const mockActivatedRoute = {
    paramMap: of(convertToParamMap({ id: '1' })),
    snapshot: {
      paramMap: convertToParamMap({ id: '1' }),
      queryParamMap: convertToParamMap({}),
    },
  };

  const mockQuote: HomestayQuote = {
    check_in: '2027-01-10',
    check_out: '2027-01-13',
    listing_id: 1,
    nights: 3,
    nightly_rate: '6500.00',
    total_amount: '19500.00',
    currency: 'LKR',
    available_rooms: [
      {
        id: 1,
        label: 'Mountain View Deluxe',
        capacity: 2,
        is_active: true,
      },
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HomestayDetail],
      providers: [
        HomestayService,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomestayDetail);
    component = fixture.componentInstance;
    homestayService = TestBed.inject(HomestayService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    vi.spyOn(homestayService, 'getHomestayById').mockImplementation((id) => {
      return of(homestayService.findDemoHomestayById(id));
    });

    vi.spyOn(homestayService, 'getHomestayAvailability').mockReturnValue(of(mockQuote));

    fixture.detectChanges();
  });

  it('should create the HomestayDetail component', () => {
    expect(component).toBeTruthy();
  });

  it('should load homestay details for valid ID (ID 1: Ella Green View)', () => {
    expect(component.homestay()).toBeTruthy();
    expect(component.homestay()?.id).toBe(1);
    expect(component.homestay()?.name).toContain('Ella Green View');
    expect(component.isNotFound()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.property-title')?.textContent).toContain('Ella Green View');
  });

  it('should display friendly not-found state when homestay is null or non-existent on backend', () => {
    vi.spyOn(homestayService, 'getHomestayById').mockReturnValue(of(null));
    component.loadHomestay('9999');
    fixture.detectChanges();

    expect(component.isNotFound()).toBe(true);
    expect(component.homestay()).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.not-found-state')).toBeTruthy();
    expect(compiled.querySelector('.not-found-title')?.textContent).toContain('Homestay Not Found');
  });

  it('should validate dates and reject past check-in dates', () => {
    component.checkInDate.set('2020-01-01');
    component.checkOutDate.set('2020-01-05');
    component.validateDates();

    expect(component.dateErrorMessage()).toBe('Check-in date cannot be in the past');
    expect(component.canContinueToBooking()).toBe(false);
  });

  it('should validate dates and reject check-out date on or before check-in date', () => {
    const futureDate = '2027-06-10';
    const earlierDate = '2027-06-08';

    component.checkInDate.set(futureDate);
    component.checkOutDate.set(earlierDate);
    component.validateDates();

    expect(component.dateErrorMessage()).toBe('Check-out date must be after check-in date');
    expect(component.canContinueToBooking()).toBe(false);
  });

  it('should accurately calculate night count between check-in and check-out dates', () => {
    component.checkInDate.set('2027-01-10');
    component.checkOutDate.set('2027-01-14');
    fixture.detectChanges();

    expect(component.nightsCount()).toBe(4);
  });

  it('should accurately calculate price based on server quote', () => {
    component.checkInDate.set('2027-01-10');
    component.checkOutDate.set('2027-01-13'); // 3 nights
    component.adultsCount.set(2);
    component.childrenCount.set(0);
    component.quote.set(mockQuote);
    fixture.detectChanges();

    expect(component.nightsCount()).toBe(3);
    expect(component.estimatedTotal()).toBe(19500);
  });

  it('should require an available room selection to enable Continue to Booking', () => {
    component.checkInDate.set('2027-01-10');
    component.checkOutDate.set('2027-01-13');
    component.adultsCount.set(2);
    component.childrenCount.set(0);
    component.validateDates();
    component.validateGuests();

    // With no available rooms
    component.availableRooms.set([]);
    component.selectedUnitId.set(null);
    expect(component.canContinueToBooking()).toBe(false);

    // With available rooms and selected room
    component.quote.set(mockQuote);
    component.availableRooms.set(mockQuote.available_rooms);
    component.selectedUnitId.set(1);
    expect(component.canContinueToBooking()).toBe(true);
  });

  it('should open and navigate photo gallery modal', () => {
    expect(component.isGalleryModalOpen()).toBe(false);

    component.openGallery(0);
    expect(component.isGalleryModalOpen()).toBe(true);
    expect(component.activePhotoIndex()).toBe(0);

    component.nextPhoto();
    expect(component.activePhotoIndex()).toBe(1);

    component.prevPhoto();
    expect(component.activePhotoIndex()).toBe(0);

    component.closeGallery();
    expect(component.isGalleryModalOpen()).toBe(false);
  });

  it('should store booking draft and navigate to /homestays/:id/booking when Continue is clicked', () => {
    component.checkInDate.set('2027-01-10');
    component.checkOutDate.set('2027-01-13');
    component.adultsCount.set(2);
    component.childrenCount.set(0);
    component.quote.set(mockQuote);
    component.availableRooms.set(mockQuote.available_rooms);
    component.selectedUnitId.set(1);
    component.validateDates();
    component.validateGuests();
    fixture.detectChanges();

    expect(component.canContinueToBooking()).toBe(true);

    component.continueToBooking();

    const storedDraft = homestayService.getBookingDraft();
    expect(storedDraft).toBeTruthy();
    expect(storedDraft?.homestayId).toBe(1);
    expect(storedDraft?.nights).toBe(3);
    expect(storedDraft?.selectedUnitId).toBe(1);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/homestays', 1, 'booking'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          check_in: '2027-01-10',
          check_out: '2027-01-13',
          adults: 2,
          children: 0,
          unit_id: 1,
        }),
      })
    );
  });
});
