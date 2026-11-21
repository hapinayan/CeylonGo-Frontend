export interface ProviderUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  business_name: string;
  provider_type: string;
  district: string;
  approval_status: string;
}

export interface ProviderLoginRequest {
  email: string;
  password: string;
}

export interface ProviderLoginResponse {
  access_token: string;
  token_type: string;
  user: ProviderUser;
}

export interface ProviderAuthError {
  status: number;
  message: string;
}
