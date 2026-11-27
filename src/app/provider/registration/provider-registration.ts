import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import {
  BUSINESS_CATEGORIES,
  BackendBusinessDetailsRequest,
  BackendPersonalDetailsRequest,
  BusinessCategoryOption,
  BusinessDetailsFormModel,
  DISTRICT_POSTAL_CODES,
  DocumentUploadState,
  DocumentUploadType,
  DraftResponse,
  ProviderNextAction,
  RegistrationFlowState,
  RegistrationSubmitResponse,
  SRI_LANKA_DISTRICTS,
  SRI_LANKA_PROVINCES,
  SriLankaProvince,
} from './models/provider-otp.model';
import { ProviderApiError, ProviderOtpService } from './services/provider-otp.service';
import { ProviderRegistrationStateService } from './services/provider-registration-state.service';

/**
 * Custom validator for Sri Lankan phone numbers:
 * Supports 10 digits starting with 0 (e.g. 0771234567) or international +94 / 0094 / 94.
 */
export function sriLankanPhoneValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const cleaned = String(control.value).replace(/[\s\-]/g, '');
  if (!/^(?:\+94|0094|94)?(0?[1-9]\d{8})$/.test(cleaned)) {
    return { invalidPhone: true };
  }
  return null;
}

/**
 * Custom validator preventing future dates for Date of Birth.
 */
export function pastDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const selected = new Date(control.value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (isNaN(selected.getTime()) || selected > today) {
    return { futureDate: true };
  }
  return null;
}

/**
 * Custom validator for Sri Lankan National Identity Card (NIC).
 * Accepts Old NIC (9 digits followed by V/v or X/x) or New NIC (12 digits).
 */
export function sriLankanNicValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const val = String(control.value).trim();
  const isOldNic = /^[0-9]{9}[vVxX]$/.test(val);
  const isNewNic = /^[0-9]{12}$/.test(val);
  if (!isOldNic && !isNewNic) {
    return { invalidNic: true };
  }
  return null;
}

@Component({
  selector: 'app-provider-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-registration.html',
  styleUrl: './provider-registration.scss',
})
export class ProviderRegistration implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly otpService = inject(ProviderOtpService);
  readonly stateService = inject(ProviderRegistrationStateService);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // Step 1: Email Form
  readonly emailForm = new FormGroup({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    }),
  });

  // Step 1: OTP Digits Form
  readonly otpForm = new FormGroup({
    digits: new FormArray([
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
      new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9]$/)] }),
    ]),
  });

  // Step 2: Personal Details Form
  readonly personalDetailsForm = new FormGroup({
    fullName: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    }),
    email: new FormControl<string>({ value: '', disabled: true }, {
      nonNullable: true,
    }),
    phone: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, sriLankanPhoneValidator],
    }),
    dateOfBirth: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, pastDateValidator],
    }),
    gender: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    nationality: new FormControl<string>('Sri Lankan', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    nicNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, sriLankanNicValidator],
    }),
    province: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    district: new FormControl<string>(
      { value: '', disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required],
      }
    ),
    city: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    }),
    postalCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[0-9]{3,20}$/),
      ],
    }),
    residentialAddress: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(255),
      ],
    }),
  });

  // Step 3: Business Details Form
  readonly businessDetailsForm = new FormGroup({
    businessName: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    }),
    category: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    contactNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, sriLankanPhoneValidator],
    }),
    registrationNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    businessProvince: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    businessDistrict: new FormControl<string>(
      { value: '', disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required],
      }
    ),
    businessCity: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    }),
    businessPostalCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[0-9]{3,20}$/),
      ],
    }),
    businessStreetAddress: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(255),
      ],
    }),
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500),
      ],
    }),
  });

  // UI status signals
  readonly isSubmitting = signal<boolean>(false);
  readonly reviewDraft = signal<DraftResponse | null>(null);
  readonly reviewLoading = signal(false);
  readonly reviewConfirmed = signal(false);
  readonly reviewNeedsVerification = signal(false);
  readonly submittedApplication = signal<RegistrationSubmitResponse | null>(null);

  readonly reviewDocuments = computed(() => {
    const draft = this.reviewDraft();
    if (!draft) return [];
    return [
      { label: 'NIC Front Side', uploaded: !!draft.nic_front_uploaded, type: 'front' },
      { label: 'NIC Back Side', uploaded: !!draft.nic_back_uploaded, type: 'back' },
      { label: 'Selfie with NIC', uploaded: !!draft.selfie_uploaded, type: 'selfie' },
    ];
  });

  readonly reviewReady = computed(() => {
    const draft = this.reviewDraft();
    return !!(
      draft?.email && draft.identity_document_type === 'nic' &&
      draft.personal_completed && draft.business_completed &&
      this.reviewDocuments().every((document) => document.uploaded)
    );
  });

  reviewCategory(category: string | null | undefined): string | null | undefined {
    return BUSINESS_CATEGORIES.find((option) => option.id === category)?.label ?? category;
  }
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly currentAction = signal<ProviderNextAction | null>(null);

  // Step 4: Identity Verification Document Upload States
  readonly nicFrontState = signal<DocumentUploadState>({
    file: null,
    fileName: null,
    isUploaded: false,
    isUploading: false,
    errorMessage: null,
  });

  readonly nicBackState = signal<DocumentUploadState>({
    file: null,
    fileName: null,
    isUploaded: false,
    isUploading: false,
    errorMessage: null,
  });

  readonly selfieState = signal<DocumentUploadState>({
    file: null,
    fileName: null,
    isUploaded: false,
    isUploading: false,
    errorMessage: null,
  });

  readonly isAnyUploading = computed<boolean>(() => {
    return (
      this.nicFrontState().isUploading ||
      this.nicBackState().isUploading ||
      this.selfieState().isUploading
    );
  });

  readonly isIdentityComplete = computed<boolean>(() => {
    const selfieOk = this.selfieState().isUploaded || this.stateService.selfieUploaded();
    const frontOk = this.nicFrontState().isUploaded || this.stateService.nicFrontUploaded();
    const backOk = this.nicBackState().isUploaded || this.stateService.nicBackUploaded();
    return selfieOk && frontOk && backOk && !this.isAnyUploading();
  });

  // Sri Lanka Geographic Data & Business Categories
  readonly provinces = SRI_LANKA_PROVINCES;
  readonly availableDistricts = signal<string[]>([]);
  readonly availableBusinessDistricts = signal<string[]>([]);
  readonly maxBirthDate = new Date().toISOString().split('T')[0];
  readonly businessCategories: BusinessCategoryOption[] = BUSINESS_CATEGORIES;

  get descriptionCharCount(): number {
    return this.businessDetailsForm.controls.description.value?.length || 0;
  }

  private countdownSub?: Subscription;

  get emailErrorMessage(): string | null {
    const ctrl = this.emailForm.controls.email;
    if (!ctrl.touched || !ctrl.errors) {
      return null;
    }
    if (ctrl.errors['required']) {
      return 'Please enter your business email address.';
    }
    if (ctrl.errors['email']) {
      return 'Please enter a valid email address (e.g. name@business.com).';
    }
    return null;
  }

  get digitsArray(): FormArray<FormControl<string>> {
    return this.otpForm.get('digits') as FormArray<FormControl<string>>;
  }

  get flowState(): RegistrationFlowState {
    return this.stateService.flowState();
  }

  get activeEmail(): string {
    return this.stateService.email() || this.emailForm.controls.email.value;
  }

  get resendCooldown(): number {
    return this.stateService.resendCooldown();
  }

  ngOnInit(): void {
    const storedEmail = this.stateService.email();
    if (storedEmail) {
      this.emailForm.controls.email.setValue(storedEmail);
      this.personalDetailsForm.controls.email.setValue(storedEmail);
    }

    if (this.stateService.currentStepId() === 'personal_details') {
      this.loadPersonalDetailsToForm();
    } else if (this.stateService.currentStepId() === 'business_details') {
      this.loadBusinessDetailsToForm();
    } else if (this.stateService.currentStepId() === 'identity_verification') {
      this.restoreDraftIfAvailable();
    } else if (this.stateService.currentStepId() === 'review_submit') {
      this.loadReviewDraft();
    }
  }

  restoreDraftIfAvailable(): void {
    const token = this.stateService.getAuthorizationToken();
    if (!token) return;
    this.otpService.getRegistrationDraft(token).subscribe({
      next: (draft) => {
        this.syncDocumentsFromDraft(draft, true);
      },
      error: () => {
        // Silently preserve in-memory signals if offline
      },
    });
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
    if (this.submittedApplication()) this.stateService.clearRegistrationState();
  }

  /**
   * Action: Dispatch OTP to entered email address.
   */
  onSendVerificationCode(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = this.emailForm.controls.email.value.trim().toLowerCase();
    this.isSubmitting.set(true);

    this.otpService.sendOtp(email).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.stateService.setOtpSent(res.email, 60);
        this.startCooldownTimer(60);
        this.resetOtpForm();
        this.successMessage.set(
          `We've sent a 6-digit verification code to ${res.email}.`
        );
        setTimeout(() => this.focusOtpInput(0), 100);
      },
      error: (err: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
        if (err.status === 429 && err.retryAfterSeconds) {
          this.stateService.setResendCooldown(err.retryAfterSeconds);
          this.startCooldownTimer(err.retryAfterSeconds);
        }
      },
    });
  }

  /**
   * Action: Resend OTP to existing email address.
   */
  onResendOtp(): void {
    if (this.resendCooldown > 0 || this.isSubmitting()) {
      return;
    }

    const email = this.activeEmail;
    if (!email) {
      this.onChangeEmail();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    this.otpService.sendOtp(email).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.stateService.setResendCooldown(60);
        this.startCooldownTimer(60);
        this.resetOtpForm();
        this.successMessage.set('A new verification code has been dispatched.');
        setTimeout(() => this.focusOtpInput(0), 100);
      },
      error: (err: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
        if (err.status === 429 && err.retryAfterSeconds) {
          this.stateService.setResendCooldown(err.retryAfterSeconds);
          this.startCooldownTimer(err.retryAfterSeconds);
        }
      },
    });
  }

  /**
   * Action: Verify the 6-digit numeric OTP submitted by user.
   */
  onVerifyOtp(): void {
    this.errorMessage.set(null);

    const otpCode = this.getEnteredOtp();
    if (otpCode.length !== 6 || !/^[0-9]{6}$/.test(otpCode)) {
      this.errorMessage.set('Please enter a complete 6-digit numeric verification code.');
      return;
    }

    const email = this.activeEmail;
    if (!email) {
      this.onChangeEmail();
      return;
    }

    this.isSubmitting.set(true);

    this.otpService.verifyOtp(email, otpCode).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.stopCooldownTimer();
        this.stateService.setOtpVerified(res);
        this.currentAction.set(res.next_action ?? 'continue_registration');
      },
      error: (err: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
        if (err.message.toLowerCase().includes('maximum') || err.message.toLowerCase().includes('expired')) {
          this.resetOtpForm();
          this.focusOtpInput(0);
        }
      },
    });
  }

  /**
   * Action: Change Email and return to email entry state.
   */
  onChangeEmail(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.stopCooldownTimer();
    this.stateService.resetToEmailEntry();
    this.resetOtpForm();
  }

  /**
   * Action: Proceed to next registration phase based on verified account state.
   */
  onContinueNextStep(): void {
    const action = this.stateService.nextAction();
    switch (action) {
      case 'continue_registration':
      case 'resubmit_application':
        this.resumeRegistration();
        break;
      case 'create_password':
        this.router.navigate(['/provider/login'], {
          queryParams: { action: 'password_setup' },
          state: {
            token: this.stateService.getAuthorizationToken(),
            email: this.activeEmail,
            backendAuthorized: true,
            nextAction: 'create_password',
          },
        });
        break;
      case 'login_required':
        this.router.navigate(['/provider/login']);
        break;
      default:
        this.stateService.goToPersonalDetails();
        this.loadPersonalDetailsToForm();
        break;
    }
  }

  private resumeRegistration(): void {
    if (this.isSubmitting()) return;
    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.stateService.goToPersonalDetails();
      this.loadPersonalDetailsToForm();
      return;
    }

    this.isSubmitting.set(true);
    this.otpService.getRegistrationDraft(token).subscribe({
      next: (draft) => {
        this.isSubmitting.set(false);
        this.restoreReviewDetails(draft);
        if (draft.identity_document_type && draft.identity_document_type !== 'nic') {
          this.stateService.goToPersonalDetails();
          this.loadPersonalDetailsToForm();
          return;
        }
        if (
          draft.identity_document_type === 'nic' &&
          (draft.current_step === 'review' ||
            (draft.identity_completed && draft.personal_completed && draft.business_completed))
        ) {
          this.stateService.completeIdentityVerification();
          this.reviewDraft.set(draft);
          this.reviewConfirmed.set(false);
          this.reviewNeedsVerification.set(false);
        } else if (
          draft.current_step === 'identity' ||
          (draft.business_completed && draft.personal_completed)
        ) {
          this.stateService.goToIdentityVerification();
          this.syncDocumentsFromDraft(draft, true);
        } else if (draft.current_step === 'business' || draft.personal_completed) {
          this.stateService.goToBusinessDetails();
          this.loadBusinessDetailsToForm();
        } else {
          this.stateService.goToPersonalDetails();
          this.loadPersonalDetailsToForm();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.stateService.goToPersonalDetails();
        this.loadPersonalDetailsToForm();
      },
    });
  }

  // Step 2: Personal Details Methods

  onProvinceChange(): void {
    const selected = this.personalDetailsForm.controls.province.value as SriLankaProvince;
    if (selected && SRI_LANKA_DISTRICTS[selected]) {
      this.availableDistricts.set(SRI_LANKA_DISTRICTS[selected]);
      this.personalDetailsForm.controls.district.enable();
    } else {
      this.availableDistricts.set([]);
      this.personalDetailsForm.controls.district.disable();
    }
    this.personalDetailsForm.controls.district.setValue('');
    this.personalDetailsForm.controls.district.markAsUntouched();
  }

  onBackToEmail(): void {
    this.stateService.setPersonalDetails(this.personalDetailsForm.getRawValue());
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.stateService.backToEmailVerification();
  }

  onBackToPersonalDetails(): void {
    this.stateService.setBusinessDetails(this.businessDetailsForm.getRawValue());
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.stateService.backToPersonalDetails();
    this.loadPersonalDetailsToForm();
  }

  onBackToBusinessDetails(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.stateService.goToBusinessDetails();
    this.loadBusinessDetailsToForm();
  }

  onContinueToBusinessDetails(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.personalDetailsForm.invalid) {
      this.personalDetailsForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required personal details correctly.');
      return;
    }

    const formVal = this.personalDetailsForm.getRawValue();

    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.errorMessage.set(
        'Your registration authorization session has expired or is invalid. Please verify your email again.'
      );
      return;
    }

    this.isSubmitting.set(true);

    // Map frontend form fields directly to backend contract without guessing or fabrication
    const payload: BackendPersonalDetailsRequest = {
      full_name: formVal.fullName.trim(),
      phone: formVal.phone.trim(),
      nic_number: formVal.nicNumber.trim().toUpperCase(),
      permanent_province: formVal.province.trim(),
      permanent_district: formVal.district.trim(),
      permanent_city: formVal.city.trim(),
      permanent_landmark: formVal.residentialAddress.trim(),
      permanent_postal_code: formVal.postalCode.trim(),
      // Forward-compatible contract fields (Phase C preparation)
      identity_document_type: 'nic',
      date_of_birth: formVal.dateOfBirth,
      gender: formVal.gender,
      nationality: formVal.nationality,
    };

    this.otpService.savePersonalDetails(payload, token).subscribe({
      next: (draft) => {
        this.isSubmitting.set(false);
        this.syncDocumentsFromDraft(draft, true);
        this.stateService.completePersonalDetails(formVal);
        this.loadBusinessDetailsToForm();
        this.successMessage.set('Personal details saved successfully!');
      },
      error: (err: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  // Step 3: Business Details Methods

  onBusinessProvinceChange(): void {
    const selected = this.businessDetailsForm.controls.businessProvince.value as SriLankaProvince;
    if (selected && SRI_LANKA_DISTRICTS[selected]) {
      this.availableBusinessDistricts.set(SRI_LANKA_DISTRICTS[selected]);
      this.businessDetailsForm.controls.businessDistrict.enable();
    } else {
      this.availableBusinessDistricts.set([]);
      this.businessDetailsForm.controls.businessDistrict.disable();
    }
    this.businessDetailsForm.controls.businessDistrict.setValue('');
    this.businessDetailsForm.controls.businessDistrict.markAsUntouched();
  }

  onContinueToIdentityVerification(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.businessDetailsForm.invalid) {
      this.businessDetailsForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required business details correctly.');
      return;
    }

    const formVal = this.businessDetailsForm.getRawValue();

    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.errorMessage.set(
        'Your registration authorization session has expired or is invalid. Please verify your email again.'
      );
      return;
    }

    this.isSubmitting.set(true);

    const payload: BackendBusinessDetailsRequest = {
      business_name: formVal.businessName.trim(),
      provider_type: formVal.category.trim().toLowerCase(),
      secondary_phone: formVal.contactNumber.trim(),
      business_province: formVal.businessProvince.trim(),
      business_district: formVal.businessDistrict.trim(),
      business_city: formVal.businessCity.trim(),
      business_landmark: formVal.businessStreetAddress.trim(),
      business_postal_code: formVal.businessPostalCode.trim(),
      business_registration_number: formVal.registrationNumber?.trim() || null,
      description: formVal.description.trim(),
      same_as_permanent: false,
    };

    this.otpService.saveBusinessDetails(payload, token).subscribe({
      next: (_res) => {
        this.isSubmitting.set(false);
        this.stateService.completeBusinessDetails(formVal);
        this.successMessage.set(null);
      },
      error: (err: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  isBusinessFieldInvalid(fieldName: string): boolean {
    const ctrl = this.businessDetailsForm.get(fieldName);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  getBusinessFieldError(fieldName: string): string | null {
    const ctrl = this.businessDetailsForm.get(fieldName);
    if (!ctrl || !ctrl.touched || !ctrl.errors) {
      return null;
    }
    if (ctrl.errors['required']) {
      switch (fieldName) {
        case 'businessName':
          return 'Please enter your business name.';
        case 'category':
          return 'Please select a business category.';
        case 'contactNumber':
          return 'Please enter your business contact number.';
        case 'businessProvince':
          return 'Please select your business province.';
        case 'businessDistrict':
          return 'Please select your business district.';
        case 'businessCity':
          return 'Please enter your business city or town.';
        case 'businessPostalCode':
          return 'Please enter your business postal code.';
        case 'businessStreetAddress':
          return 'Please enter your business street address.';
        case 'description':
          return 'Please enter a description of your business or service.';
        default:
          return 'This field is required.';
      }
    }
    if (ctrl.errors['minlength']) {
      if (fieldName === 'businessName') {
        return 'Business name must be at least 2 characters.';
      }
      if (fieldName === 'businessCity') {
        return 'City or town must be at least 2 characters.';
      }
      if (fieldName === 'businessPostalCode') {
        return 'Postal code must be at least 3 characters.';
      }
      if (fieldName === 'businessStreetAddress') {
        return 'Street address must be at least 5 characters.';
      }
      if (fieldName === 'description') {
        return 'Description must be at least 10 characters.';
      }
    }
    if (ctrl.errors['maxlength']) {
      if (fieldName === 'businessName') {
        return 'Business name cannot exceed 150 characters.';
      }
      if (fieldName === 'businessCity') {
        return 'City or town cannot exceed 100 characters.';
      }
      if (fieldName === 'businessPostalCode') {
        return 'Postal code cannot exceed 20 characters.';
      }
      if (fieldName === 'businessStreetAddress') {
        return 'Street address cannot exceed 255 characters.';
      }
      if (fieldName === 'description') {
        return 'Description cannot exceed 500 characters.';
      }
      if (fieldName === 'registrationNumber') {
        return 'Registration number cannot exceed 50 characters.';
      }
    }
    if (ctrl.errors['invalidPhone']) {
      return 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).';
    }
    if (ctrl.errors['pattern']) {
      if (fieldName === 'businessPostalCode') {
        return 'Please enter a valid postal code (e.g. 20000).';
      }
    }
    return null;
  }

  loadBusinessDetailsToForm(): void {
    const saved = this.stateService.getBusinessDetails();
    if (saved) {
      if (saved.businessProvince && SRI_LANKA_DISTRICTS[saved.businessProvince as SriLankaProvince]) {
        this.availableBusinessDistricts.set(
          SRI_LANKA_DISTRICTS[saved.businessProvince as SriLankaProvince]
        );
        this.businessDetailsForm.controls.businessDistrict.enable();
      } else {
        this.availableBusinessDistricts.set([]);
        this.businessDetailsForm.controls.businessDistrict.disable();
      }

      this.businessDetailsForm.patchValue({
        businessName: saved.businessName || '',
        category: saved.category || '',
        contactNumber: saved.contactNumber || '',
        registrationNumber: saved.registrationNumber || '',
        businessProvince: saved.businessProvince || '',
        businessDistrict: saved.businessDistrict || '',
        businessCity: saved.businessCity || '',
        businessPostalCode: saved.businessPostalCode || '',
        businessStreetAddress: saved.businessStreetAddress || '',
        description: saved.description || '',
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.personalDetailsForm.get(fieldName);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  getFieldError(fieldName: string): string | null {
    const ctrl = this.personalDetailsForm.get(fieldName);
    if (!ctrl || !ctrl.touched || !ctrl.errors) {
      return null;
    }
    if (ctrl.errors['required']) {
      switch (fieldName) {
        case 'fullName':
          return 'Please enter your full name.';
        case 'phone':
          return 'Please enter your phone number.';
        case 'dateOfBirth':
          return 'Please select your date of birth.';
        case 'gender':
          return 'Please select your gender.';
        case 'nationality':
          return 'Please select your nationality.';
        case 'nicNumber':
          return 'Please enter your NIC number.';
        case 'province':
          return 'Please select your province.';
        case 'district':
          return 'Please select your district.';
        case 'city':
          return 'Please enter your city or town.';
        case 'postalCode':
          return 'Please enter your postal code.';
        case 'residentialAddress':
          return 'Please enter your residential street address.';
        default:
          return 'This field is required.';
      }
    }
    if (ctrl.errors['minlength']) {
      if (fieldName === 'fullName') {
        return 'Full name must be at least 2 characters.';
      }
      if (fieldName === 'city') {
        return 'City or town must be at least 2 characters.';
      }
      if (fieldName === 'residentialAddress') {
        return 'Residential street address must be at least 5 characters.';
      }
    }
    if (ctrl.errors['maxlength']) {
      if (fieldName === 'fullName') {
        return 'Full name cannot exceed 150 characters.';
      }
      if (fieldName === 'city') {
        return 'City or town cannot exceed 100 characters.';
      }
      if (fieldName === 'postalCode') {
        return 'Postal code cannot exceed 20 characters.';
      }
      if (fieldName === 'residentialAddress') {
        return 'Residential street address cannot exceed 255 characters.';
      }
    }
    if (ctrl.errors['invalidPhone']) {
      return 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567).';
    }
    if (ctrl.errors['futureDate']) {
      return 'Date of birth cannot be in the future.';
    }
    if (ctrl.errors['invalidNic']) {
      return 'Please enter a valid Sri Lankan NIC (e.g. 123456789V or 200012345678).';
    }
    if (ctrl.errors['pattern']) {
      if (fieldName === 'postalCode') {
        return 'Please enter a valid postal code (e.g. 20000).';
      }
    }
    return null;
  }

  loadPersonalDetailsToForm(): void {
    const email = this.stateService.email() || this.emailForm.controls.email.value;
    this.personalDetailsForm.controls.email.setValue(email);

    const saved = this.stateService.getPersonalDetails();
    if (saved) {
      if (saved.province && SRI_LANKA_DISTRICTS[saved.province as SriLankaProvince]) {
        this.availableDistricts.set(SRI_LANKA_DISTRICTS[saved.province as SriLankaProvince]);
        this.personalDetailsForm.controls.district.enable();
      }
      this.personalDetailsForm.patchValue({
        fullName: saved.fullName,
        email: email,
        phone: saved.phone,
        dateOfBirth: saved.dateOfBirth,
        gender: saved.gender,
        nationality: saved.nationality || 'Sri Lankan',
        nicNumber: saved.nicNumber,
        province: saved.province,
        district: saved.district,
        city: saved.city || '',
        postalCode: saved.postalCode || '',
        residentialAddress: saved.residentialAddress,
      });
      if (saved.province && SRI_LANKA_DISTRICTS[saved.province as SriLankaProvince]) {
        this.availableDistricts.set(SRI_LANKA_DISTRICTS[saved.province as SriLankaProvince]);
      }
    }
  }

  // OTP Box Keyboard & Input Management

  onDigitInput(event: Event, index: number): void {
    const inputEl = event.target as HTMLInputElement;
    const val = inputEl.value;
    const digitsOnly = val.replace(/[^0-9]/g, '');

    if (digitsOnly.length === 0) {
      this.digitsArray.at(index).setValue('');
      return;
    }

    if (digitsOnly.length === 1) {
      this.digitsArray.at(index).setValue(digitsOnly);
      if (index < 5) {
        this.focusOtpInput(index + 1);
      } else {
        if (this.isOtpComplete()) {
          this.onVerifyOtp();
        }
      }
      return;
    }

    this.distributeDigits(digitsOnly, index);
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const key = event.key;
    const currentVal = this.digitsArray.at(index).value;

    if (key === 'Backspace') {
      if (!currentVal && index > 0) {
        event.preventDefault();
        this.digitsArray.at(index - 1).setValue('');
        this.focusOtpInput(index - 1);
      } else {
        this.digitsArray.at(index).setValue('');
      }
    } else if (key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusOtpInput(index - 1);
    } else if (key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focusOtpInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData?.getData('text') || '';
    const digitsOnly = clipboardData.replace(/[^0-9]/g, '');

    if (digitsOnly.length > 0) {
      this.distributeDigits(digitsOnly, 0);
    }
  }

  isOtpComplete(): boolean {
    const code = this.getEnteredOtp();
    return code.length === 6 && /^[0-9]{6}$/.test(code);
  }

  private getEnteredOtp(): string {
    return this.digitsArray.controls.map((c) => c.value).join('');
  }

  private resetOtpForm(): void {
    this.digitsArray.controls.forEach((c) => c.setValue(''));
    this.digitsArray.markAsPristine();
    this.digitsArray.markAsUntouched();
  }

  private focusOtpInput(index: number): void {
    const inputEls = this.otpInputs?.toArray();
    if (inputEls && inputEls[index]) {
      inputEls[index].nativeElement.focus();
      inputEls[index].nativeElement.select();
    }
  }

  private distributeDigits(digits: string, startIndex: number): void {
    const clean = digits.slice(0, 6);
    for (let i = 0; i < clean.length && startIndex + i < 6; i++) {
      this.digitsArray.at(startIndex + i).setValue(clean[i]);
    }
    const nextIdx = Math.min(5, startIndex + clean.length);
    this.focusOtpInput(nextIdx);

    if (this.isOtpComplete()) {
      this.onVerifyOtp();
    }
  }

  private startCooldownTimer(seconds: number): void {
    this.stopCooldownTimer();
    this.stateService.setResendCooldown(seconds);

    this.countdownSub = interval(1000).subscribe(() => {
      this.stateService.decrementCooldown();
      if (this.resendCooldown <= 0) {
        this.stopCooldownTimer();
      }
    });
  }

  private stopCooldownTimer(): void {
    if (this.countdownSub) {
      this.countdownSub.unsubscribe();
      this.countdownSub = undefined;
    }
  }

  // =========================================================================
  // STEP 4: IDENTITY VERIFICATION METHODS
  // =========================================================================

  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onFileSelected(event: Event, docType: DocumentUploadType): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    input.value = ''; // Reset file input to allow re-selecting same file if replacing

    this.clearDocumentError(docType);

    // 1. Format validation: FastAPI backend accepts JPEG, PNG, WEBP.
    // PDF files are NOT accepted by backend PIL image verification.
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedMimes.includes(file.type) && (!ext || !allowedExts.includes(ext))) {
      this.setDocumentError(
        docType,
        'Unsupported file format. Please upload a clear JPG, PNG, or WebP image.'
      );
      return;
    }

    // 2. Size validation: max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      this.setDocumentError(
        docType,
        'File size exceeds the 5 MB limit. Please choose a smaller image.'
      );
      return;
    }

    if (file.size === 0) {
      this.setDocumentError(docType, 'Selected file is empty.');
      return;
    }

    this.uploadDocument(docType, file);
  }

  uploadDocument(docType: DocumentUploadType, file: File): void {
    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.errorMessage.set(
        'Your registration authorization session has expired or is invalid. Please verify your email again.'
      );
      return;
    }

    this.errorMessage.set(null);
    this.setDocumentUploading(docType, true, file.name);

    const formData = new FormData();
    formData.append(docType, file, file.name);

    this.otpService.uploadIdentityDocuments(formData, token).subscribe({
      next: (res) => {
        this.setDocumentUploadedSuccess(docType, file.name);
        this.syncDocumentsFromDraft(res);
      },
      error: (err: ProviderApiError) => {
        this.setDocumentUploading(docType, false);
        this.setDocumentError(docType, err.message);
      },
    });
  }

  private setDocumentUploading(
    docType: DocumentUploadType,
    isUploading: boolean,
    fileName?: string
  ): void {
    const updater = (s: DocumentUploadState) => ({
      ...s,
      isUploading,
      fileName: fileName ?? s.fileName,
      errorMessage: isUploading ? null : s.errorMessage,
    });
    if (docType === 'nic_front') this.nicFrontState.update(updater);
    if (docType === 'nic_back') this.nicBackState.update(updater);
    if (docType === 'selfie') this.selfieState.update(updater);
  }

  private setDocumentUploadedSuccess(
    docType: DocumentUploadType,
    fileName: string
  ): void {
    const updater = (s: DocumentUploadState) => ({
      ...s,
      isUploaded: true,
      isUploading: false,
      fileName,
      errorMessage: null,
    });

    if (docType === 'nic_front') {
      this.nicFrontState.update(updater);
      this.stateService.setIdentityDocumentsStatus(
        this.stateService.selfieUploaded(),
        true,
        this.stateService.nicBackUploaded()
      );
    }
    if (docType === 'nic_back') {
      this.nicBackState.update(updater);
      this.stateService.setIdentityDocumentsStatus(
        this.stateService.selfieUploaded(),
        this.stateService.nicFrontUploaded(),
        true
      );
    }
    if (docType === 'selfie') {
      this.selfieState.update(updater);
      this.stateService.setIdentityDocumentsStatus(
        true,
        this.stateService.nicFrontUploaded(),
        this.stateService.nicBackUploaded()
      );
    }
  }

  private setDocumentError(docType: DocumentUploadType, message: string): void {
    const updater = (s: DocumentUploadState) => ({
      ...s,
      isUploading: false,
      errorMessage: message,
    });
    if (docType === 'nic_front') this.nicFrontState.update(updater);
    if (docType === 'nic_back') this.nicBackState.update(updater);
    if (docType === 'selfie') this.selfieState.update(updater);
  }

  private clearDocumentError(docType: DocumentUploadType): void {
    const updater = (s: DocumentUploadState) => ({
      ...s,
      errorMessage: null,
    });
    if (docType === 'nic_front') this.nicFrontState.update(updater);
    if (docType === 'nic_back') this.nicBackState.update(updater);
    if (docType === 'selfie') this.selfieState.update(updater);
  }

  syncDocumentsFromDraft(draft: DraftResponse, reconcileMissing = false): void {
    const legacyDraft = draft.identity_document_type != null
      && draft.identity_document_type !== 'nic';
    const documents = [
      { state: this.nicFrontState, uploaded: !!draft.nic_front_uploaded, name: 'Front document uploaded' },
      { state: this.nicBackState, uploaded: !!draft.nic_back_uploaded, name: 'Back document uploaded' },
      { state: this.selfieState, uploaded: !!draft.selfie_uploaded, name: 'Selfie uploaded' },
    ];

    for (const { state, uploaded, name } of documents) {
      if (!legacyDraft && uploaded) {
        state.update((current) => ({
          ...current,
          isUploaded: true,
          fileName: current.fileName || name,
        }));
      } else if (reconcileMissing) {
        state.set({
          file: null,
          fileName: null,
          isUploaded: false,
          isUploading: false,
          errorMessage: null,
        });
      }
    }

    this.stateService.setIdentityDocumentsStatus(
      this.selfieState().isUploaded,
      this.nicFrontState().isUploaded,
      this.nicBackState().isUploaded,
    );
  }

  onContinueToReviewSubmit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.isIdentityComplete()) {
      this.errorMessage.set('Please upload your NIC front side, NIC back side, and a selfie with NIC.');
      return;
    }

    this.stateService.completeIdentityVerification();
    this.reviewDraft.set(null);
    this.reviewConfirmed.set(false);
    this.loadReviewDraft();
  }

  loadReviewDraft(): void {
    if (this.reviewLoading() || this.isSubmitting() || this.submittedApplication()) return;
    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.showReviewError({ status: 401, message: '' });
      return;
    }

    this.reviewLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.otpService.getRegistrationDraft(token).subscribe({
      next: (draft) => {
        this.reviewLoading.set(false);
        this.reviewNeedsVerification.set(false);
        this.restoreReviewDetails(draft);
        if (draft.identity_document_type && draft.identity_document_type !== 'nic') {
          this.editReviewPersonalDetails();
          return;
        }
        this.reviewDraft.set(draft);
      },
      error: (error: ProviderApiError) => {
        this.reviewLoading.set(false);
        this.showReviewError(error);
      },
    });
  }

  private restoreReviewDetails(draft: DraftResponse): void {
    if (draft.full_name) {
      this.stateService.setPersonalDetails({
        fullName: draft.full_name,
        email: draft.email,
        phone: draft.phone ?? '',
        dateOfBirth: draft.date_of_birth ?? '',
        gender: draft.gender ?? '',
        nationality: draft.nationality ?? '',
        nicNumber: draft.identity_document_type === 'nic' ? draft.nic_number ?? '' : '',
        residentialAddress: draft.permanent_landmark ?? '',
        province: draft.permanent_province ?? '',
        district: draft.permanent_district ?? '',
        city: draft.permanent_city ?? '',
        postalCode: draft.permanent_postal_code ?? '',
      });
    }
    if (draft.business_name) {
      this.stateService.setBusinessDetails({
        businessName: draft.business_name,
        category: draft.provider_type ?? '',
        contactNumber: draft.secondary_phone ?? '',
        registrationNumber: draft.business_registration_number ?? '',
        description: draft.description ?? '',
        businessStreetAddress: draft.business_landmark ?? '',
        businessProvince: draft.business_province ?? '',
        businessDistrict: draft.business_district ?? '',
        businessCity: draft.business_city ?? '',
        businessPostalCode: draft.business_postal_code ?? '',
      });
    }
    this.syncDocumentsFromDraft(draft, true);
  }

  editReviewPersonalDetails(): void {
    this.errorMessage.set(null);
    this.stateService.goToPersonalDetails();
    this.loadPersonalDetailsToForm();
  }

  reverifyReviewEmail(): void {
    this.reviewConfirmed.set(false);
    this.onChangeEmail();
  }

  submitForApproval(): void {
    if (
      this.stateService.currentStepId() !== 'review_submit' ||
      this.isSubmitting() || this.reviewLoading() ||
      this.submittedApplication() || this.reviewNeedsVerification() || !this.reviewConfirmed() || !this.reviewReady()
    ) return;

    const token = this.stateService.getAuthorizationToken();
    if (!token) {
      this.showReviewError({ status: 401, message: '' });
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    this.otpService.submitRegistration(token).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (result.submitted) {
          this.submittedApplication.set(result);
          this.reviewDraft.set(null);
          this.stateService.clearAuthorization();
        } else {
          this.errorMessage.set(result.message || 'The application could not be submitted.');
        }
      },
      error: (error: ProviderApiError) => {
        this.isSubmitting.set(false);
        this.showReviewError(error);
      },
    });
  }

  private showReviewError(error: ProviderApiError): void {
    if (error.status === 401 || error.status === 403) {
      this.reviewNeedsVerification.set(true);
      this.errorMessage.set(
        'Your registration authorization is no longer valid. Verify your email again to check your application and continue.',
      );
    } else {
      this.errorMessage.set(error.message);
    }
  }

  returnToProviderPortal(): void {
    this.stateService.clearRegistrationState();
    this.router.navigate(['/provider']);
  }

  onBackToIdentityVerification(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.stateService.backToIdentityVerification();
  }
}
