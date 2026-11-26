import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomestayWizard } from './homestay-wizard';
import { ProviderService } from '../../../core/services/provider.service';

describe('HomestayWizard Component', () => {
  let component: HomestayWizard;
  let fixture: ComponentFixture<HomestayWizard>;
  let providerServiceMock: {
    getDraft: ReturnType<typeof vi.fn>;
    saveDraft: ReturnType<typeof vi.fn>;
    clearDraft: ReturnType<typeof vi.fn>;
    createDraftListing: ReturnType<typeof vi.fn>;
    updateListingDraft: ReturnType<typeof vi.fn>;
    submitListing: ReturnType<typeof vi.fn>;
    uploadPhoto: ReturnType<typeof vi.fn>;
    setCoverPhoto: ReturnType<typeof vi.fn>;
    deletePhoto: ReturnType<typeof vi.fn>;
    addRoom: ReturnType<typeof vi.fn>;
    saveEvidence: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerServiceMock = {
      getDraft: vi.fn().mockReturnValue(null),
      saveDraft: vi.fn(),
      clearDraft: vi.fn(),
      createDraftListing: vi.fn().mockReturnValue(
        of({
          listing: { id: 202, category: 'homestay' },
          verification_status: 'draft',
        })
      ),
      updateListingDraft: vi.fn().mockReturnValue(of({ success: true })),
      submitListing: vi.fn().mockReturnValue(
        of({
          listing: { id: 202 },
          verification_status: 'pending',
        })
      ),
      uploadPhoto: vi.fn().mockReturnValue(
        of({
          id: 5,
          storage_key: 'photo.jpg',
          sort_order: 0,
        })
      ),
      setCoverPhoto: vi.fn().mockReturnValue(of({})),
      deletePhoto: vi.fn().mockReturnValue(of({})),
      addRoom: vi.fn().mockReturnValue(of({ id: 1 })),
      saveEvidence: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [HomestayWizard],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomestayWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize at Step 1 and create backend draft', () => {
    expect(component.currentStep()).toBe(1);
    expect(providerServiceMock.createDraftListing).toHaveBeenCalledWith('homestay');
    expect(component.listingId()).toBe(202);
  });

  it('should advance through steps and save drafts', () => {
    component.title = 'Ella Green View Homestay';
    component.nextStep();
    expect(component.currentStep()).toBe(2);
    expect(providerServiceMock.saveDraft).toHaveBeenCalled();
  });

  it('should prevent submission without agreeing to declaration', () => {
    component.declarationAgreed = false;
    component.title = 'Test Homestay';
    component.submitListing();
    expect(component.errorMessage()).toContain('Please agree to the host verification declaration');
    expect(providerServiceMock.submitListing).not.toHaveBeenCalled();
  });

  it('should submit listing when valid and declaration agreed', () => {
    component.title = 'Ella Heritage Villa';
    component.description = 'Lovely retreat';
    component.declarationAgreed = true;
    component.submitListing();

    expect(providerServiceMock.updateListingDraft).toHaveBeenCalled();
    expect(providerServiceMock.submitListing).toHaveBeenCalledWith(202);
    expect(component.submitSuccess()).toBe(true);
    expect(component.submittedListingId()).toBe(202);
  });
});
