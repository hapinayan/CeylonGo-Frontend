import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  BackendBusinessDetailsRequest,
  BackendPersonalDetailsRequest,
  DraftResponse,
  ProviderPasswordSetupPayload,
  ProviderPasswordSetupResponse,
  RegistrationSubmitResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../models/provider-otp.model';

export interface ProviderApiError {
  status: number;
  message: string;
  retryAfterSeconds?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProviderOtpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/providers/otp`;

  /**
   * Request a 6-digit verification OTP dispatched to the provider's email.
   * Endpoint: POST /api/v1/providers/otp/send
   */
  sendOtp(email: string): Observable<SendOtpResponse> {
    const payload: SendOtpRequest = { email: email.trim().toLowerCase() };
    return this.http
      .post<SendOtpResponse>(`${this.baseUrl}/send`, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Verify the 6-digit OTP and obtain authorization token and next action.
   * Endpoint: POST /api/v1/providers/otp/verify
   */
  verifyOtp(email: string, otp: string): Observable<VerifyOtpResponse> {
    const payload: VerifyOtpRequest = {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    };
    return this.http
      .post<VerifyOtpResponse>(`${this.baseUrl}/verify`, payload)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Save Step 2 Personal Details draft.
   * Endpoint: PUT /api/v1/providers/registration/personal
   * Requires Authorization: Bearer <single-use-authorization-token>
   */
  savePersonalDetails(
    payload: BackendPersonalDetailsRequest,
    authToken: string
  ): Observable<DraftResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken.trim()}`,
    });
    return this.http
      .put<DraftResponse>(
        `${environment.apiBaseUrl}/providers/registration/personal`,
        payload,
        { headers }
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Save Step 3 Business Details draft.
   * Endpoint: PUT /api/v1/providers/registration/business
   * Requires Authorization: Bearer <single-use-authorization-token>
   */
  saveBusinessDetails(
    payload: BackendBusinessDetailsRequest,
    authToken: string
  ): Observable<DraftResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken.trim()}`,
    });
    return this.http
      .put<DraftResponse>(
        `${environment.apiBaseUrl}/providers/registration/business`,
        payload,
        { headers }
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Upload identity verification documents (selfie, nic_front, nic_back) as multipart/form-data.
   * Endpoint: POST /api/v1/providers/registration/identity
   * Requires Authorization: Bearer <single-use-authorization-token>
   */
  uploadIdentityDocuments(
    formData: FormData,
    authToken: string
  ): Observable<DraftResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken.trim()}`,
    });
    return this.http
      .post<DraftResponse>(
        `${environment.apiBaseUrl}/providers/registration/identity`,
        formData,
        { headers }
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Retrieve the current provider registration draft progress and document status.
   * Endpoint: GET /api/v1/providers/registration/draft
   * Requires Authorization: Bearer <single-use-authorization-token>
   */
  getRegistrationDraft(authToken: string): Observable<DraftResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken.trim()}`,
    });
    return this.http
      .get<DraftResponse>(
        `${environment.apiBaseUrl}/providers/registration/draft`,
        { headers }
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  submitRegistration(authToken: string): Observable<RegistrationSubmitResponse> {
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + authToken.trim() });
    return this.http
      .post<RegistrationSubmitResponse>(
        environment.apiBaseUrl + '/providers/registration/submit',
        null,
        { headers },
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Set provider password and activate account using single-use authorization token.
   * Endpoint: POST /api/v1/providers/password/setup
   * Requires Authorization: Bearer <single-use-authorization-token>
   */
  setupPassword(
    payload: ProviderPasswordSetupPayload,
    authToken: string
  ): Observable<ProviderPasswordSetupResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken.trim()}`,
    });
    return this.http
      .post<ProviderPasswordSetupResponse>(
        `${environment.apiBaseUrl}/providers/password/setup`,
        payload,
        { headers }
      )
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Standardizes backend HTTP error payloads into strongly typed ProviderApiError.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An unexpected error occurred. Please try again.';
    let retryAfterSeconds: number | undefined;

    if (error.status === 0) {
      message = 'Unable to reach CeylonGo servers. Please check your internet connection.';
    } else if (error.error && typeof error.error.detail === 'string') {
      message = error.error.detail;
    } else if (error.error && Array.isArray(error.error.detail)) {
      message = error.error.detail.map((d: { msg?: string }) => d.msg ?? '').filter(Boolean).join(', ');
    } else if (typeof error.error === 'string') {
      message = error.error;
    }

    if (error.status === 429) {
      const headerVal = error.headers.get('Retry-After');
      if (headerVal) {
        const parsed = parseInt(headerVal, 10);
        if (!isNaN(parsed) && parsed > 0) {
          retryAfterSeconds = parsed;
        }
      }
      if (!retryAfterSeconds) {
        // Fallback parse seconds from detail message if available e.g. "wait 45 second(s)"
        const match = message.match(/(\d+)\s*second/i);
        if (match) {
          retryAfterSeconds = parseInt(match[1], 10);
        }
      }
    }

    const apiError: ProviderApiError = {
      status: error.status,
      message,
      retryAfterSeconds,
    };

    return throwError(() => apiError);
  }
}
