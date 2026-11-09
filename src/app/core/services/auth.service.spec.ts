import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../models/auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    service.logout();
  });

  afterEach(() => {
    httpMock.verify();
    service.logout();
  });

  it('should register a new traveler', () => {
    const payload: RegisterRequest = {
      full_name: 'Test Traveler',
      email: 'traveler@ceylongo.lk',
      password: 'Password123!',
    };

    const mockResponse: RegisterResponse = {
      message: 'Account registered successfully',
      user: {
        id: 1,
        full_name: 'Test Traveler',
        email: 'traveler@ceylongo.lk',
        role: 'traveler',
        is_active: true,
        created_at: '2026-11-10T00:00:00',
      },
    };

    service.register(payload).subscribe((res) => {
      expect(res.message).toBe('Account registered successfully');
      expect(res.user.email).toBe('traveler@ceylongo.lk');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should log in and store token in memory', () => {
    const credentials: LoginRequest = {
      email: 'traveler@ceylongo.lk',
      password: 'Password123!',
    };

    const mockResponse: LoginResponse = {
      access_token: 'fake-jwt-token-12345',
      token_type: 'bearer',
      user: {
        id: 1,
        full_name: 'Test Traveler',
        email: 'traveler@ceylongo.lk',
        role: 'traveler',
        is_active: true,
        created_at: '2026-11-10T00:00:00',
      },
    };

    service.login(credentials).subscribe((res) => {
      expect(res.access_token).toBe('fake-jwt-token-12345');
      expect(service.getToken()).toBe('fake-jwt-token-12345');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.full_name).toBe('Test Traveler');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should fetch current user via /auth/me', () => {
    const mockUser: User = {
      id: 1,
      full_name: 'Current Traveler',
      email: 'me@ceylongo.lk',
      role: 'traveler',
      is_active: true,
      created_at: '2026-11-10T00:00:00',
    };

    service.getCurrentUser().subscribe((user) => {
      expect(user.id).toBe(1);
      expect(user.full_name).toBe('Current Traveler');
      expect(service.currentUser()?.email).toBe('me@ceylongo.lk');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('should clear token and user on logout', () => {
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});

