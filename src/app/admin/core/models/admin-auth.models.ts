export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  admin_role: string;
  is_active: boolean;
  created_at?: string;
}

export interface AdminTokenResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}
