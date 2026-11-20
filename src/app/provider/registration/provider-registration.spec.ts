import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderOtpService } from './services/provider-otp.service';
import { ProviderRegistrationStateService } from './services/provider-registration-state.service';
import { DraftResponse, RegistrationSubmitResponse } from './models/provider-otp.model';
import { ProviderRegistration } from './provider-registration';

describe('ProviderRegistration Component', () => {
  let component: ProviderRegistration;
  let fixture: ComponentFixture<ProviderRegistration>;
  let otpServiceMock: {
    sendOtp: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
    savePersonalDetails: ReturnType<typeof vi.fn>;
    saveBusinessDetails: ReturnType<typeof vi.fn>;
    uploadIdentityDocuments: ReturnType<typeof vi.fn>;
    getRegistrationDraft: ReturnType<typeof vi.fn>;
    submitRegistration: ReturnType<typeof vi.fn>;
  };
  let stateService: ProviderRegistrationStateService;

  beforeEach(async () => {
    otpServiceMock = {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      savePersonalDetails: vi.fn(),
      saveBusinessDetails: vi.fn(),
      uploadIdentityDocuments: vi.fn(),
      getRegistrationDraft: vi.fn().mockReturnValue(of({ email: 'review@example.test' })),
      submitRegistration: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderRegistration],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ProviderOtpService, useValue: otpServiceMock },
        ProviderRegistrationStateService,
      ],
    }).compileComponents();

    stateService = TestBed.inject(ProviderRegistrationStateService);
    stateService.clearRegistrationState();

    fixture = TestBed.createComponent(ProviderRegistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand logo, Provider Portal title, Help and Back to Home links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-logo')).toBeTruthy();
    expect(compiled.querySelector('.portal-title')?.textContent).toContain('Provider Portal');
    expect(compiled.querySelector('.help-link')?.textContent).toContain('Help');
    expect(compiled.querySelector('.home-link')?.textContent).toContain('Back to Home');
  });

  it('should render page heading and 5-step progress indicator', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.main-heading')?.textContent).toContain('Create Your Provider Account');

    const steps = compiled.querySelectorAll('.step-item');
    expect(steps.length).toBe(5);
    expect(steps[0].classList.contains('active')).toBe(true);
    expect(steps[0].textContent).toContain('Email Verification');
    expect(steps[1].classList.contains('active')).toBe(false);
    expect(steps[1].textContent).toContain('Personal Details');
    expect(steps[2].textContent).toContain('Business Details');
    expect(steps[3].textContent).toContain('Identity Verification');
    expect(steps[4].textContent).toContain('Review & Submit');
  });

  it('should show required error when email is empty and touched', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailControl = component.emailForm.controls.email;

    emailControl.setValue('');
    emailControl.markAsTouched();
    fixture.detectChanges();

    expect(component.emailForm.invalid).toBe(true);
    expect(compiled.querySelector('.field-error-msg')?.textContent).toContain('Please enter your business email');
  });

  it('should show format error when email format is invalid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailControl = component.emailForm.controls.email;

    emailControl.setValue('invalid-email');
    emailControl.markAsTouched();
    fixture.detectChanges();

    expect(component.emailForm.invalid).toBe(true);
    expect(compiled.querySelector('.field-error-msg')?.textContent).toContain('Please enter a valid email address');
  });

  it('should be valid when valid email is entered', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailControl = component.emailForm.controls.email;

    emailControl.setValue('valid@business.com');
    emailControl.markAsTouched();
    fixture.detectChanges();

    expect(component.emailForm.valid).toBe(true);
    expect(compiled.querySelector('.field-error-msg')).toBeNull();
  });

  it('should call sendOtp and transition to otp_entry state on valid email submission', () => {
    otpServiceMock.sendOtp.mockReturnValue(
      of({
        message: 'Verification code sent successfully.',
        email: 'provider@business.com',
      })
    );

    component.emailForm.controls.email.setValue('provider@business.com');
    component.onSendVerificationCode();
    fixture.detectChanges();

    expect(otpServiceMock.sendOtp).toHaveBeenCalledWith('provider@business.com');
    expect(component.flowState).toBe('otp_entry');
    expect(component.activeEmail).toBe('provider@business.com');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.form-title')?.textContent).toContain('Enter Verification Code');
    expect(compiled.querySelectorAll('.otp-digit-box').length).toBe(6);
  });

  it('should display error banner if sendOtp fails (e.g. 409 conflict with traveler account)', () => {
    otpServiceMock.sendOtp.mockReturnValue(
      throwError(() => ({
        status: 409,
        message: 'This email is already registered as a traveler account. A single email cannot be registered for both account types.',
      }))
    );

    component.emailForm.controls.email.setValue('traveler@test.com');
    component.onSendVerificationCode();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('already registered as a traveler account');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('already registered as a traveler account');
  });

  it('should enable Verify button only when all 6 OTP digits are entered', () => {
    stateService.setOtpSent('provider@business.com', 60);
    fixture.detectChanges();

    expect(component.isOtpComplete()).toBe(false);

    // Enter 5 digits
    ['1', '2', '3', '4', '5'].forEach((d, i) => {
      component.digitsArray.at(i).setValue(d);
    });
    expect(component.isOtpComplete()).toBe(false);

    // Enter 6th digit
    component.digitsArray.at(5).setValue('6');
    expect(component.isOtpComplete()).toBe(true);
  });

  it('should call verifyOtp and transition to verified_action state on success', () => {
    stateService.setOtpSent('provider@business.com', 60);
    fixture.detectChanges();

    ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
      component.digitsArray.at(i).setValue(d);
    });

    otpServiceMock.verifyOtp.mockReturnValue(
      of({
        verified: true,
        next_action: 'continue_registration',
        authorization_token: 'valid_auth_token_xyz',
        expires_in: 1800,
        message: 'Email verified successfully.',
      })
    );

    component.onVerifyOtp();
    fixture.detectChanges();

    expect(otpServiceMock.verifyOtp).toHaveBeenCalledWith('provider@business.com', '123456');
    expect(component.flowState).toBe('verified_action');
    expect(stateService.hasValidAuthorizationToken()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.feedback-title')?.textContent).toContain('Email Verified Successfully');
    expect(compiled.querySelector('.btn-primary-action')?.textContent).toContain('Continue to Personal Details');

    // Verify step progression: Step 1 completed (green checkmark), Step 2 (Personal Details) active
    const steps = compiled.querySelectorAll('.step-item');
    expect(steps[0].classList.contains('completed')).toBe(true);
    expect(steps[1].classList.contains('active')).toBe(true);
  });

  it('should handle account state application_pending properly', () => {
    stateService.setOtpSent('pending@business.com', 60);
    fixture.detectChanges();

    ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
      component.digitsArray.at(i).setValue(d);
    });

    otpServiceMock.verifyOtp.mockReturnValue(
      of({
        verified: true,
        next_action: 'application_pending',
        authorization_token: null,
        expires_in: null,
        message: 'Your provider application is currently pending admin review.',
      })
    );

    component.onVerifyOtp();
    fixture.detectChanges();

    expect(component.flowState).toBe('verified_action');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.feedback-title')?.textContent).toContain('Application Under Review');
  });

  it('should handle account state login_required properly', () => {
    stateService.setOtpSent('active@business.com', 60);
    fixture.detectChanges();

    ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
      component.digitsArray.at(i).setValue(d);
    });

    otpServiceMock.verifyOtp.mockReturnValue(
      of({
        verified: true,
        next_action: 'login_required',
        authorization_token: null,
        expires_in: null,
        message: 'Your provider account is active. Please proceed to login.',
      })
    );

    component.onVerifyOtp();
    fixture.detectChanges();

    expect(component.flowState).toBe('verified_action');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.feedback-title')?.textContent).toContain('Account Already Active');
  });

  it('should allow returning to email entry via onChangeEmail', () => {
    stateService.setOtpSent('provider@business.com', 60);
    fixture.detectChanges();

    expect(component.flowState).toBe('otp_entry');

    component.onChangeEmail();
    fixture.detectChanges();

    expect(component.flowState).toBe('email_entry');
  });

  // =========================================================================
  // STEP 2 — PERSONAL DETAILS TESTS
  // =========================================================================

  describe('Step 2: Personal Details', () => {
    beforeEach(() => {
      // Simulate successful OTP verification with auth token
      stateService.setOtpVerified({
        verified: true,
        next_action: 'continue_registration',
        authorization_token: 'mock-valid-auth-token-12345',
        expires_in: 1800,
        message: 'Email verified successfully.',
      });
      stateService.setEmail('verified-provider@business.com');
      component.onContinueNextStep();
      fixture.detectChanges();
    });

    it('should transition to personal_details step and display Personal Details heading and description', () => {
      expect(component.flowState).toBe('personal_details');
      const compiled = fixture.nativeElement as HTMLElement;

      const title = compiled.querySelector('.personal-details-container .form-title');
      expect(title?.textContent).toContain('Personal Details');

      const desc = compiled.querySelector('.personal-details-container .form-description');
      expect(desc?.textContent).toContain(
        'Provide your personal information as the primary contact for your business.'
      );

      // Verify orange profile icon
      expect(compiled.querySelector('.header-icon-orange')).toBeTruthy();

      // Verify left illustration & 3 benefits are preserved
      expect(compiled.querySelector('.card-side-title')?.textContent).toContain(
        'Join CeylonGo as a Service Provider'
      );
      const benefits = compiled.querySelectorAll('.benefit-item');
      expect(benefits.length).toBe(3);
    });

    it('should display the 5-step progress indicator with Step 1 completed and Step 2 active', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const steps = compiled.querySelectorAll('.step-item');

      expect(steps.length).toBe(5);
      expect(steps[0].classList.contains('completed')).toBe(true);
      expect(steps[1].classList.contains('active')).toBe(true);
      expect(steps[2].classList.contains('active')).toBe(false);
      expect(steps[3].classList.contains('active')).toBe(false);
      expect(steps[4].classList.contains('active')).toBe(false);
    });

    it('should display read-only verified email with green "Verified" badge', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#verified-email') as HTMLInputElement;

      expect(emailInput).toBeTruthy();
      expect(emailInput.value).toBe('verified-provider@business.com');
      expect(emailInput.readOnly).toBe(true);

      const verifiedBadge = compiled.querySelector('.badge-verified');
      expect(verifiedBadge).toBeTruthy();
      expect(verifiedBadge?.textContent).toContain('Verified');
    });

    it('should validate required fields when Continue to Business Details is clicked with empty form', () => {
      component.onContinueToBusinessDetails();
      fixture.detectChanges();

      expect(component.personalDetailsForm.invalid).toBe(true);
      expect(component.errorMessage()).toContain('Please fill in all required personal details');

      const compiled = fixture.nativeElement as HTMLElement;
      const errors = compiled.querySelectorAll('.field-error-msg');
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });

    it('should validate Sri Lankan phone number format', () => {
      const phoneCtrl = component.personalDetailsForm.controls.phone;

      phoneCtrl.setValue('12345');
      phoneCtrl.markAsTouched();
      fixture.detectChanges();
      expect(phoneCtrl.invalid).toBe(true);
      expect(component.getFieldError('phone')).toContain('valid Sri Lankan phone number');

      phoneCtrl.setValue('0771234567');
      expect(phoneCtrl.valid).toBe(true);

      phoneCtrl.setValue('+94771234567');
      expect(phoneCtrl.valid).toBe(true);
    });

    it('should reject future dates for Date of Birth', () => {
      const dobCtrl = component.personalDetailsForm.controls.dateOfBirth;

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      dobCtrl.setValue(futureDateStr);
      dobCtrl.markAsTouched();
      fixture.detectChanges();
      expect(dobCtrl.invalid).toBe(true);
      expect(component.getFieldError('dateOfBirth')).toContain('cannot be in the future');

      dobCtrl.setValue('1990-05-15');
      expect(dobCtrl.valid).toBe(true);
    });

    it('validates the required NIC field without a document type selector', () => {
      const page = fixture.nativeElement as HTMLElement;
      expect(page.querySelector('#identity-doc-type')).toBeNull();
      expect(page.querySelector('label[for="nic-number"]')?.textContent).toContain('NIC Number');
      const nicCtrl = component.personalDetailsForm.controls.nicNumber;

      nicCtrl.setValue('invalid-nic');
      nicCtrl.markAsTouched();
      fixture.detectChanges();
      expect(nicCtrl.invalid).toBe(true);
      expect(component.getFieldError('nicNumber')).toContain('valid Sri Lankan NIC');

      // Valid old NIC (9 digits + V/X)
      nicCtrl.setValue('123456789V');
      expect(nicCtrl.valid).toBe(true);

      nicCtrl.setValue('987654321x');
      expect(nicCtrl.valid).toBe(true);

      // Valid new NIC (12 digits)
      nicCtrl.setValue('200012345678');
      expect(nicCtrl.valid).toBe(true);

      // Rejects non-NIC numbers
      nicCtrl.setValue('N1234567');
      expect(nicCtrl.invalid).toBe(true);
    });

    it('should validate required city, postal code, and residential street address fields', () => {
      const cityCtrl = component.personalDetailsForm.controls.city;
      const postalCtrl = component.personalDetailsForm.controls.postalCode;
      const addressCtrl = component.personalDetailsForm.controls.residentialAddress;

      cityCtrl.setValue('');
      cityCtrl.markAsTouched();
      expect(cityCtrl.invalid).toBe(true);
      expect(component.getFieldError('city')).toContain('Please enter your city or town');

      cityCtrl.setValue('K');
      expect(cityCtrl.invalid).toBe(true);
      expect(component.getFieldError('city')).toContain('at least 2 characters');

      cityCtrl.setValue('Kandy');
      expect(cityCtrl.valid).toBe(true);

      postalCtrl.setValue('');
      postalCtrl.markAsTouched();
      expect(postalCtrl.invalid).toBe(true);
      expect(component.getFieldError('postalCode')).toContain('Please enter your postal code');

      postalCtrl.setValue('abcde');
      expect(postalCtrl.invalid).toBe(true);
      expect(component.getFieldError('postalCode')).toContain('valid postal code');

      postalCtrl.setValue('20000');
      expect(postalCtrl.valid).toBe(true);

      addressCtrl.setValue('');
      addressCtrl.markAsTouched();
      expect(addressCtrl.invalid).toBe(true);
      expect(component.getFieldError('residentialAddress')).toContain('Please enter your residential street address');

      addressCtrl.setValue('No 45');
      expect(addressCtrl.valid).toBe(true);
    });

    it('should dynamically update districts when province is selected and reset on change', () => {
      expect(component.availableDistricts().length).toBe(0);

      // Select Western province
      component.personalDetailsForm.controls.province.setValue('Western');
      component.onProvinceChange();
      fixture.detectChanges();

      expect(component.availableDistricts()).toEqual(['Colombo', 'Gampaha', 'Kalutara']);

      // Select Colombo district
      component.personalDetailsForm.controls.district.setValue('Colombo');
      expect(component.personalDetailsForm.controls.district.value).toBe('Colombo');

      // Change province to Central
      component.personalDetailsForm.controls.province.setValue('Central');
      component.onProvinceChange();
      fixture.detectChanges();

      expect(component.availableDistricts()).toEqual(['Kandy', 'Matale', 'Nuwara Eliya']);
      expect(component.personalDetailsForm.controls.district.value).toBe(''); // District was reset
    });

    it('should preserve entered data and not invalidate session when Back to Email Verification is clicked', () => {
      component.personalDetailsForm.patchValue({
        fullName: 'Kasun Perera',
        phone: '0771234567',
        dateOfBirth: '1992-04-10',
        gender: 'Male',
        nationality: 'Sri Lankan',
        nicNumber: '199212345678',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo',
        postalCode: '00100',
        residentialAddress: '123 Galle Road, Colombo 03',
      });

      component.onBackToEmail();
      fixture.detectChanges();

      expect(component.flowState).toBe('verified_action');
      expect(stateService.hasValidAuthorizationToken()).toBe(true);
      expect(stateService.getPersonalDetails()?.fullName).toBe('Kasun Perera');
      expect(stateService.getPersonalDetails()?.city).toBe('Colombo');
      expect(stateService.getPersonalDetails()?.postalCode).toBe('00100');

      // Re-enter personal details
      component.onContinueNextStep();
      fixture.detectChanges();

      expect(component.flowState).toBe('personal_details');
      expect(component.personalDetailsForm.controls.fullName.value).toBe('Kasun Perera');
      expect(component.personalDetailsForm.controls.city.value).toBe('Colombo');
      expect(component.personalDetailsForm.controls.postalCode.value).toBe('00100');
      expect(component.personalDetailsForm.controls.residentialAddress.value).toBe(
        '123 Galle Road, Colombo 03'
      );
    });

    it('should submit mapped payload to backend on valid submission without address guessing and advance to business_details', () => {
      component.personalDetailsForm.patchValue({
        fullName: 'Kasun Perera',
        phone: '0771234567',
        dateOfBirth: '1992-04-10',
        gender: 'Male',
        nationality: 'Sri Lankan',
        nicNumber: '199212345678',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo',
        postalCode: '00100',
        residentialAddress: '123 Galle Road, Colombo 03',
      });

      component.syncDocumentsFromDraft({
        email: 'verified-provider@business.com',
        identity_document_type: 'nic',
        nic_front_uploaded: true,
        nic_back_uploaded: true,
        selfie_uploaded: true,
      });
      expect(component.isIdentityComplete()).toBe(true);

      otpServiceMock.savePersonalDetails.mockReturnValue(
        of({
          email: 'verified-provider@business.com',
          full_name: 'Kasun Perera',
          phone: '0771234567',
          identity_document_type: 'nic',
          nic_number: '199212345678',
          date_of_birth: '1992-04-10',
          gender: 'Male',
          nationality: 'Sri Lankan',
          permanent_province: 'Western',
          permanent_district: 'Colombo',
          permanent_city: 'Colombo',
          permanent_landmark: '123 Galle Road, Colombo 03',
          permanent_postal_code: '00100',
          registration_step: 'business',
        })
      );

      component.onContinueToBusinessDetails();
      fixture.detectChanges();

      expect(otpServiceMock.savePersonalDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Kasun Perera',
          phone: '0771234567',
          identity_document_type: 'nic',
          nic_number: '199212345678',
          date_of_birth: '1992-04-10',
          gender: 'Male',
          nationality: 'Sri Lankan',
          permanent_province: 'Western',
          permanent_district: 'Colombo',
          permanent_city: 'Colombo',
          permanent_postal_code: '00100',
          permanent_landmark: '123 Galle Road, Colombo 03',
        }),
        'mock-valid-auth-token-12345'
      );

      expect(component.isIdentityComplete()).toBe(false);
      expect(component.flowState).toBe('business_details');
      expect(stateService.currentStepId()).toBe('business_details');

      // Stepper verification: Step 1 completed, Step 2 completed, Step 3 active
      const compiled = fixture.nativeElement as HTMLElement;
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps[0].classList.contains('completed')).toBe(true);
      expect(steps[1].classList.contains('completed')).toBe(true);
      expect(steps[2].classList.contains('active')).toBe(true);
    });

    it('should handle backend error (e.g. 409 NIC duplicate) gracefully and display error banner', () => {
      component.personalDetailsForm.patchValue({
        fullName: 'Kasun Perera',
        phone: '0771234567',
        dateOfBirth: '1992-04-10',
        gender: 'Male',
        nationality: 'Sri Lankan',
        nicNumber: '199212345678',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo',
        postalCode: '00100',
        residentialAddress: '123 Galle Road, Colombo 03',
      });

      otpServiceMock.savePersonalDetails.mockReturnValue(
        throwError(() => ({
          status: 409,
          message: 'This NIC number is already associated with another provider account.',
        }))
      );

      component.onContinueToBusinessDetails();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain(
        'This NIC number is already associated with another provider account.'
      );
      expect(component.flowState).toBe('personal_details');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-error')?.textContent).toContain(
        'This NIC number is already associated with another provider account.'
      );
    });
  });

  describe('Step 3: Business Details Flow', () => {
    beforeEach(() => {
      stateService.setOtpVerified({
        verified: true,
        next_action: 'continue_registration',
        authorization_token: 'mock-valid-auth-token-12345',
        expires_in: 1800,
      });
      stateService.setPersonalDetails({
        fullName: 'Kasun Perera',
        email: 'verified-provider@business.com',
        phone: '0771234567',
        dateOfBirth: '1992-04-10',
        gender: 'Male',
        nationality: 'Sri Lankan',
        nicNumber: '199212345678',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo',
        postalCode: '00100',
        residentialAddress: '123 Galle Road, Colombo 03',
      });
      stateService.goToBusinessDetails();
      component.loadBusinessDetailsToForm();
      fixture.detectChanges();
    });

    it('should set 5-step stepper to Step 1 & 2 completed, Step 3 active', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps.length).toBe(5);
      expect(steps[0].classList.contains('completed')).toBe(true);
      expect(steps[1].classList.contains('completed')).toBe(true);
      expect(steps[2].classList.contains('active')).toBe(true);
      expect(steps[3].classList.contains('disabled')).toBe(true);
      expect(steps[4].classList.contains('disabled')).toBe(true);
    });

    it('should render storefront illustration and 3 value propositions in left column', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.business-illustration')).toBeTruthy();
      expect(compiled.querySelector('.card-side-title')?.textContent).toContain(
        'Set Up Your Business on CeylonGo'
      );

      const benefits = compiled.querySelectorAll('.benefit-text');
      expect(benefits.length).toBe(3);
      expect(benefits[0].textContent).toContain('Showcase your service or property');
      expect(benefits[1].textContent).toContain('Get more customer bookings');
      expect(benefits[2].textContent).toContain('Grow your local business');
    });

    it('should render Business Details header with icon and 10 form fields in right column', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.form-title')?.textContent).toContain('Business Details');
      expect(compiled.querySelector('.form-description')?.textContent).toContain(
        'Provide information about your business or service.'
      );

      // Check all 10 fields exist in right column
      expect(compiled.querySelector('#business-name')).toBeTruthy();
      expect(compiled.querySelector('#business-category')).toBeTruthy();
      expect(compiled.querySelector('#business-contact')).toBeTruthy();
      expect(compiled.querySelector('#business-reg-no')).toBeTruthy();
      expect(compiled.querySelector('#business-province')).toBeTruthy();
      expect(compiled.querySelector('#business-district')).toBeTruthy();
      expect(compiled.querySelector('#business-city')).toBeTruthy();
      expect(compiled.querySelector('#business-postal')).toBeTruthy();
      expect(compiled.querySelector('#business-street-address')).toBeTruthy();
      expect(compiled.querySelector('#business-description')).toBeTruthy();
    });

    it('should populate business category dropdown with 5 CeylonGo categories', () => {
      expect(component.businessCategories.length).toBe(5);
      const compiled = fixture.nativeElement as HTMLElement;
      const select = compiled.querySelector('#business-category') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      // 1 disabled placeholder + 5 categories = 6 options
      expect(options.length).toBe(6);
      expect(options[1].textContent).toContain('Homestay / Accommodation');
      expect(options[2].textContent).toContain('Local Tour Guide');
      expect(options[3].textContent).toContain('Local Activities & Experiences');
      expect(options[4].textContent).toContain('Eco-Tourism');
      expect(options[5].textContent).toContain('Local Artisan & Small Business');
    });

    it('should populate business province dropdown with all 9 Sri Lankan provinces', () => {
      expect(component.provinces.length).toBe(9);
      const compiled = fixture.nativeElement as HTMLElement;
      const select = compiled.querySelector('#business-province') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      // 1 disabled placeholder + 9 provinces = 10 options
      expect(options.length).toBe(10);
      expect(options[1].textContent).toContain('Western');
      expect(options[2].textContent).toContain('Central');
      expect(options[3].textContent).toContain('Southern');
    });

    it('should dynamically update business districts when province is selected and reset on change', () => {
      expect(component.availableBusinessDistricts().length).toBe(0);
      expect(component.businessDetailsForm.controls.businessDistrict.disabled).toBe(true);

      // Select Western province
      component.businessDetailsForm.controls.businessProvince.setValue('Western');
      component.onBusinessProvinceChange();
      fixture.detectChanges();

      expect(component.availableBusinessDistricts()).toEqual(['Colombo', 'Gampaha', 'Kalutara']);
      expect(component.businessDetailsForm.controls.businessDistrict.enabled).toBe(true);

      // Select Colombo district
      component.businessDetailsForm.controls.businessDistrict.setValue('Colombo');
      expect(component.businessDetailsForm.controls.businessDistrict.value).toBe('Colombo');

      // Change province to Central
      component.businessDetailsForm.controls.businessProvince.setValue('Central');
      component.onBusinessProvinceChange();
      fixture.detectChanges();

      expect(component.availableBusinessDistricts()).toEqual(['Kandy', 'Matale', 'Nuwara Eliya']);
      expect(component.businessDetailsForm.controls.businessDistrict.value).toBe(''); // District was reset
    });

    it('should validate required fields when submitted empty', () => {
      component.businessDetailsForm.reset();
      component.onContinueToIdentityVerification();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Please fill in all required business details correctly.');
      expect(component.isBusinessFieldInvalid('businessName')).toBe(true);
      expect(component.isBusinessFieldInvalid('category')).toBe(true);
      expect(component.isBusinessFieldInvalid('contactNumber')).toBe(true);
      expect(component.isBusinessFieldInvalid('businessProvince')).toBe(true);
      expect(component.businessDetailsForm.controls.businessDistrict.disabled).toBe(true);
      expect(component.isBusinessFieldInvalid('businessCity')).toBe(true);
      expect(component.isBusinessFieldInvalid('businessPostalCode')).toBe(true);
      expect(component.isBusinessFieldInvalid('businessStreetAddress')).toBe(true);
      expect(component.isBusinessFieldInvalid('description')).toBe(true);
      // Optional field should NOT be invalid
      expect(component.isBusinessFieldInvalid('registrationNumber')).toBe(false);

      // Once province is selected, district becomes enabled and requires selection
      component.businessDetailsForm.controls.businessProvince.setValue('Central');
      component.onBusinessProvinceChange();
      component.businessDetailsForm.controls.businessDistrict.markAsTouched();
      fixture.detectChanges();
      expect(component.isBusinessFieldInvalid('businessDistrict')).toBe(true);
    });

    it('should validate Sri Lankan phone numbers for contact number', () => {
      const ctrl = component.businessDetailsForm.controls.contactNumber;
      ctrl.setValue('12345');
      ctrl.markAsTouched();
      expect(ctrl.invalid).toBe(true);
      expect(component.getBusinessFieldError('contactNumber')).toContain('valid Sri Lankan phone number');

      ctrl.setValue('+94 76 582 1987');
      expect(ctrl.valid).toBe(true);

      ctrl.setValue('0771234567');
      expect(ctrl.valid).toBe(true);
    });

    it('should validate business postal code format', () => {
      const ctrl = component.businessDetailsForm.controls.businessPostalCode;
      ctrl.setValue('12');
      ctrl.markAsTouched();
      expect(ctrl.invalid).toBe(true);

      ctrl.setValue('20000');
      expect(ctrl.valid).toBe(true);

      ctrl.setValue('00100');
      expect(ctrl.valid).toBe(true);
    });

    it('should update description character count dynamically', () => {
      const descCtrl = component.businessDetailsForm.controls.description;
      expect(component.descriptionCharCount).toBe(0);

      descCtrl.setValue('Cozy homestay near Kandy lake');
      expect(component.descriptionCharCount).toBe(29);

      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      const counterEl = compiled.querySelector('#bdesc-counter');
      expect(counterEl?.textContent).toContain('29 / 500');
    });

    it('should preserve entered structured location data when Back to Personal Details is clicked', () => {
      component.businessDetailsForm.patchValue({
        businessName: 'Ceylon Homestay',
        category: 'homestay',
        contactNumber: '+94 76 582 1987',
        registrationNumber: 'PV12345678',
        businessProvince: 'Central',
        businessDistrict: 'Kandy',
        businessCity: 'Kandy',
        businessPostalCode: '20000',
        businessStreetAddress: 'No. 78, Lake Road',
        description: 'A cozy homestay in Kandy offering comfortable rooms.',
      });

      component.onBackToPersonalDetails();
      fixture.detectChanges();

      expect(component.flowState).toBe('personal_details');
      expect(stateService.currentStepId()).toBe('personal_details');
      expect(stateService.getBusinessDetails()?.businessName).toBe('Ceylon Homestay');
      expect(stateService.getBusinessDetails()?.businessProvince).toBe('Central');
      expect(stateService.getBusinessDetails()?.businessDistrict).toBe('Kandy');
      expect(stateService.getBusinessDetails()?.businessCity).toBe('Kandy');
      expect(stateService.getBusinessDetails()?.businessPostalCode).toBe('20000');
      expect(stateService.getBusinessDetails()?.businessStreetAddress).toBe('No. 78, Lake Road');
      expect(stateService.getPersonalDetails()?.fullName).toBe('Kasun Perera');

      // Return to business details and verify structured data is restored
      otpServiceMock.savePersonalDetails.mockReturnValue(of({}));
      component.onContinueToBusinessDetails();
      fixture.detectChanges();

      expect(component.flowState).toBe('business_details');
      expect(component.businessDetailsForm.controls.businessName.value).toBe('Ceylon Homestay');
      expect(component.businessDetailsForm.controls.category.value).toBe('homestay');
      expect(component.businessDetailsForm.controls.businessProvince.value).toBe('Central');
      expect(component.businessDetailsForm.controls.businessDistrict.value).toBe('Kandy');
      expect(component.businessDetailsForm.controls.businessCity.value).toBe('Kandy');
      expect(component.businessDetailsForm.controls.businessPostalCode.value).toBe('20000');
      expect(component.businessDetailsForm.controls.businessStreetAddress.value).toBe('No. 78, Lake Road');
      expect(component.availableBusinessDistricts()).toEqual(['Kandy', 'Matale', 'Nuwara Eliya']);
    });

    it('should submit mapped payload with explicit location inputs to backend without guessing or falling back', () => {
      // Personal details are Western / Colombo
      expect(stateService.getPersonalDetails()?.province).toBe('Western');
      expect(stateService.getPersonalDetails()?.district).toBe('Colombo');

      // Business details are distinctly Southern / Galle / Hikkaduwa
      component.businessDetailsForm.patchValue({
        businessName: 'Galle Surf Villa',
        category: 'activity',
        contactNumber: '+94 77 123 4567',
        registrationNumber: 'PV99887766',
        businessProvince: 'Southern',
        businessDistrict: 'Galle',
        businessCity: 'Hikkaduwa',
        businessPostalCode: '80240',
        businessStreetAddress: 'No. 12, Coral Reef Road',
        description: 'Authentic beachside surf and adventure experiences in southern Sri Lanka.',
      });

      otpServiceMock.saveBusinessDetails.mockReturnValue(
        of({
          email: 'verified-provider@business.com',
          business_name: 'Galle Surf Villa',
          provider_type: 'activity',
          registration_step: 'identity',
        })
      );

      component.onContinueToIdentityVerification();
      fixture.detectChanges();

      // Ensure explicit business values are passed without defaulting to Western/Colombo or guessing
      expect(otpServiceMock.saveBusinessDetails).toHaveBeenCalledWith(
        {
          business_name: 'Galle Surf Villa',
          provider_type: 'activity',
          secondary_phone: '+94 77 123 4567',
          business_province: 'Southern',
          business_district: 'Galle',
          business_city: 'Hikkaduwa',
          business_postal_code: '80240',
          business_landmark: 'No. 12, Coral Reef Road',
          business_registration_number: 'PV99887766',
          description: 'Authentic beachside surf and adventure experiences in southern Sri Lanka.',
          same_as_permanent: false,
        },
        'mock-valid-auth-token-12345'
      );

      expect(component.flowState).toBe('identity_verification');
      expect(stateService.currentStepId()).toBe('identity_verification');

      // Stepper verification: Step 1, 2, 3 completed, Step 4 active
      const compiled = fixture.nativeElement as HTMLElement;
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps[0].classList.contains('completed')).toBe(true);
      expect(steps[1].classList.contains('completed')).toBe(true);
      expect(steps[2].classList.contains('completed')).toBe(true);
      expect(steps[3].classList.contains('active')).toBe(true);
    });

    it('should handle backend error on business details submission gracefully', () => {
      component.businessDetailsForm.patchValue({
        businessName: 'Ceylon Homestay',
        category: 'homestay',
        contactNumber: '+94 76 582 1987',
        registrationNumber: 'PV12345678',
        businessProvince: 'Central',
        businessDistrict: 'Kandy',
        businessCity: 'Kandy',
        businessPostalCode: '20000',
        businessStreetAddress: 'No. 78, Lake Road',
        description: 'A cozy homestay in Kandy offering comfortable rooms.',
      });

      otpServiceMock.saveBusinessDetails.mockReturnValue(
        throwError(() => ({
          status: 400,
          message: 'Invalid business details submitted.',
        }))
      );

      component.onContinueToIdentityVerification();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('Invalid business details submitted.');
      expect(component.flowState).toBe('business_details');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-error')?.textContent).toContain(
        'Invalid business details submitted.'
      );
    });
  });

  describe('Step 4: Identity Verification', () => {
    beforeEach(() => {
      stateService.setOtpVerified({
        verified: true,
        next_action: 'continue_registration',
        authorization_token: 'auth-token-step4-xyz',
        expires_in: 1800,
      });

      component.personalDetailsForm.patchValue({
        fullName: 'Kasun Bandara',
        phone: '0771234567',
        dateOfBirth: '1990-05-15',
        gender: 'Male',
        nationality: 'Sri Lankan',
        nicNumber: '199012345678',
        province: 'Western',
        district: 'Colombo',
        city: 'Colombo 03',
        postalCode: '00300',
        residentialAddress: 'No. 12, Galle Road',
      });

      component.businessDetailsForm.patchValue({
        businessName: 'Bandara Kandy Homestay',
        category: 'homestay',
        contactNumber: '0812233445',
        businessProvince: 'Central',
        businessDistrict: 'Kandy',
        businessCity: 'Kandy',
        businessPostalCode: '20000',
        businessStreetAddress: 'No. 15, Lake Round Road',
        description: 'Authentic hillside homestay with scenic views.',
      });

      stateService.goToIdentityVerification();
      fixture.detectChanges();
    });

    it('should render exactly three NIC upload cards without a document type selector', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(component.flowState).toBe('identity_verification');

      // Left column verification
      expect(compiled.querySelector('.card-side-title')?.textContent).toContain('Verify Your');
      expect(compiled.querySelector('.card-side-title')?.textContent).toContain('Identity');
      const benefits = compiled.querySelectorAll('.benefits-list .benefit-text');
      expect(benefits.length).toBe(4);
      expect(benefits[0].textContent).toContain('Upload your NIC');
      expect(benefits[1].textContent).toContain('Take a clear selfie');

      // Main form header
      expect(compiled.querySelector('.form-title')?.textContent).toContain('Identity Verification');
      expect(compiled.querySelector('.form-description')?.textContent).toContain(
        'Upload both sides of your NIC and a selfie holding it.'
      );

      expect(compiled.querySelector('.id-type-option')).toBeNull();

      const uploadCards = compiled.querySelectorAll('.upload-card');
      expect(uploadCards.length).toBe(3);
      expect(uploadCards[0].textContent).toContain('Front Side');
      expect(uploadCards[1].textContent).toContain('Back Side');
      expect(uploadCards[2].textContent).toContain('Selfie with NIC');

      // Info banner
      expect(compiled.querySelector('.upload-info-banner')?.textContent).toContain(
        'Your information will be used only for verification and kept secure.'
      );

      // Continue button disabled initially
      const continueBtn = compiled.querySelector('.btn-continue-action') as HTMLButtonElement;
      expect(continueBtn.disabled).toBe(true);
    });

    it('should reject unsupported file formats (e.g. PDF or TXT) with error message', () => {
      const mockPdfFile = new File(['%PDF-1.4 dummy'], 'nic_front.pdf', {
        type: 'application/pdf',
      });
      const mockEvent = {
        target: {
          files: [mockPdfFile],
          value: 'nic_front.pdf',
        },
      } as unknown as Event;

      component.onFileSelected(mockEvent, 'nic_front');
      fixture.detectChanges();

      expect(component.nicFrontState().errorMessage).toContain(
        'Unsupported file format. Please upload a clear JPG, PNG, or WebP image.'
      );
      expect(component.nicFrontState().isUploaded).toBe(false);
      expect(otpServiceMock.uploadIdentityDocuments).not.toHaveBeenCalled();
    });

    it('should reject oversized files exceeding 5MB limit', () => {
      // 6 MB dummy file
      const bigBuffer = new Uint8Array(6 * 1024 * 1024);
      const mockBigFile = new File([bigBuffer], 'huge_selfie.png', {
        type: 'image/png',
      });
      const mockEvent = {
        target: {
          files: [mockBigFile],
          value: 'huge_selfie.png',
        },
      } as unknown as Event;

      component.onFileSelected(mockEvent, 'selfie');
      fixture.detectChanges();

      expect(component.selfieState().errorMessage).toContain(
        'File size exceeds the 5 MB limit. Please choose a smaller image.'
      );
      expect(component.selfieState().isUploaded).toBe(false);
      expect(otpServiceMock.uploadIdentityDocuments).not.toHaveBeenCalled();
    });

    it('should upload valid NIC front image, call service, and display uploaded state with filename', () => {
      const mockFile = new File(['valid image bytes'], 'my_nic_front.jpg', {
        type: 'image/jpeg',
      });
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'my_nic_front.jpg',
        },
      } as unknown as Event;

      otpServiceMock.uploadIdentityDocuments.mockReturnValue(
        of({
          email: 'test@business.com',
          nic_front_uploaded: true,
          nic_back_uploaded: false,
          selfie_uploaded: false,
          identity_completed: false,
          current_step: 'identity',
        })
      );

      component.onFileSelected(mockEvent, 'nic_front');
      fixture.detectChanges();

      expect(otpServiceMock.uploadIdentityDocuments).toHaveBeenCalled();
      expect(component.nicFrontState().isUploaded).toBe(true);
      expect(component.nicFrontState().fileName).toBe('my_nic_front.jpg');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-card.is-uploaded')).toBeTruthy();
      expect(compiled.querySelector('.uploaded-badge')?.textContent).toContain('my_nic_front.jpg');
      expect(compiled.querySelector('.btn-replace')?.textContent).toContain('Replace file');
    });

    it('should enable Continue to Review & Submit once all required NIC documents are uploaded', () => {
      expect(component.isIdentityComplete()).toBe(false);

      // Mock all 3 documents uploaded
      component.nicFrontState.set({
        file: null,
        fileName: 'front.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      component.nicBackState.set({
        file: null,
        fileName: 'back.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      component.selfieState.set({
        file: null,
        fileName: 'selfie.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      fixture.detectChanges();

      expect(component.isIdentityComplete()).toBe(true);

      const compiled = fixture.nativeElement as HTMLElement;
      const continueBtn = compiled.querySelector('.btn-continue-action') as HTMLButtonElement;
      expect(continueBtn.disabled).toBe(false);
    });

    it('requires the NIC back side even when the front and selfie are uploaded', () => {

      component.nicFrontState.set({
        file: null,
        fileName: 'front.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      component.selfieState.set({
        file: null,
        fileName: 'selfie.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      fixture.detectChanges();

      expect(component.isIdentityComplete()).toBe(false);

      const compiled = fixture.nativeElement as HTMLElement;
      const continueBtn = compiled.querySelector('.btn-continue-action') as HTMLButtonElement;
      expect(continueBtn.disabled).toBe(true);
    });

    it('should navigate to Step 5 review when Continue to Review & Submit is clicked', () => {
      // Mock all required files uploaded
      component.nicFrontState.set({
        file: null,
        fileName: 'front.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      component.nicBackState.set({
        file: null,
        fileName: 'back.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      component.selfieState.set({
        file: null,
        fileName: 'selfie.jpg',
        isUploaded: true,
        isUploading: false,
        errorMessage: null,
      });
      fixture.detectChanges();

      component.onContinueToReviewSubmit();
      fixture.detectChanges();

      expect(component.flowState).toBe('review_submit');
      expect(stateService.currentStepId()).toBe('review_submit');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.review-heading')?.textContent).toContain(
        'Review Your Information'
      );

      // Verify Stepper: Step 1, 2, 3, 4 completed, Step 5 active
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps[0].classList.contains('completed')).toBe(true);
      expect(steps[1].classList.contains('completed')).toBe(true);
      expect(steps[2].classList.contains('completed')).toBe(true);
      expect(steps[3].classList.contains('completed')).toBe(true);
      expect(steps[4].classList.contains('active')).toBe(true);
    });

    it('should return to Step 3 Business Details when Back to Business Details is clicked', () => {
      component.onBackToBusinessDetails();
      fixture.detectChanges();

      expect(component.flowState).toBe('business_details');
      expect(stateService.currentStepId()).toBe('business_details');
      expect(component.businessDetailsForm.controls.businessName.value).toBe(
        'Bandara Kandy Homestay'
      );
    });
  });
  describe('Step 5: Review & Submit', () => {
    const draft: DraftResponse = {
      email: 'review@example.test',
      full_name: 'Sample Applicant',
      business_name: 'Sample Business',
      phone: '+94770000000',
      date_of_birth: '1990-03-05',
      provider_type: 'homestay',
      permanent_city: 'Kandy',
      business_postal_code: '20000',
      identity_document_type: 'nic',
      personal_completed: true,
      business_completed: true,
      nic_front_uploaded: true,
      nic_back_uploaded: true,
      selfie_uploaded: true,
      current_step: 'review',
    };
    const result: RegistrationSubmitResponse = {
      submitted: true,
      approval_status: 'pending',
      next_action: 'await_admin_review',
      message: 'Application received.',
    };

    beforeEach(() => {
      stateService.setEmail(draft.email);
      stateService.setOtpVerified({
        verified: true,
        next_action: 'continue_registration',
        authorization_token: 'review-token',
      });
      otpServiceMock.getRegistrationDraft.mockReturnValue(of(draft));
    });

    function openReview(overrides: Partial<DraftResponse> = {}): HTMLElement {
      otpServiceMock.getRegistrationDraft.mockReturnValue(of({ ...draft, ...overrides }));
      component.onContinueNextStep();
      fixture.detectChanges();
      return fixture.nativeElement;
    }

    it('restores a saved NIC draft with its real details and uploaded documents', () => {
      const page = openReview();
      expect(page.querySelector('.review-card-grid')?.textContent)
        .toContain('Sample Applicant');
      expect(page.querySelector('.review-card-grid')?.textContent)
        .toContain('Homestay / Accommodation');
      expect(page.querySelector('.review-card-grid')?.textContent)
        .toContain('5 Mar 1990');
      expect(page.querySelector('.review-card-grid')?.textContent)
        .toContain('review@example.test');
      expect(page.querySelector('.review-documents')?.textContent).toContain('NIC Back Side');
      expect(page.querySelectorAll('.review-document-status.uploaded')).toHaveLength(3);
    });

    it('lists all three NIC documents and blocks submission if one is missing', () => {
      const page = openReview({ nic_back_uploaded: false });
      const documents = page.querySelector('.review-documents');
      expect(documents?.querySelectorAll('.review-document-status')).toHaveLength(3);
      expect(documents?.textContent).toContain('NIC Front Side');
      expect(documents?.textContent).toContain('NIC Back Side');
      expect(documents?.textContent).toContain('Selfie with NIC');
      expect(documents?.textContent).toContain('Upload required');
      component.reviewConfirmed.set(true);
      fixture.detectChanges();
      expect(page.querySelector<HTMLButtonElement>('.review-actions .btn-primary-action')?.disabled)
        .toBe(true);
      component.submitForApproval();
      expect(otpServiceMock.submitRegistration).not.toHaveBeenCalled();
    });

    it('routes a historical passport draft to NIC entry without reusing its number or uploads', () => {
      const page = openReview({ identity_document_type: 'passport', nic_number: 'P1234567' });
      expect(component.flowState).toBe('personal_details');
      expect(page.querySelector('label[for="nic-number"]')?.textContent).toContain('NIC Number');
      expect(component.personalDetailsForm.controls.nicNumber.value).toBe('');
      expect(component.isIdentityComplete()).toBe(false);
      expect(otpServiceMock.savePersonalDetails).not.toHaveBeenCalled();
    });

    it.each([
      ['Personal Details', 'personal_details'],
      ['Business Details', 'business_details'],
      ['Identity Verification', 'identity_verification'],
    ])('returns to %s with the saved draft', (label, step) => {
      const page = openReview();
      page.querySelector<HTMLButtonElement>('[aria-label="Edit ' + label + '"]')?.click();
      expect(component.flowState).toBe(step);
      expect(stateService.personalDetails()?.fullName).toBe(draft.full_name);
      expect(stateService.businessDetails()?.businessName).toBe(draft.business_name);
    });

    it('reloads saved changes when returning to review after a business edit', () => {
      const page = openReview({
        secondary_phone: '+94770000001',
        business_province: 'Central',
        business_district: 'Kandy',
        business_city: 'Kandy',
        business_landmark: 'Test Street',
        description: 'A sample accommodation near central Kandy.',
      });
      page.querySelector<HTMLButtonElement>('[aria-label="Edit Business Details"]')?.click();

      const edited = { ...draft, business_name: 'Updated Sample Business' };
      component.businessDetailsForm.controls.businessName.setValue(edited.business_name);
      otpServiceMock.saveBusinessDetails.mockReturnValue(of(edited));
      component.onContinueToIdentityVerification();
      expect(component.flowState).toBe('identity_verification');
      expect(otpServiceMock.saveBusinessDetails).toHaveBeenCalledWith(
        expect.objectContaining({ business_name: edited.business_name }),
        'review-token',
      );

      otpServiceMock.getRegistrationDraft.mockReturnValue(of(edited));
      component.onContinueToReviewSubmit();
      fixture.detectChanges();
      expect(page.querySelector('.review-card-grid')?.textContent).toContain(edited.business_name);
      expect(component.reviewConfirmed()).toBe(false);
    });

    it('requires confirmation, permits only one in-flight submit and renders success', () => {
      const page = openReview();
      const submit = page.querySelector<HTMLButtonElement>('.review-actions .btn-primary-action')!;
      const confirmation = page.querySelector<HTMLInputElement>('#review-confirmation')!;
      const response = new Subject<RegistrationSubmitResponse>();
      otpServiceMock.submitRegistration.mockReturnValue(response);

      expect(confirmation.checked).toBe(false);
      expect(submit.disabled).toBe(true);
      component.submitForApproval();
      expect(otpServiceMock.submitRegistration).not.toHaveBeenCalled();
      confirmation.click();
      fixture.detectChanges();
      submit.click();
      component.submitForApproval();
      fixture.detectChanges();

      expect(otpServiceMock.submitRegistration).toHaveBeenCalledExactlyOnceWith('review-token');
      expect(submit.disabled).toBe(true);
      expect(submit.textContent).toContain('Submitting');
      response.next(result);
      response.complete();
      fixture.detectChanges();
      expect(page.querySelector('.review-success')?.textContent)
        .toContain('Application Submitted Successfully');
      expect(page.querySelector('.review-success')?.textContent).toContain('Pending Admin Approval');
      expect(stateService.getAuthorizationToken()).toBeNull();
    });

    it.each([
      [400, 'Incomplete personal details.'],
      [409, 'A provider registration already exists.'],
      [0, 'Unable to reach CeylonGo servers.'],
      [401, 'Your registration authorization is no longer valid.'],
    ])('preserves the review when submission fails with status %s', (status, message) => {
      const page = openReview();
      otpServiceMock.submitRegistration.mockReturnValue(throwError(() => ({ status, message })));
      component.reviewConfirmed.set(true);
      component.submitForApproval();
      fixture.detectChanges();
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(page.querySelector('.review-card-grid')?.textContent).toContain('Sample Applicant');
      expect(component.isSubmitting()).toBe(false);
      expect(component.reviewNeedsVerification()).toBe(status === 401);
    });
  });

});
