import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BookingDraft,
  HomestayBookingDetails,
  PaymentResponse,
} from '../../core/models/homestay.models';
import { AuthService } from '../../core/services/auth.service';
import { HomestayService } from '../../core/services/homestay.service';
import { HomestayBookingReview } from './homestay-booking-review';

describe('HomestayBookingReview Component', () => {
  let component: HomestayBookingReview;
  let fixture: ComponentFixture<HomestayBookingReview>;
  let homestayService: HomestayService;
  let authService: AuthService;
  let router: Router;

  const mockDraft: BookingDraft = {
    homestayId: 1,
    homestayName: 'Ella Green View Homestay',
    homestayLocation: 'Ella, Badulla',
    homestayImage: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&auto=format&fit=crop&q=80',
    nightlyRate: 6500,
    checkIn: '2027-02-10',
    checkOut: '2027-02-13',
    adults: 2,
    children: 1,
    totalGuests: 3,
    nights: 3,
    basePrice: 19500,
    estimatedTotal: 19500,
    selectedUnitId: 1,
    selectedUnitLabel: 'Deluxe Suite',
    selectedUnitCapacity: 3,
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: convertToParamMap({ id: '1' }),
      queryParamMap: convertToParamMap({
        check_in: '2027-02-10',
        check_out: '2027-02-13',
        adults: '2',
        children: '1',
        unit_id: '1',
      }),
    },
  };

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HomestayBookingReview],
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

    fixture = TestBed.createComponent(HomestayBookingReview);
    component = fixture.componentInstance;
    homestayService = TestBed.inject(HomestayService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    vi.spyOn(homestayService, 'getHomestayById').mockImplementation((id) => {
      return of(homestayService.findDemoHomestayById(id));
    });

    homestayService.setBookingDraft(mockDraft);

    fixture.detectChanges();
  });

  it('should create the HomestayBookingReview component', () => {
    expect(component).toBeTruthy();
  });

  it('should display selected homestay, dates, guests, and estimated total from booking draft', () => {
    expect(component.homestay()?.id).toBe(1);
    expect(component.draft()?.homestayName).toBe('Ella Green View Homestay');
    expect(component.draft()?.nights).toBe(3);
    expect(component.draft()?.totalGuests).toBe(3);
    expect(component.draft()?.estimatedTotal).toBe(19500);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.preview-name')?.textContent).toContain('Ella Green View');
    expect(compiled.querySelector('.total-val')?.textContent).toContain('19,500');
  });

  it('should navigate back to homestay details with preserved query params when Edit Details is clicked', () => {
    component.editBookingDetails();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/homestays', 1],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          check_in: '2027-02-10',
          check_out: '2027-02-13',
          adults: 2,
          children: 1,
          unit_id: 1,
        }),
      })
    );
  });

  it('should validate traveler inputs before submitting booking request', () => {
    component.travelerName.set('');
    component.confirmReservation();
    expect(component.isConfirmed()).toBe(false);

    component.travelerName.set('Alex Morgan');
    component.travelerEmail.set('');
    component.confirmReservation();
    expect(component.isConfirmed()).toBe(false);
  });

  it('should submit booking request and pay at location with real backend APIs', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    const mockBookingResponse: HomestayBookingDetails = {
      id: 101,
      listing_id: 1,
      traveler_id: 5,
      request_key: 'req-key-1',
      starts_at: '2027-02-10T14:00:00Z',
      ends_at: '2027-02-13T11:00:00Z',
      quantity: 1,
      total_amount: '19500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: new Date().toISOString(),
      room_ids: [1],
      payments: [],
    };

    const mockPayResponse: PaymentResponse = {
      id: 501,
      booking_id: 101,
      request_key: 'pay-key-1',
      attempt_no: 1,
      method: 'at_location',
      status: 'unpaid',
      display_amount: '19500.00',
      currency: 'LKR',
      created_at: new Date().toISOString(),
    };

    vi.spyOn(homestayService, 'createHomestayBooking').mockReturnValue(of(mockBookingResponse));
    vi.spyOn(homestayService, 'payAtLocation').mockReturnValue(of(mockPayResponse));
    vi.spyOn(homestayService, 'getHomestayBooking').mockReturnValue(of(mockBookingResponse));

    component.selectPaymentMethod('at_location');
    component.travelerName.set('Jane Doe');
    component.travelerEmail.set('jane@example.com');
    component.confirmReservation();
    fixture.detectChanges();

    expect(component.isConfirmed()).toBe(true);
    expect(component.confirmationData()).toBeTruthy();
    expect(component.confirmationData()?.bookingReference).toBe('CG-HS-101');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.confirmation-success-card')).toBeTruthy();
    expect(compiled.querySelector('.code-val')?.textContent).toContain('CG-HS-101');
    expect(compiled.querySelector('.success-title')?.textContent).toContain('Booking Request Submitted!');
    expect(compiled.querySelector('.confirmation-badge')?.textContent).toContain('AWAITING HOST CONFIRMATION');
  });

  it('should handle academic demo payment simulation with demo_succeeded outcome', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    const mockBookingResponse: HomestayBookingDetails = {
      id: 102,
      listing_id: 1,
      traveler_id: 5,
      request_key: 'req-key-2',
      starts_at: '2027-02-10T14:00:00Z',
      ends_at: '2027-02-13T11:00:00Z',
      quantity: 1,
      total_amount: '19500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: new Date().toISOString(),
      room_ids: [1],
      payments: [],
    };

    const mockSimPayment: PaymentResponse = {
      id: 502,
      booking_id: 102,
      request_key: 'sim-key-2',
      attempt_no: 1,
      method: 'academic_demo',
      status: 'demo_succeeded',
      display_amount: '19500.00',
      currency: 'LKR',
      created_at: new Date().toISOString(),
    };

    vi.spyOn(homestayService, 'createHomestayBooking').mockReturnValue(of(mockBookingResponse));
    vi.spyOn(homestayService, 'simulatePayment').mockReturnValue(of(mockSimPayment));
    vi.spyOn(homestayService, 'getHomestayBooking').mockReturnValue(of(mockBookingResponse));

    component.selectPaymentMethod('online');
    component.setSimulateOutcome('success');
    component.travelerName.set('Jane Doe');
    component.travelerEmail.set('jane@example.com');
    component.confirmReservation();
    fixture.detectChanges();

    expect(component.isConfirmed()).toBe(true);
    expect(component.confirmationData()?.paymentStatus).toBe('demo_succeeded');
  });
});
