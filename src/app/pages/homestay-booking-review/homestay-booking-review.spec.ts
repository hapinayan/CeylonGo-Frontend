import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingDraft } from '../../core/models/homestay.models';
import { HomestayService } from '../../core/services/homestay.service';
import { HomestayBookingReview } from './homestay-booking-review';

describe('HomestayBookingReview Component', () => {
  let component: HomestayBookingReview;
  let fixture: ComponentFixture<HomestayBookingReview>;
  let homestayService: HomestayService;
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
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: convertToParamMap({ id: '1' }),
      queryParamMap: convertToParamMap({
        check_in: '2027-02-10',
        check_out: '2027-02-13',
        adults: '2',
        children: '1',
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
    router = TestBed.inject(Router);

    vi.spyOn(homestayService, 'getHomestayById').mockImplementation((id) => {
      return of(homestayService.findDemoHomestayById(id));
    });

    // Pre-populate service booking draft
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

  it('should restore booking state from route query parameters if sessionStorage draft is missing', async () => {
    homestayService.clearBookingDraft();

    // Re-create component with empty service draft
    const newFixture = TestBed.createComponent(HomestayBookingReview);
    const newComp = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComp.draft()).toBeTruthy();
    expect(newComp.draft()?.homestayId).toBe(1);
    expect(newComp.draft()?.checkIn).toBe('2027-02-10');
    expect(newComp.draft()?.checkOut).toBe('2027-02-13');
    expect(newComp.draft()?.totalGuests).toBe(3);
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
        }),
      })
    );
  });

  it('should validate traveler inputs before confirming simulated reservation', () => {
    component.travelerName.set('');
    component.confirmReservation();
    expect(component.isConfirmed()).toBe(false);

    component.travelerName.set('Alex Morgan');
    component.travelerEmail.set('');
    component.confirmReservation();
    expect(component.isConfirmed()).toBe(false);
  });

  it('should simulate booking confirmation and display reference code when valid', () => {
    component.travelerName.set('Jane Doe');
    component.travelerEmail.set('jane@example.com');
    component.confirmReservation();
    fixture.detectChanges();

    expect(component.isConfirmed()).toBe(true);
    expect(component.confirmationData()).toBeTruthy();
    expect(component.confirmationData()?.bookingReference).toMatch(/^CG-HS-1-\d{4}$/);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.confirmation-success-card')).toBeTruthy();
    expect(compiled.querySelector('.code-val')?.textContent).toContain('CG-HS-1-');
    expect(compiled.querySelector('.success-title')?.textContent).toContain('Your Stay is Requested!');
  });
});
