export type AuthMethod = 'google' | 'password';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  authentication_method?: AuthMethod | null;
  role: string;
  is_active: boolean;
  auth_version?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProfilePatchRequest {
  full_name?: string;
  phone?: string | null;
  country?: string | null;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  message: string;
  login_required: boolean;
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
