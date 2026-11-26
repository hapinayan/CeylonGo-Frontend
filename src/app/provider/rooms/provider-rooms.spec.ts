import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderRooms } from './provider-rooms';
import { ProviderService } from '../../core/services/provider.service';
import { ReviewListing, HomestayRoom, AvailabilitySlotResponse } from '../../core/models/provider.models';

describe('ProviderRooms Component', () => {
  let component: ProviderRooms;
  let fixture: ComponentFixture<ProviderRooms>;

  const mockRooms: HomestayRoom[] = [
    {
      id: 11,
      listing_id: 5,
      label: 'Deluxe Ocean View',
      capacity: 2,
      is_active: true,
      room_type: 'Double Bed',
      description: 'Balcony with sea view',
      nightly_price: '12000.00',
      photo_ids: [1, 2],
    },
  ];

  const mockSlots: AvailabilitySlotResponse[] = [
    {
      id: 501,
      unit_id: 11,
      starts_at: '2026-12-24T00:00:00Z',
      ends_at: '2026-12-28T00:00:00Z',
      capacity: 2,
      is_open: false,
    },
  ];

  const mockListings: ReviewListing[] = [
    {
      listing: {
        id: 5,
        provider_id: 1,
        category: 'homestay',
        title: 'Mirissa Coastal Villa',
        description: 'Complete villa',
        district: 'Matara',
        locality: 'Mirissa',
        latitude: '5.949',
        longitude: '80.455',
        price: '12000.00',
        currency: 'LKR',
        approval_status: 'approved',
        is_active: true,
        media: [],
        units: [],
        created_at: '2026-11-20T10:00:00Z',
      },
      verification_status: 'approved',
      submitted_at: '2026-11-21T10:00:00Z',
      decided_at: '2026-11-22T10:00:00Z',
      decision_reason: null,
      details: {},
      homestay_metadata: null,
      rooms: mockRooms,
    },
  ];

  let providerServiceMock: {
    getProviderListings: ReturnType<typeof vi.fn>;
    getAvailabilitySlots: ReturnType<typeof vi.fn>;
    addRoom: ReturnType<typeof vi.fn>;
    addAvailabilitySlot: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerServiceMock = {
      getProviderListings: vi.fn().mockReturnValue(of(mockListings)),
      getAvailabilitySlots: vi.fn().mockReturnValue(of(mockSlots)),
      addRoom: vi.fn().mockReturnValue(
        of({
          id: 12,
          listing_id: 5,
          label: 'Family Suite',
          capacity: 4,
          is_active: true,
          room_type: 'Family Suite',
          description: 'Spacious suite',
          nightly_price: '18000.00',
          photo_ids: [],
        })
      ),
      addAvailabilitySlot: vi.fn().mockReturnValue(
        of({
          id: 502,
          unit_id: 11,
          starts_at: '2026-12-30T00:00:00Z',
          ends_at: '2027-01-02T00:00:00Z',
          capacity: 2,
          is_open: false,
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderRooms],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderRooms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load listings, rooms, and availability slots on init', () => {
    expect(component).toBeTruthy();
    expect(providerServiceMock.getProviderListings).toHaveBeenCalled();
    expect(providerServiceMock.getAvailabilitySlots).toHaveBeenCalledWith(5);
    expect(component.rooms().length).toBe(1);
    expect(component.slots().length).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Rooms & Availability');
    expect(compiled.textContent).toContain('Deluxe Ocean View');
  });

  it('should add a new room using providerService.addRoom', () => {
    component.openAddRoomModal();
    expect(component.isAddRoomModalOpen()).toBe(true);

    component.newRoomLabel = 'Family Suite';
    component.newRoomPrice = '18000.00';
    component.newRoomCapacity = 4;
    component.newRoomType = 'Family Suite';

    component.submitAddRoom();

    expect(providerServiceMock.addRoom).toHaveBeenCalledWith(5, {
      label: 'Family Suite',
      capacity: 4,
      nightly_price: '18000.00',
      room_type: 'Family Suite',
      description: 'Comfortable guest room with ensuite bathroom',
      photo_ids: [],
    });

    expect(component.rooms().length).toBe(2);
    expect(component.isAddRoomModalOpen()).toBe(false);
  });

  it('should block dates for a room using providerService.addAvailabilitySlot', () => {
    const room = component.rooms()[0];
    component.openBlockModal(room);
    expect(component.isBlockModalOpen()).toBe(true);
    expect(component.selectedRoomForBlock).toBe(room);

    component.blockStartDate = '2026-12-30';
    component.blockEndDate = '2027-01-02';

    component.submitBlockDates();

    expect(providerServiceMock.addAvailabilitySlot).toHaveBeenCalled();
    expect(component.slots().length).toBe(2);
    expect(component.isBlockModalOpen()).toBe(false);
  });
});
