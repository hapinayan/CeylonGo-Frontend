import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminFinancialSummaryResponse,
  AdminPaymentTransactionItem,
} from '../../core/models/admin-payments.models';
import { AdminPaymentsService } from '../../core/services/admin-payments.service';
import { AdminPaymentsComponent } from './admin-payments.component';

describe('AdminPaymentsComponent', () => {
  let component: AdminPaymentsComponent;
  let fixture: ComponentFixture<AdminPaymentsComponent>;

  const mockSummary: AdminFinancialSummaryResponse = {
    total_gross_booking_revenue: 1000000,
    total_ceylongo_commission: 100000,
    total_provider_liabilities: 850000,
    total_verified_refunds: 15000,
    total_settled_payouts: 700000,
    pending_settlement_payouts: 150000,
    total_advertising_revenue: 20000,
    currency: 'LKR',
  };

  const mockPayment: AdminPaymentTransactionItem = {
    id: 1,
    transaction_reference: 'TX-2026-8801',
    booking_reference: 'BK-TG-2026-101',
    category: 'tour_guide',
    traveler_id: 501,
    traveler_name: 'Oliver Schmidt',
    provider_id: 101,
    provider_name: 'Ceylon Heritage Explorers',
    amount: 15000,
    commission_amount: 1500,
    net_provider_amount: 13500,
    currency: 'LKR',
    payment_method: 'credit_card',
    payment_status: 'captured',
    refund_status: 'none',
    created_at: '2026-03-24T14:35:00Z',
  };

  const mockService = {
    canViewPayments: () => true,
    canManageFinances: () => true,
    getFinancialSummary: vi.fn().mockReturnValue(of(mockSummary)),
    getPayments: vi.fn().mockReturnValue(
      of({ items: [mockPayment], total: 1, page: 1, page_size: 20, total_pages: 1 })
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPaymentsComponent],
      providers: [{ provide: AdminPaymentsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load payments data on init', () => {
    expect(component).toBeTruthy();
    expect(component.payments.length).toBe(1);
    expect(component.summary.total_gross_booking_revenue).toBe(1000000);
  });

  it('should filter by category and status', () => {
    component.onCategoryChange('tour_guide');
    expect(component.selectedCategory).toBe('tour_guide');
    expect(mockService.getPayments).toHaveBeenCalled();

    component.onStatusChange('captured');
    expect(component.selectedStatus).toBe('captured');
  });

  it('should open and close payment detail modal', () => {
    component.openDetail(mockPayment);
    expect(component.selectedPayment).toBeTruthy();

    component.closeDetail();
    expect(component.selectedPayment).toBeNull();
  });
});
