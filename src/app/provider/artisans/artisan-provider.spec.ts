import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderService } from '../../core/services/provider.service';
import { ArtisanProductDetails, ReviewListing } from '../../core/models/provider.models';
import { ProviderPreviewService } from '../provider-preview.service';
import { ArtisanWizard } from './wizard/artisan-wizard';
import { ArtisanProducts } from './products/artisan-products';

const sampleProduct: ArtisanProductDetails = {
  id: 88,
  artisan_listing_id: 701,
  listing_title: 'Kandy Brass Studio',
  title: 'Traditional Oil Lamp',
  category: 'Handicrafts',
  description: 'Cast brass traditional Sri Lankan oil lamp.',
  materials: 'Brass',
  price: 4500,
  currency: 'LKR',
  item_type: 'product',
  image_url: null,
  is_available: true,
  is_active: true,
  approval_status: 'draft',
  images: [],
  product_images: [],
  created_at: '2026-11-26T10:00:00Z',
  updated_at: '2026-11-26T10:00:00Z',
};

const sampleArtisanReview: ReviewListing = {
  listing: {
    id: 701,
    provider_id: 9,
    category: 'artisan',
    title: 'Kandy Brass Studio',
    description: 'Traditional hand-cast brass lamps and bowls.',
    district: 'Kandy',
    locality: 'Pilimathalawa',
    latitude: '7.266000',
    longitude: '80.533000',
    price: '3500.00',
    currency: 'LKR',
    approval_status: 'draft',
    is_active: false,
    media: [],
    units: [],
    created_at: '2026-11-26T10:00:00Z',
  },
  verification_status: 'draft',
  submitted_at: null,
  decided_at: null,
  decision_reason: null,
  details: {
    province: 'Central',
    address: 'No. 14, Colombo Road, Pilimathalawa',
    artisan: {
      craft_category: 'Handicrafts',
      business_type: 'Artisan Workshop',
      business_background: 'Third-generation brass foundry',
      artisan_information: 'Led by master brass artisan Kamal.',
      phone: '+94 81 234 5678',
      whatsapp_number: '+94771234567',
      email: 'studio@kandybrass.lk',
      website_url: 'https://kandybrass.lk',
      opening_hours: 'Mon-Sat 09:00-17:30',
    },
    products: [sampleProduct],
    links: [{ kind: 'maps', url: 'https://maps.google.com/' }],
    notes: 'Workshop registration certificate attached.',
    files: [],
  },
  homestay_metadata: null,
  rooms: [],
};

describe('Artisan Provider Wizard & Products', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates and resumes an Artisan draft with structured artisan payload and dedicated showcase products', async () => {
    const providerMock = {
      createDraftListing: vi.fn().mockReturnValue(of(sampleArtisanReview)),
      updateListingDraft: vi.fn().mockReturnValue(of(sampleArtisanReview)),
      saveEvidence: vi.fn().mockReturnValue(of(sampleArtisanReview)),
      getProviderListing: vi.fn().mockReturnValue(of(sampleArtisanReview)),
      submitListing: vi.fn().mockReturnValue(of({ ...sampleArtisanReview, verification_status: 'pending' })),
      getPhotoBlob: vi.fn().mockReturnValue(of(new Blob())),
      getArtisanProducts: vi.fn().mockReturnValue(of({ items: [sampleProduct], total: 1, page: 1, page_size: 50, total_pages: 1 })),
      createArtisanProduct: vi.fn().mockReturnValue(of({ ...sampleProduct, id: 99, title: 'Clay Pot' })),
      updateArtisanProduct: vi.fn().mockReturnValue(of(sampleProduct)),
    };

    await TestBed.configureTestingModule({
      imports: [ArtisanWizard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProviderService, useValue: providerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => (k === 'id' ? '701' : null) },
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ArtisanWizard);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.isEditMode()).toBe(true);
    expect(comp.listingId()).toBe(701);
    expect(comp.title).toBe('Kandy Brass Studio');
    expect(comp.whatsapp).toBe('+94771234567');
    expect(comp.showcaseItems().length).toBe(1);

    await comp.saveDraft();
    expect(providerMock.createDraftListing).not.toHaveBeenCalled();
    expect(providerMock.updateListingDraft).toHaveBeenCalledWith(
      701,
      expect.objectContaining({
        category: 'artisan',
        district: 'Kandy',
        artisan: expect.objectContaining({
          craft_category: 'Handicrafts',
          whatsapp_number: '+94771234567',
        }),
      }),
    );

    comp.newProductName = 'Clay Pot';
    comp.newProductDescription = 'Hand-thrown clay pot.';
    await comp.addOrSaveProduct();
    expect(providerMock.createArtisanProduct).toHaveBeenCalledWith(
      701,
      expect.objectContaining({ title: 'Clay Pot', is_active: true }),
    );
  });

  it('isolates preview mode in ArtisanWizard and blocks uploads/submissions', async () => {
    await TestBed.configureTestingModule({
      imports: [ArtisanWizard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: (k: string) => (k === 'preview' ? 'true' : null) },
            },
          },
        },
      ],
    }).compileComponents();

    const preview = TestBed.inject(ProviderPreviewService);
    const fixture = TestBed.createComponent(ArtisanWizard);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(preview.isPreview()).toBe(true);
    comp.submitListing();
    expect(comp.errorBanner()).toContain('Preview Mode');
  });

  it('loads Artisan showcase products and creates/updates via dedicated /provider/listings/{id}/products endpoints', async () => {
    const createdProduct: ArtisanProductDetails = {
      ...sampleProduct,
      id: 92,
      title: 'Brass Oil Lamp',
      description: 'Hand-cast traditional brass oil lamp.',
    };
    const deactivatedProduct: ArtisanProductDetails = {
      ...sampleProduct,
      is_available: false,
      is_active: false,
    };

    const providerMock = {
      getProviderListings: vi.fn().mockReturnValue(of([sampleArtisanReview])),
      getArtisanProducts: vi.fn().mockReturnValue(
        of({ items: [sampleProduct], total: 1, page: 1, page_size: 50, total_pages: 1 }),
      ),
      createArtisanProduct: vi.fn().mockReturnValue(of(createdProduct)),
      updateArtisanProduct: vi.fn().mockReturnValue(of(deactivatedProduct)),
      deleteArtisanProduct: vi.fn().mockReturnValue(of(void 0)),
      getArtisanProductPhotoBlob: vi.fn().mockReturnValue(of(new Blob())),
    };

    await TestBed.configureTestingModule({
      imports: [ArtisanProducts],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProviderService, useValue: providerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (k: string) => (k === 'listingId' ? '701' : null) },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ArtisanProducts);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.selectedListingId()).toBe(701);
    expect(comp.products().length).toBe(1);

    comp.newProductName = 'Brass Oil Lamp';
    comp.newProductDescription = 'Hand-cast traditional brass oil lamp.';
    comp.addProduct();
    expect(providerMock.createArtisanProduct).toHaveBeenCalledWith(
      701,
      expect.objectContaining({
        title: 'Brass Oil Lamp',
        category: 'Handicrafts',
        is_active: true,
      }),
    );
    expect(comp.products().length).toBe(2);

    comp.toggleProductActive(comp.products()[0]);
    expect(providerMock.updateArtisanProduct).toHaveBeenCalledWith(
      701,
      88,
      expect.objectContaining({ title: 'Traditional Oil Lamp', is_active: false }),
    );
  });
});
