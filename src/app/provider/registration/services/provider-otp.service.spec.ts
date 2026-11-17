import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import {
  BackendPersonalDetailsRequest,
  SendOtpResponse,
  VerifyOtpResponse,
} from '../models/provider-otp.model';
import { ProviderOtpService } from './provider-otp.service';

describe('ProviderOtpService', () => {
  let service: ProviderOtpService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/providers/otp`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProviderOtpService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProviderOtpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should dispatch OTP request to /send endpoint', () => {
    const mockRes: SendOtpResponse = {
      message: 'Verification code sent successfully.',
      email: 'provider@business.com',
    };

    service.sendOtp('provider@business.com').subscribe((res) => {
      expect(res.message).toBe('Verification code sent successfully.');
      expect(res.email).toBe('provider@business.com');
    });

    const req = httpMock.expectOne(`${baseUrl}/send`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'provider@business.com' });
    req.flush(mockRes);
  });

  it('should verify OTP at /verify endpoint', () => {
    const mockRes: VerifyOtpResponse = {
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'auth_token_abc',
      expires_in: 1800,
      message: 'Email verified successfully.',
    };

    service.verifyOtp('provider@business.com', '123456').subscribe((res) => {
      expect(res.verified).toBe(true);
      expect(res.next_action).toBe('continue_registration');
      expect(res.authorization_token).toBe('auth_token_abc');
    });

    const req = httpMock.expectOne(`${baseUrl}/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'provider@business.com',
      otp: '123456',
    });
    req.flush(mockRes);
  });

  it('should handle 409 Conflict when email is already registered as a traveler', () => {
    service.sendOtp('traveler@example.com').subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(409);
        expect(err.message).toContain('already registered as a traveler account');
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/send`);
    req.flush(
      {
        detail:
          'This email is already registered as a traveler account. A single email cannot be registered for both account types.',
      },
      { status: 409, statusText: 'Conflict' }
    );
  });

  it('should handle 429 Too Many Requests with Retry-After header', () => {
    service.sendOtp('provider@business.com').subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(429);
        expect(err.retryAfterSeconds).toBe(45);
        expect(err.message).toContain('Please wait 45 second(s)');
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/send`);
    req.flush(
      {
        detail: 'Please wait 45 second(s) before requesting another verification code.',
      },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '45' },
      }
    );
  });

  it('should handle 400 Bad Request on invalid verification code', () => {
    service.verifyOtp('provider@business.com', '999999').subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.status).toBe(400);
        expect(err.message).toContain('Invalid verification code');
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/verify`);
    req.flush(
      { detail: 'Invalid verification code. 4 attempt(s) remaining.' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should send PUT request to /providers/registration/personal with Authorization header', () => {
    const payload: BackendPersonalDetailsRequest = {
      full_name: 'Kasun Perera',
      phone: '0771234567',
      nic_number: '199212345678',
      permanent_province: 'Western',
      permanent_district: 'Colombo',
      permanent_city: 'Colombo 03',
      permanent_landmark: '123 Galle Road, Colombo 03',
      permanent_postal_code: '00100',
      identity_document_type: 'nic',
      date_of_birth: '1992-04-10',
      gender: 'Male',
      nationality: 'Sri Lankan',
    };

    const mockDraft = {
      email: 'provider@business.com',
      full_name: 'Kasun Perera',
      phone: '0771234567',
      nic_number: '199212345678',
      permanent_province: 'Western',
      permanent_district: 'Colombo',
      permanent_city: 'Colombo 03',
      permanent_landmark: '123 Galle Road, Colombo 03',
      permanent_postal_code: '00100',
      registration_step: 'business',
    };

    service.savePersonalDetails(payload, 'valid-token-123').subscribe((res) => {
      expect(res.full_name).toBe('Kasun Perera');
      expect(res.registration_step).toBe('business');
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/providers/registration/personal`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token-123');
    expect(req.request.body).toEqual(payload);
    req.flush(mockDraft);
  });

  it('should send PUT request to /providers/registration/business with Authorization header', () => {
    const payload = {
      business_name: 'Ceylon Homestay',
      provider_type: 'homestay',
      secondary_phone: '+94 76 582 1987',
      business_province: 'Central',
      business_district: 'Kandy',
      business_city: 'Kandy',
      business_landmark: 'No. 78, Lake Road, Kandy.',
      business_postal_code: '20000',
      business_registration_number: 'PV12345678',
      description: 'A cozy homestay in Kandy.',
      same_as_permanent: false,
    };

    const mockDraft = {
      email: 'provider@business.com',
      business_name: 'Ceylon Homestay',
      provider_type: 'homestay',
      registration_step: 'identity',
    };

    service.saveBusinessDetails(payload, 'valid-token-123').subscribe((res) => {
      expect(res.business_name).toBe('Ceylon Homestay');
      expect(res.registration_step).toBe('identity');
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/providers/registration/business`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token-123');
    expect(req.request.body).toEqual(payload);
    req.flush(mockDraft);
  });

  it('should send POST request to /providers/registration/identity with FormData and Authorization header', () => {
    const formData = new FormData();
    const mockFile = new File(['dummy front'], 'nic_front.jpg', { type: 'image/jpeg' });
    formData.append('nic_front', mockFile);

    const mockResponse = {
      email: 'provider@business.com',
      nic_front_uploaded: true,
      selfie_uploaded: false,
      nic_back_uploaded: false,
      identity_completed: false,
      current_step: 'identity',
    };

    service.uploadIdentityDocuments(formData, 'auth-token-xyz').subscribe((res) => {
      expect(res.nic_front_uploaded).toBe(true);
      expect(res.selfie_uploaded).toBe(false);
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/providers/registration/identity`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer auth-token-xyz');
    expect(req.request.body).toBe(formData);
    req.flush(mockResponse);
  });

  it('should send GET request to /providers/registration/draft with Authorization header', () => {
    const mockDraft = {
      email: 'provider@business.com',
      full_name: 'Kasun Perera',
      identity_document_type: 'nic' as const,
      nic_front_uploaded: true,
      nic_back_uploaded: true,
      selfie_uploaded: true,
      identity_completed: true,
      current_step: 'review',
    };

    service.getRegistrationDraft('auth-token-xyz').subscribe((res) => {
      expect(res.email).toBe('provider@business.com');
      expect(res.identity_completed).toBe(true);
      expect(res.nic_front_uploaded).toBe(true);
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/providers/registration/draft`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer auth-token-xyz');
    req.flush(mockDraft);
  });
});
