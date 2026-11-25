export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface CheckEmailRequest {
  email: string;
}

export interface CheckEmailResponse {
  email: string;
  is_registered: boolean;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  registration_id: string;
  expires_in: number;
  resend_after: number;
  user?: User;
}

export interface RegistrationChallengeResponse {
  message: string;
  email: string;
  registration_id: string;
  expires_in: number;
  resend_after: number;
}

export interface VerifyEmailRequest {
  email: string;
  registration_id: string;
  otp: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendEmailOtpRequest {
  email: string;
  registration_id: string;
}

export interface ResendEmailOtpResponse {
  message: string;
  email: string;
  registration_id: string;
  expires_in: number;
  resend_after: number;
}

// Aliases for compatibility
export type VerifyOtpRequest = VerifyEmailRequest;
export type VerifyOtpResponse = VerifyEmailResponse;
export type ResendOtpRequest = ResendEmailOtpRequest;
export type ResendOtpResponse = ResendEmailOtpResponse;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  email: string;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ApiErrorResponse {
  detail?: string | Array<{ loc?: (string | number)[]; msg?: string; type?: string }>;
}
