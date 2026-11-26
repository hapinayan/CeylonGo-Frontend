import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { ActivityBookingDetailResponse, ActivityPaymentResponse } from '../models/activity';

@Component({
  selector: 'app-experience-payment-status',
  imports: [DatePipe, DecimalPipe],
  template: `
    <section class="workflow-card payment-status-card" aria-label="Payment details">
      <div class="card-header-row">
        <h2>Payment information</h2>
        <span class="payment-sim-badge">Academic MVP</span>
      </div>

      <div class="payment-summary-box">
        <div class="payment-amount-line">
          <span class="amount-val">{{ booking().currency }} {{ booking().total_amount | number:'1.2-2' }}</span>
          <span class="method-tag">{{ methodLabel() }}</span>
        </div>

        <div class="workflow-statuses">
          <span class="workflow-pill" [attr.data-status]="booking().status">
            Booking: {{ booking().status }}
          </span>
          <span class="workflow-pill" [attr.data-status]="paymentStatus()">
            Payment: {{ paymentStatus().replaceAll('_', ' ') }}
          </span>
        </div>

        @if (latestPayment(); as pay) {
          <p class="trans-ref-note">
            Payment reference: {{ pay.request_key }} · Attempt #{{ pay.attempt_no }}
          </p>
          @if (pay.resolved_at) {
            <p class="paid-time-note">
              Recorded time: {{ pay.resolved_at | date:'medium':'GMT+0530' }} (Sri Lanka time)
            </p>
          }
        } @else {
          <p class="pending-note">No payment selection has been recorded yet for this booking.</p>
        }

        <div class="pay-location-box">
          <p>
            <strong>Academic MVP Payment Notice:</strong>
            @if (latestPayment()?.method === 'simulated') {
              This booking uses <em>Academic Demo Online Payment</em> (simulated transaction, no real charges).
            } @else {
              For <em>Pay at Location</em>, payment remains unpaid until paid in person upon arrival.
            }
          </p>
        </div>
      </div>

      <div class="workflow-actions">
        <button class="outline-control" type="button" (click)="refreshRequest.emit()" [disabled]="refreshing()">
          {{ refreshing() ? 'Refreshing…' : 'Refresh booking status' }}
        </button>
      </div>
    </section>
  `,
})
export class ExperiencePaymentStatus {
  readonly booking = input.required<ActivityBookingDetailResponse>();
  readonly refreshing = input(false);
  readonly refreshRequest = output<void>();

  readonly latestPayment = computed<ActivityPaymentResponse | null>(() => {
    const payments = this.booking().payments;
    if (!payments?.length) return null;
    return [...payments].sort((a, b) => b.attempt_no - a.attempt_no || b.id - a.id)[0];
  });

  readonly paymentStatus = computed(() => this.latestPayment()?.status ?? 'unpaid');

  readonly methodLabel = computed(() => {
    const method = this.latestPayment()?.method;
    if (method === 'simulated') return 'Academic Demo Online Payment';
    if (method === 'at_location') return 'Pay at Location';
    return 'Not selected';
  });
}
