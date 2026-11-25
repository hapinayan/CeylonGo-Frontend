export interface SendOtpRequest {
  email: string;
}

export interface SendOtpResponse {
  message: string;
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export type ProviderNextAction =
  | 'continue_registration'
  | 'resubmit_application'
  | 'create_password'
  | 'application_pending'
  | 'login_required';

export interface VerifyOtpResponse {
  verified: boolean;
  next_action?: ProviderNextAction | null;
  authorization_token?: string | null;
  expires_in?: number | null;
  message?: string | null;
}

export type RegistrationStepId =
  | 'email_verification'
  | 'personal_details'
  | 'business_details'
  | 'identity_verification'
  | 'review_submit';

export interface RegistrationStep {
  id: RegistrationStepId;
  stepNumber: number;
  title: string;
  completed: boolean;
  active: boolean;
  disabled: boolean;
}

export type RegistrationFlowState =
  | 'email_entry'
  | 'otp_entry'
  | 'verified_action'
  | 'personal_details'
  | 'business_details'
  | 'identity_verification'
  | 'review_submit';

export interface PersonalDetailsFormModel {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  nicNumber: string;
  province: string;
  district: string;
  city: string;
  postalCode: string;
  residentialAddress: string;
}

export interface BusinessDetailsFormModel {
  businessName: string;
  category: string;
  contactNumber: string;
  registrationNumber?: string;
  businessProvince: string;
  businessDistrict: string;
  businessCity: string;
  businessPostalCode: string;
  businessStreetAddress: string;
  description: string;
  businessAddress?: string;
}

export interface BusinessCategoryOption {
  id: string;
  label: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryOption[] = [
  { id: 'homestay', label: 'Homestay / Accommodation' },
  { id: 'tour_guide', label: 'Local Tour Guide' },
  { id: 'activity', label: 'Local Activities & Experiences' },
  { id: 'eco_tourism', label: 'Eco-Tourism' },
  { id: 'artisan', label: 'Local Artisan & Small Business' },
];

export interface BackendPersonalDetailsRequest {
  full_name: string;
  phone: string;
  nic_number: string;
  permanent_province: string;
  permanent_district: string;
  permanent_city: string;
  permanent_landmark?: string | null;
  permanent_postal_code: string;
  // Proposed Phase C fields (forward-compatible):
  identity_document_type?: 'nic';
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
}

export interface BackendBusinessDetailsRequest {
  business_name: string;
  provider_type: string;
  secondary_phone?: string | null;
  business_province?: string | null;
  business_district?: string | null;
  business_city?: string | null;
  business_landmark?: string | null;
  business_postal_code?: string | null;
  business_registration_number?: string | null;
  description?: string | null;
  same_as_permanent?: boolean;
}

export type DocumentUploadType = 'nic_front' | 'nic_back' | 'selfie';

export interface DocumentUploadState {
  file: File | null;
  fileName: string | null;
  isUploaded: boolean;
  isUploading: boolean;
  errorMessage: string | null;
}

export interface RegistrationSubmitResponse {
  submitted: boolean;
  approval_status: string;
  next_action: string;
  message: string;
}

export interface DraftResponse {
  email: string;
  full_name?: string | null;
  phone?: string | null;
  identity_document_type?: string | null;
  nic_number?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  permanent_province?: string | null;
  permanent_district?: string | null;
  permanent_city?: string | null;
  permanent_landmark?: string | null;
  permanent_postal_code?: string | null;
  business_name?: string | null;
  provider_type?: string | null;
  secondary_phone?: string | null;
  business_province?: string | null;
  business_district?: string | null;
  business_city?: string | null;
  business_landmark?: string | null;
  business_postal_code?: string | null;
  business_registration_number?: string | null;
  description?: string | null;
  selfie_uploaded?: boolean;
  nic_front_uploaded?: boolean;
  nic_back_uploaded?: boolean;
  personal_completed?: boolean;
  business_completed?: boolean;
  identity_completed?: boolean;
  current_step?: string;
  registration_step?: string | null;
  updated_at?: string | null;
}

export const SRI_LANKA_PROVINCES = [
  'Western',
  'Central',
  'Southern',
  'Northern',
  'Eastern',
  'North Western',
  'North Central',
  'Uva',
  'Sabaragamuwa',
] as const;

export type SriLankaProvince = (typeof SRI_LANKA_PROVINCES)[number];

export const SRI_LANKA_DISTRICTS: Record<SriLankaProvince, string[]> = {
  Western: ['Colombo', 'Gampaha', 'Kalutara'],
  Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
  Southern: ['Galle', 'Matara', 'Hambantota'],
  Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  Eastern: ['Trincomalee', 'Batticaloa', 'Ampara'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  Uva: ['Badulla', 'Monaragala'],
  Sabaragamuwa: ['Ratnapura', 'Kegalle'],
};

export const DISTRICT_POSTAL_CODES: Record<string, string> = {
  Colombo: '00100',
  Gampaha: '11000',
  Kalutara: '12000',
  Kandy: '20000',
  Matale: '21000',
  'Nuwara Eliya': '22200',
  Galle: '80000',
  Matara: '81000',
  Hambantota: '82000',
  Jaffna: '40000',
  Kilinochchi: '44000',
  Mannar: '41000',
  Vavuniya: '43000',
  Mullaitivu: '42000',
  Trincomalee: '31000',
  Batticaloa: '30000',
  Ampara: '32000',
  Kurunegala: '60000',
  Puttalam: '61000',
  Anuradhapura: '50000',
  Polonnaruwa: '51000',
  Badulla: '90000',
  Monaragala: '91000',
  Ratnapura: '70000',
  Kegalle: '71000',
};

export interface ProviderRegistrationState {
  email: string | null;
  flowState: RegistrationFlowState;
  currentStepId: RegistrationStepId;
  authorizationToken: string | null;
  tokenExpiresAt: number | null;
  nextAction: ProviderNextAction | null;
  actionMessage: string | null;
  resendCooldownRemaining: number;
}

export interface ProviderPasswordSetupPayload {
  password: string;
  confirm_password: string;
}

export interface ProviderPasswordSetupResponse {
  success: boolean;
  account_activated: boolean;
  next_action: string;
  message: string;
}
