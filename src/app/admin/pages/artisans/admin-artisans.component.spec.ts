import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminArtisanBusinessKPIs,
  AdminArtisanListingItem,
} from '../../core/models/admin-artisans.models';
import { AdminArtisansService } from '../../core/services/admin-artisans.service';
import { AdminArtisansComponent } from './admin-artisans.component';

describe('AdminArtisansComponent', () => {
  let component: AdminArtisansComponent;
  let fixture: ComponentFixture<AdminArtisansComponent>;

  const mockListings: AdminArtisanListingItem[] = [
    {
      id: 1,
      provider_profile_id: 201,
      title: 'Kandy Brass & Copper Artisans Cooperative',
      craft_category: 'handicrafts',
      district: 'Kandy',
      province: 'Central',
      city: 'Pilimathalawa',
      is_active: true,
      is_verified: true,
      is_featured: true,
      approval_status: 'approved',
      verification_status: 'verified',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
      provider_business_name: 'Pilimathalawa Heritage Craft Guild',
      phone: '0812345670',
      email: 'kandybrass@artisan.ceylongo.lk',
      description: 'Generational brassware artisans.',
      products_count: 6,
    },
  ];

  const mockKPIs: AdminArtisanBusinessKPIs = {
    total_businesses: 8,
    approved_count: 4,
    pending_count: 2,
    rejected_count: 1,
    suspended_count: 1,
    verified_count: 4,
    featured_count: 2,
  };

  const mockService = {
    canViewArtisans: signal(true),
    canReviewArtisans: signal(true),
    canModerateReviews: signal(true),
    getArtisanListings: vi.fn().mockReturnValue(of(mockListings)),
    getArtisanListingById: vi.fn().mockReturnValue(of(mockListings[0])),
    getArtisanKPIs: vi.fn().mockReturnValue(of(mockKPIs)),
    getShowcaseProducts: vi.fn().mockReturnValue(of([])),
    getReviews: vi.fn().mockReturnValue(of([])),
    approveListing: vi.fn().mockReturnValue(of({ success: true, id: 1, message: 'Approved' })),
    rejectListing: vi.fn().mockReturnValue(of({ success: true, id: 1, message: 'Rejected' })),
    suspendListing: vi.fn().mockReturnValue(of({ success: true, id: 1, message: 'Suspended' })),
    featureListing: vi.fn().mockReturnValue(of({ success: true, id: 1, message: 'Featured' })),
    approveProduct: vi.fn().mockReturnValue(of({ success: true, id: 101, message: 'Product approved' })),
    rejectProduct: vi.fn().mockReturnValue(of({ success: true, id: 101, message: 'Product rejected' })),
    moderateReview: vi.fn().mockReturnValue(of({ success: true, review_id: 1, message: 'Moderated' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminArtisansComponent],
      providers: [
        provideRouter([]),
        { provide: AdminArtisansService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminArtisansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load artisan listings', () => {
    expect(component).toBeTruthy();
    expect(component.listings.length).toBe(1);
    expect(component.kpis.total_businesses).toBe(8);
  });

  it('should filter by craft category', () => {
    component.onCategoryChange('handicrafts');
    expect(component.selectedCategory).toBe('handicrafts');
    expect(mockService.getArtisanListings).toHaveBeenCalled();
  });

  it('should open and close inspection detail modal', () => {
    component.openDetail(1);
    expect(mockService.getArtisanListingById).toHaveBeenCalledWith(1);
    expect(component.selectedListing).toBeTruthy();

    component.closeDetail();
    expect(component.selectedListing).toBeNull();
  });

  it('should open and close reject dialog', () => {
    component.openRejectDialog(1, 'reject');
    expect(component.isRejectDialogOpen).toBe(true);
    expect(component.targetListingId).toBe(1);

    component.closeRejectDialog();
    expect(component.isRejectDialogOpen).toBe(false);
  });

  it('should toggle feature status on listing', () => {
    component.selectedListing = mockListings[0];
    component.toggleFeature({ id: 1, isFeatured: false });
    expect(mockService.featureListing).toHaveBeenCalledWith(1, false);
  });
});
