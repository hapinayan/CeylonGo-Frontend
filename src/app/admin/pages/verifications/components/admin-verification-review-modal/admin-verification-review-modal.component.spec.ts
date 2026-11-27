import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminVerificationReviewModalComponent } from './admin-verification-review-modal.component';
import { AdminVerificationsService } from '../../../../core/services/admin-verifications.service';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';
import { ProviderVerificationItem } from '../../../../core/models/admin-verifications.models';
import { ProviderDetailResponse } from '../../../../core/models/admin-providers.models';

describe('AdminVerificationReviewModalComponent', () => {
  let component: AdminVerificationReviewModalComponent;
  let fixture: ComponentFixture<AdminVerificationReviewModalComponent>;
  let mockVerificationsService: {
    getVerificationDetails: ReturnType<typeof vi.fn>;
    getDocument: ReturnType<typeof vi.fn>;
    revokeDocumentUrl: ReturnType<typeof vi.fn>;
    approveVerification: ReturnType<typeof vi.fn>;
    rejectVerification: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    currentUser: ReturnType<typeof signal>;
  };

  const mockItem: ProviderVerificationItem = {
    id: 2,
    user_id: 102,
    full_name: 'Mahesh Gunasekara',
    email: 'mahesh.g@example.com',
    business_name: 'Ella Peaks Tour Guiding',
    provider_type: 'tour_guide',
    district: 'Badulla',
    approval_status: 'pending',
    created_at: '2026-03-24T11:30:00Z',
    documents: [
      { type: 'selfie', title: 'Selfie', isAvailable: true },
      { type: 'nic_front', title: 'NIC Front', isAvailable: true },
      { type: 'nic_back', title: 'NIC Back', isAvailable: true },
    ],
  };

  const mockDetails: ProviderDetailResponse = {
    id: 2,
    user_id: 102,
    full_name: 'Mahesh Gunasekara',
    email: 'mahesh.g@example.com',
    business_name: 'Ella Peaks Tour Guiding',
    provider_type: 'tour_guide',
    district: 'Badulla',
    approval_status: 'pending',
    created_at: '2026-03-24T11:30:00Z',
    role: 'provider',
    is_active: false,
    phone: '0712345678',
    identity_document_type: 'nic',
    nic_number: '199023456789',
    permanent_province: 'Uva',
    permanent_district: 'Badulla',
    permanent_city: 'Ella',
    business_province: 'Uva',
    business_district: 'Badulla',
    business_city: 'Ella',
    selfie_uploaded: true,
    nic_front_uploaded: true,
    nic_back_uploaded: true,
  };

  beforeEach(async () => {
    mockVerificationsService = {
      getVerificationDetails: vi.fn().mockReturnValue(of(mockDetails)),
      getDocument: vi.fn().mockReturnValue(of('data:image/svg+xml;utf8,<svg></svg>')),
      revokeDocumentUrl: vi.fn(),
      approveVerification: vi.fn().mockReturnValue(of({ success: true, provider_id: 2, approval_status: 'approved' })),
      rejectVerification: vi.fn().mockReturnValue(of({ success: true, provider_id: 2, approval_status: 'rejected' })),
    };

    mockAuthService = {
      currentUser: signal({
        id: 'admin-1',
        email: 'admin@ceylongo.com',
        name: 'Super Admin',
        role: 'super_admin',
      } as any),
    };

    await TestBed.configureTestingModule({
      imports: [AdminVerificationReviewModalComponent],
      providers: [
        { provide: AdminVerificationsService, useValue: mockVerificationsService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVerificationReviewModalComponent);
    component = fixture.componentInstance;
    component.item = mockItem;
    fixture.detectChanges();
  });

  it('should create modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit both (closed) and (close) events when onClose is triggered', () => {
    const closedSpy = vi.fn();
    const closeSpy = vi.fn();

    component.closed.subscribe(closedSpy);
    component.close.subscribe(closeSpy);

    component.onClose();

    expect(closedSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(mockVerificationsService.revokeDocumentUrl).toHaveBeenCalled();
  });

  it('should trigger onClose on Escape key press when no active confirmation dialog is open', () => {
    const closeSpy = vi.spyOn(component, 'onClose');
    component.activeDialog.set(null);

    component.onEscape();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should cancel active dialog instead of dismissing modal on Escape key press when dialog is open', () => {
    const closeSpy = vi.spyOn(component, 'onClose');
    component.activeDialog.set('reject');

    component.onEscape();

    expect(component.activeDialog()).toBeNull();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should trigger onClose on backdrop click', () => {
    const closeSpy = vi.spyOn(component, 'onClose');
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement;

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: backdrop });
    Object.defineProperty(event, 'currentTarget', { value: backdrop });

    component.onBackdropClick(event);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should display approval banner with date when reviewed_at is present', () => {
    component.item = { ...mockItem, approval_status: 'approved' };
    component.fullDetails.set({
      ...mockDetails,
      approval_status: 'approved',
      reviewed_at: '2026-02-18T10:30:00Z',
      reviewer_name: 'Super Administrator',
    });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.alert-banner.approved');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Identity verification confirmed on');
    expect(banner.textContent).toContain('by Super Administrator');
  });

  it('should display grammatically correct approval banner without missing date text when reviewed_at is null', () => {
    component.item = { ...mockItem, approval_status: 'approved' };
    component.fullDetails.set({
      ...mockDetails,
      approval_status: 'approved',
      reviewed_at: undefined,
      reviewer_name: 'Operations Administrator',
    });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.alert-banner.approved');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Identity verification confirmed by Operations Administrator');
    expect(banner.textContent).not.toContain('confirmed on by');
  });

  it('should switch document tabs and clean up previous document url', () => {
    component.switchDocumentTab('nic_front');
    expect(component.activeDocType()).toBe('nic_front');
    expect(mockVerificationsService.getDocument).toHaveBeenCalledWith(2, 'nic_front');
    expect(mockVerificationsService.revokeDocumentUrl).toHaveBeenCalled();
  });
});
