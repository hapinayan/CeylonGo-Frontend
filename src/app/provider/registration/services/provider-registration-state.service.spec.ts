import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProviderRegistrationStateService } from './provider-registration-state.service';

describe('ProviderRegistrationStateService', () => {
  let service: ProviderRegistrationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProviderRegistrationStateService);
  });

  it('should be created with initial email_entry state and 5 steps', () => {
    expect(service).toBeTruthy();
    expect(service.email()).toBeNull();
    expect(service.flowState()).toBe('email_entry');
    expect(service.currentStepId()).toBe('email_verification');
    expect(service.hasValidAuthorizationToken()).toBe(false);

    const steps = service.steps();
    expect(steps.length).toBe(5);
    expect(steps[0].title).toBe('Email Verification');
    expect(steps[1].title).toBe('Personal Details');
    expect(steps[2].title).toBe('Business Details');
    expect(steps[3].title).toBe('Identity Verification');
    expect(steps[4].title).toBe('Review & Submit');
  });

  it('should format and store normalized email', () => {
    service.setEmail('  PROVIDER@business.COM ');
    expect(service.email()).toBe('provider@business.com');
  });

  it('should transition to otp_entry when setOtpSent is called', () => {
    service.setOtpSent('test@business.com', 45);
    expect(service.email()).toBe('test@business.com');
    expect(service.flowState()).toBe('otp_entry');
    expect(service.resendCooldown()).toBe(45);
  });

  it('should handle cooldown decrementing', () => {
    service.setResendCooldown(2);
    expect(service.resendCooldown()).toBe(2);
    service.decrementCooldown();
    expect(service.resendCooldown()).toBe(1);
    service.decrementCooldown();
    expect(service.resendCooldown()).toBe(0);
    service.decrementCooldown();
    expect(service.resendCooldown()).toBe(0);
  });

  it('should securely handle token and expiration on setOtpVerified', () => {
    service.setOtpVerified({
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'secret_single_use_auth_token_xyz',
      expires_in: 1800,
      message: 'Email verified successfully.',
    });

    expect(service.flowState()).toBe('verified_action');
    expect(service.nextAction()).toBe('continue_registration');
    expect(service.actionMessage()).toBe('Email verified successfully.');
    expect(service.hasValidAuthorizationToken()).toBe(true);
    expect(service.getAuthorizationToken()).toBe('secret_single_use_auth_token_xyz');
    expect(service.currentStepId()).toBe('personal_details');
  });

  it('should clear registration state completely', () => {
    service.setOtpSent('test@business.com', 60);
    service.setOtpVerified({
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'token123',
      expires_in: 60,
    });

    service.clearRegistrationState();
    expect(service.email()).toBeNull();
    expect(service.flowState()).toBe('email_entry');
    expect(service.getAuthorizationToken()).toBeNull();
    expect(service.hasValidAuthorizationToken()).toBe(false);
  });

  it('should resetToEmailEntry while keeping email stored', () => {
    service.setEmail('test@business.com');
    service.setOtpSent('test@business.com', 60);

    service.resetToEmailEntry();
    expect(service.email()).toBe('test@business.com');
    expect(service.flowState()).toBe('email_entry');
    expect(service.hasValidAuthorizationToken()).toBe(false);
  });

  it('should store and retrieve personal details and transition steps correctly', () => {
    service.setOtpVerified({
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'auth-token-123',
      expires_in: 1800,
    });

    service.goToPersonalDetails();
    expect(service.flowState()).toBe('personal_details');
    expect(service.currentStepId()).toBe('personal_details');

    const personal = {
      fullName: 'Kasun Perera',
      email: 'test@business.com',
      phone: '0771234567',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      nationality: 'Sri Lankan',
      nicNumber: '199012345678',
      province: 'Western',
      district: 'Colombo',
      city: 'Colombo',
      postalCode: '00100',
      residentialAddress: '123 Galle Rd, Colombo',
    };

    service.setPersonalDetails(personal);
    expect(service.getPersonalDetails()?.fullName).toBe('Kasun Perera');

    // Back to email verification preserves token & personal details
    service.backToEmailVerification();
    expect(service.flowState()).toBe('verified_action');
    expect(service.currentStepId()).toBe('email_verification');
    expect(service.hasValidAuthorizationToken()).toBe(true);
    expect(service.getPersonalDetails()?.phone).toBe('0771234567');

    // Complete personal details advances to business details
    service.completePersonalDetails(personal);
    expect(service.flowState()).toBe('business_details');
    expect(service.currentStepId()).toBe('business_details');

    const steps = service.steps();
    expect(steps[0].completed).toBe(true); // Step 1
    expect(steps[1].completed).toBe(true); // Step 2 completed!
    expect(steps[2].active).toBe(true);    // Step 3 active!
  });

  it('should manage business details state and transition to identity verification', () => {
    service.setOtpVerified({
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'auth-token-123',
      expires_in: 1800,
    });
    service.goToBusinessDetails();
    expect(service.flowState()).toBe('business_details');
    expect(service.currentStepId()).toBe('business_details');

    const business = {
      businessName: 'Ceylon Homestay',
      category: 'homestay',
      contactNumber: '+94 76 582 1987',
      registrationNumber: 'PV12345678',
      businessProvince: 'Central',
      businessDistrict: 'Kandy',
      businessCity: 'Kandy',
      businessPostalCode: '20000',
      businessStreetAddress: 'No. 78, Lake Road',
      description: 'A cozy homestay in Kandy.',
    };

    service.setBusinessDetails(business);
    expect(service.getBusinessDetails()?.businessName).toBe('Ceylon Homestay');
    expect(service.businessDetails()?.category).toBe('homestay');
    expect(service.businessDetails()?.businessProvince).toBe('Central');
    expect(service.businessDetails()?.businessDistrict).toBe('Kandy');
    expect(service.businessDetails()?.businessCity).toBe('Kandy');
    expect(service.businessDetails()?.businessPostalCode).toBe('20000');
    expect(service.businessDetails()?.businessStreetAddress).toBe('No. 78, Lake Road');

    // Back to personal details preserves business details
    service.backToPersonalDetails();
    expect(service.flowState()).toBe('personal_details');
    expect(service.currentStepId()).toBe('personal_details');
    expect(service.getBusinessDetails()?.contactNumber).toBe('+94 76 582 1987');

    // Return to business details
    service.goToBusinessDetails();
    expect(service.flowState()).toBe('business_details');

    // Complete business details advances to identity verification
    service.completeBusinessDetails(business);
    expect(service.flowState()).toBe('identity_verification');
    expect(service.currentStepId()).toBe('identity_verification');

    const steps = service.steps();
    expect(steps[0].completed).toBe(true); // Step 1
    expect(steps[1].completed).toBe(true); // Step 2
    expect(steps[2].completed).toBe(true); // Step 3 completed!
    expect(steps[3].active).toBe(true);    // Step 4 active!
  });

  it('should manage identity verification state, document flags, and step 5 transitions', () => {
    service.setOtpVerified({
      verified: true,
      next_action: 'continue_registration',
      authorization_token: 'auth-token-123',
      expires_in: 1800,
    });

    service.goToIdentityVerification();
    expect(service.flowState()).toBe('identity_verification');
    expect(service.currentStepId()).toBe('identity_verification');

    // Default document flags
    expect(service.selfieUploaded()).toBe(false);
    expect(service.nicFrontUploaded()).toBe(false);
    expect(service.nicBackUploaded()).toBe(false);

    // Update document flags and type
    service.setIdentityDocumentsStatus(true, true, false);
    expect(service.selfieUploaded()).toBe(true);
    expect(service.nicFrontUploaded()).toBe(true);
    expect(service.nicBackUploaded()).toBe(false);

    // Back to business details
    service.backToBusinessDetails();
    expect(service.flowState()).toBe('business_details');
    expect(service.currentStepId()).toBe('business_details');

    // Return to identity verification
    service.goToIdentityVerification();
    expect(service.flowState()).toBe('identity_verification');
    expect(service.currentStepId()).toBe('identity_verification');

    // Complete identity verification advances to step 5 (review_submit)
    service.completeIdentityVerification();
    expect(service.flowState()).toBe('review_submit');
    expect(service.currentStepId()).toBe('review_submit');

    const steps = service.steps();
    expect(steps[0].completed).toBe(true); // Step 1
    expect(steps[1].completed).toBe(true); // Step 2
    expect(steps[2].completed).toBe(true); // Step 3
    expect(steps[3].completed).toBe(true); // Step 4 completed!
    expect(steps[4].active).toBe(true);    // Step 5 active!

    // Back from review_submit to identity_verification
    service.backToIdentityVerification();
    expect(service.flowState()).toBe('identity_verification');
    expect(service.currentStepId()).toBe('identity_verification');
  });
});
