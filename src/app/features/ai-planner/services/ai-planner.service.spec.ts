import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import {
  buildNaturalLanguageTripPrompt,
  formatBookingStatusMessage,
  getServiceCategoryLabel,
  getServiceDetailRoute,
  parseSafeAiTextBlocks,
} from '../models/ai-planner.models';
import {
  AiPlannerService,
  formatAiPlannerError,
  makeIdempotencyKey,
  resolveAiMediaUrl,
} from './ai-planner.service';

describe('AiPlannerService & AI Planner Domain Helpers', () => {
  let service: AiPlannerService;
  let httpMock: HttpTestingController;
  const apiBase = environment.apiBaseUrl;

  const currentUserSig = signal<User | null>({
    id: 501,
    full_name: 'Hapinayan Perera',
    email: 'hapinayan017@gmail.com',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
  });

  const authServiceMock = {
    isAuthenticated: vi.fn(() => true),
    currentUser: currentUserSig,
    getToken: vi.fn<() => string | null>(() => 'traveler-jwt-token'),
  };

  beforeEach(() => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue('traveler-jwt-token');
    currentUserSig.set({
      id: 501,
      full_name: 'Hapinayan Perera',
      email: 'hapinayan017@gmail.com',
      role: 'traveler',
      is_active: true,
      created_at: '2026-11-20T10:00:00Z',
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(AiPlannerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('rejects unauthenticated or provider/admin tokens before calling protected endpoints', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    let caught: unknown;
    service.listConversations().subscribe({ error: (err) => (caught = err) });
    expect(formatAiPlannerError(caught).code).toBe('auth');

    authServiceMock.isAuthenticated.mockReturnValue(true);
    currentUserSig.set({
      id: 99,
      full_name: 'Host User',
      email: 'host@example.com',
      role: 'provider',
      is_active: true,
      created_at: '2026-11-20T10:00:00Z',
    });
    let providerErr: unknown;
    service.createConversation('Host Test').subscribe({ error: (err) => (providerErr = err) });
    expect(formatAiPlannerError(providerErr).code).toBe('forbidden');
    expect(service.hasTravelerSession()).toBe(false);
  });

  it('calls conversation CRUD & message turn endpoints under /api/v1/ai/planner/conversations', () => {
    service.listConversations(20, 0).subscribe();
    const listReq = httpMock.expectOne(
      `${apiBase}/ai/planner/conversations?limit=20&offset=0`,
    );
    expect(listReq.request.method).toBe('GET');
    expect(listReq.request.headers.get('Authorization')).toBe('Bearer traveler-jwt-token');
    listReq.flush([]);

    service.createConversation('Kandy 3 Days').subscribe();
    const createReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ title: 'Kandy 3 Days' });
    createReq.flush({ id: 7, title: 'Kandy 3 Days', created_at: '2026-11-27T00:00:00Z', updated_at: '2026-11-27T00:00:00Z' });

    service.getConversation(7).subscribe();
    const getReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations/7`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ id: 7, title: 'Kandy 3 Days', created_at: '2026-11-27T00:00:00Z', updated_at: '2026-11-27T00:00:00Z' });

    service.renameConversation(7, 'Kandy Heritage Escape').subscribe();
    const patchReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations/7`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ title: 'Kandy Heritage Escape' });
    patchReq.flush({ id: 7, title: 'Kandy Heritage Escape', created_at: '2026-11-27T00:00:00Z', updated_at: '2026-11-27T00:05:00Z' });

    service.getMessages(7, 50, 99).subscribe();
    const msgListReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations/7/messages?limit=50&before_id=99`);
    expect(msgListReq.request.method).toBe('GET');
    msgListReq.flush([]);

    service.sendMessage(7, 'Plan a 3-day cultural trip to Kandy').subscribe();
    const sendReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations/7/messages`);
    expect(sendReq.request.method).toBe('POST');
    expect(sendReq.request.body).toEqual({ text: 'Plan a 3-day cultural trip to Kandy' });
    sendReq.flush({
      id: 10,
      user_message: 'Plan a 3-day cultural trip to Kandy',
      assistant_message: 'Here is your plan.',
      listings: [],
      quotes: [],
      bookings: [],
      created_at: '2026-11-27T00:06:00Z',
    });

    service.deleteConversation(7).subscribe();
    const delReq = httpMock.expectOne(`${apiBase}/ai/planner/conversations/7`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });

  it('calls booking-quotes, bookings/confirm, payments/simulate, payments/at-location, and trips CRUD', () => {
    service.requestBookingQuote({
      listing_id: 12,
      quantity: 1,
      starts_at: '2026-12-10T14:00:00Z',
      ends_at: '2026-12-12T11:00:00Z',
      room_id: 4,
    }).subscribe();
    const quoteReq = httpMock.expectOne(`${apiBase}/ai/planner/booking-quotes`);
    expect(quoteReq.request.method).toBe('POST');
    expect(quoteReq.request.body.listing_id).toBe(12);
    quoteReq.flush({});

    service.confirmBooking({
      confirmation_token: 'tok-abc',
      confirm: true,
    }).subscribe();
    const confirmReq = httpMock.expectOne(`${apiBase}/ai/planner/bookings/confirm`);
    expect(confirmReq.request.method).toBe('POST');
    expect(confirmReq.request.body).toEqual({ confirmation_token: 'tok-abc', confirm: true });
    confirmReq.flush({});

    service.simulatePayment(55, 'req-key-1', 1, 'success').subscribe();
    const simReq = httpMock.expectOne(`${apiBase}/payments/simulate`);
    expect(simReq.request.method).toBe('POST');
    expect(simReq.request.body).toEqual({
      booking_id: 55,
      request_key: 'req-key-1',
      attempt_no: 1,
      simulate_outcome: 'success',
    });
    simReq.flush({});

    service.payAtLocation(55, 'req-key-2').subscribe();
    const locReq = httpMock.expectOne(`${apiBase}/payments/at-location`);
    expect(locReq.request.method).toBe('POST');
    expect(locReq.request.body).toEqual({ booking_id: 55, request_key: 'req-key-2' });
    locReq.flush({});

    service.saveTrip('Ella Escape', 21).subscribe();
    const saveReq = httpMock.expectOne(`${apiBase}/ai/planner/trips`);
    expect(saveReq.request.method).toBe('POST');
    expect(saveReq.request.body).toEqual({ title: 'Ella Escape', turn_id: 21 });
    saveReq.flush({});

    service.listSavedTrips(30, 0).subscribe();
    const listTripsReq = httpMock.expectOne(`${apiBase}/ai/planner/trips?limit=30&offset=0`);
    expect(listTripsReq.request.method).toBe('GET');
    listTripsReq.flush([]);

    service.getSavedTrip(9).subscribe();
    const getTripReq = httpMock.expectOne(`${apiBase}/ai/planner/trips/9`);
    expect(getTripReq.request.method).toBe('GET');
    getTripReq.flush({});

    service.updateSavedTrip(9, 'Renamed Trip').subscribe();
    const patchTripReq = httpMock.expectOne(`${apiBase}/ai/planner/trips/9`);
    expect(patchTripReq.request.method).toBe('PATCH');
    expect(patchTripReq.request.body).toEqual({ title: 'Renamed Trip' });
    patchTripReq.flush({});

    service.deleteSavedTrip(9).subscribe();
    const delTripReq = httpMock.expectOne(`${apiBase}/ai/planner/trips/9`);
    expect(delTripReq.request.method).toBe('DELETE');
    delTripReq.flush(null);
  });

  it('resolves public listing photos safely with cache and returns null on missing or failed responses', () => {
    let firstUrl: string | null = null;
    service.resolveListingPhoto('homestay', 15).subscribe((res) => (firstUrl = res));
    const req = httpMock.expectOne(`${apiBase}/homestays/15`);
    expect(req.request.method).toBe('GET');
    req.flush({ cover_image_url: '/uploads/homestays/hilltop.jpg' });
    expect(firstUrl).toBe('http://127.0.0.1:8000/uploads/homestays/hilltop.jpg');

    // Second lookup reads cache without HTTP request
    let cachedUrl: string | null = null;
    service.resolveListingPhoto('homestay', 15).subscribe((res) => (cachedUrl = res));
    expect(cachedUrl).toBe('http://127.0.0.1:8000/uploads/homestays/hilltop.jpg');

    // Error resolves cleanly to null
    let failedUrl: string | null = 'unset';
    service.resolveListingPhoto('artisan', 999).subscribe((res) => (failedUrl = res));
    const artReq = httpMock.expectOne(`${apiBase}/artisan-listings/999`);
    artReq.flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
    expect(failedUrl).toBeNull();
  });

  it('parses Retry-After and quota / rate-limit / timeout / conflict errors cleanly', () => {
    const rateLimited = formatAiPlannerError({
      status: 429,
      headers: { get: (k: string) => (k === 'Retry-After' ? '25' : null) },
      error: { detail: 'Too many requests' },
    });
    expect(rateLimited.code).toBe('rate_limit');
    expect(rateLimited.retryAfterSeconds).toBe(25);
    expect(rateLimited.message).toContain('25s');

    const quota = formatAiPlannerError({
      status: 429,
      headers: { get: () => null },
      error: { detail: 'AI quota exhausted for today' },
    });
    expect(quota.code).toBe('quota');

    const expired = formatAiPlannerError({ status: 410, error: { detail: 'Confirmation token expired' } });
    expect(expired.code).toBe('expired_or_conflict');

    const timeout = formatAiPlannerError({ status: 504, error: {} });
    expect(timeout.code).toBe('timeout');
  });

  it('consumes pending quick drafts cleanly and formats domain helpers safely', () => {
    service.setPendingQuickDraft({ destination: 'Jaffna', duration: '3 Days' });
    expect(service.consumePendingQuickDraft()).toEqual({ destination: 'Jaffna', duration: '3 Days' });
    expect(service.consumePendingQuickDraft()).toBeNull();

    expect(
      buildNaturalLanguageTripPrompt({
        destination: 'Ella',
        duration: '2 Days',
        travelers: 2,
        budgetLkr: 50000,
        interests: 'tea trails, waterfalls',
      }),
    ).toBe('Plan a 2 Days trip to Ella for 2 travelers with a budget of LKR 50,000 focusing on tea trails, waterfalls.');

    const key = makeIdempotencyKey('pay');
    expect(key.startsWith('pay-')).toBe(true);
    expect(key.length).toBeLessThanOrEqual(36);
    expect(resolveAiMediaUrl('javascript:alert(1)')).toBeNull();
    expect(resolveAiMediaUrl('/images/test.png')).toBe('http://127.0.0.1:8000/images/test.png');

    // Safe structured Markdown parser keeps HTML tags strictly as literal strings (never executed)
    const blocks = parseSafeAiTextBlocks(
      '# Day 1\n- Visit Temple\n- Lunch <script>alert(1)</script>\n\n| Stop | Cost |\n| --- | --- |\n| Fort | LKR 0 |',
    );
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list', 'table']);
    expect(blocks[1].items?.[1]).toContain('<script>alert(1)</script>');

    expect(getServiceCategoryLabel('artisan')).toBe('Artisan & Local Business');
    expect(
      getServiceDetailRoute({
        ref: 'art-1',
        listing_id: 42,
        category: 'artisan',
        title: 'Kandy Woodcraft',
        district: 'Kandy',
        locality: 'Pilimathalawa',
        advertised_price_lkr: null,
      }),
    ).toEqual(['/artisans', '42']);
    expect(formatBookingStatusMessage('pending')).toBe(
      'Booking request submitted. Awaiting service provider confirmation.',
    );
  });
});
