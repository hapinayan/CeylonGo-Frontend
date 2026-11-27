import { Injectable, computed, signal } from '@angular/core';
import {
  BusinessDetailsFormModel,
  PersonalDetailsFormModel,
  ProviderNextAction,
  RegistrationFlowState,
  RegistrationStep,
  RegistrationStepId,
  VerifyOtpResponse,
} from '../models/provider-otp.model';

/**
 * Service managing transient in-memory state for CeylonGo Provider Registration.
 *
 * Security & Integrity Guarantees:
 * - Purely in-memory storage via Angular Signals.
 * - Authorization tokens are NEVER logged, serialized into storage, or leaked in URLs.
 * - Enforces token expiration checks and provides clean reset mechanisms.
 */
@Injectable({
  providedIn: 'root',
})
export class ProviderRegistrationStateService {
  private readonly emailSignal = signal<string | null>(null);
  private readonly flowStateSignal = signal<RegistrationFlowState>('email_entry');
  private readonly currentStepIdSignal = signal<RegistrationStepId>('email_verification');
  private readonly authorizationTokenSignal = signal<string | null>(null);
  private readonly tokenExpiresAtSignal = signal<number | null>(null);
  private readonly nextActionSignal = signal<ProviderNextAction | null>(null);
  private readonly actionMessageSignal = signal<string | null>(null);
  private readonly resendCooldownSignal = signal<number>(0);
  private readonly personalDetailsSignal = signal<PersonalDetailsFormModel | null>(null);
  private readonly businessDetailsSignal = signal<BusinessDetailsFormModel | null>(null);
  private readonly selfieUploadedSignal = signal<boolean>(false);
  private readonly nicFrontUploadedSignal = signal<boolean>(false);
  private readonly nicBackUploadedSignal = signal<boolean>(false);

  // Public readonly signals
  readonly email = this.emailSignal.asReadonly();
  readonly flowState = this.flowStateSignal.asReadonly();
  readonly currentStepId = this.currentStepIdSignal.asReadonly();
  readonly nextAction = this.nextActionSignal.asReadonly();
  readonly actionMessage = this.actionMessageSignal.asReadonly();
  readonly resendCooldown = this.resendCooldownSignal.asReadonly();
  readonly personalDetails = this.personalDetailsSignal.asReadonly();
  readonly businessDetails = this.businessDetailsSignal.asReadonly();
  readonly selfieUploaded = this.selfieUploadedSignal.asReadonly();
  readonly nicFrontUploaded = this.nicFrontUploadedSignal.asReadonly();
  readonly nicBackUploaded = this.nicBackUploadedSignal.asReadonly();

  /**
   * Computed list of 5 registration steps with dynamic active/completed statuses.
   */
  readonly steps = computed<RegistrationStep[]>(() => {
    const currentStep = this.currentStepIdSignal();
    const flow = this.flowStateSignal();
    const isStep1Done =
      (flow === 'verified_action' ||
        flow === 'personal_details' ||
        flow === 'business_details' ||
        flow === 'identity_verification' ||
        flow === 'review_submit') &&
      (this.nextActionSignal() === 'continue_registration' ||
        this.hasValidAuthorizationToken());

    const isStep2Done =
      isStep1Done &&
      currentStep !== 'email_verification' &&
      currentStep !== 'personal_details';

    const isStep3Done =
      isStep2Done &&
      currentStep !== 'business_details';

    const isStep4Done =
      isStep3Done &&
      currentStep !== 'identity_verification';

    return [
      {
        id: 'email_verification',
        stepNumber: 1,
        title: 'Email Verification',
        completed: isStep1Done,
        active: currentStep === 'email_verification',
        disabled: false,
      },
      {
        id: 'personal_details',
        stepNumber: 2,
        title: 'Personal Details',
        completed: isStep2Done,
        active: currentStep === 'personal_details',
        disabled: !isStep1Done,
      },
      {
        id: 'business_details',
        stepNumber: 3,
        title: 'Business Details',
        completed: isStep3Done,
        active: currentStep === 'business_details',
        disabled: !isStep2Done && currentStep !== 'business_details',
      },
      {
        id: 'identity_verification',
        stepNumber: 4,
        title: 'Identity Verification',
        completed: isStep4Done,
        active: currentStep === 'identity_verification',
        disabled: !isStep3Done && currentStep !== 'identity_verification',
      },
      {
        id: 'review_submit',
        stepNumber: 5,
        title: 'Review & Submit',
        completed: false,
        active: currentStep === 'review_submit',
        disabled: !isStep4Done && currentStep !== 'review_submit',
      },
    ];
  });

  /**
   * Check whether an unexpired authorization token is held in memory.
   */
  readonly hasValidAuthorizationToken = computed<boolean>(() => {
    const token = this.authorizationTokenSignal();
    const expiresAt = this.tokenExpiresAtSignal();
    if (!token || !expiresAt) {
      return false;
    }
    return Date.now() < expiresAt;
  });

  /**
   * Set target registration email.
   */
  setEmail(email: string): void {
    this.emailSignal.set(email.trim().toLowerCase());
  }

  /**
   * Transition to OTP entry state after successful OTP dispatch.
   */
  setOtpSent(email: string, cooldownSeconds = 60): void {
    this.setEmail(email);
    this.flowStateSignal.set('otp_entry');
    this.resendCooldownSignal.set(cooldownSeconds);
  }

  /**
   * Transition to verified next action state after successful OTP verification.
   * Securely saves single-use authorization token with computed expiration time.
   */
  setOtpVerified(response: VerifyOtpResponse): void {
    this.flowStateSignal.set('verified_action');
    this.nextActionSignal.set(response.next_action ?? null);
    this.actionMessageSignal.set(response.message ?? null);

    if (response.authorization_token) {
      this.authorizationTokenSignal.set(response.authorization_token);
      const lifespanMs = (response.expires_in ?? 1800) * 1000;
      this.tokenExpiresAtSignal.set(Date.now() + lifespanMs);
    } else {
      this.authorizationTokenSignal.set(null);
      this.tokenExpiresAtSignal.set(null);
    }

    if (response.next_action === 'continue_registration') {
      this.currentStepIdSignal.set('personal_details');
    }
  }

  /**
   * Safely retrieve the current authorization token if still unexpired.
   */
  getAuthorizationToken(): string | null {
    if (Date.now() >= (this.tokenExpiresAtSignal() ?? 0)) {
      return null;
    }
    return this.authorizationTokenSignal();
  }

  /**
   * Store entered personal details in transient state.
   */
  setPersonalDetails(details: PersonalDetailsFormModel): void {
    this.personalDetailsSignal.set(details);
  }

  /**
   * Retrieve saved personal details if previously entered.
   */
  getPersonalDetails(): PersonalDetailsFormModel | null {
    return this.personalDetailsSignal();
  }

  /**
   * Transition to Step 2: Personal Details view.
   */
  goToPersonalDetails(): void {
    this.flowStateSignal.set('personal_details');
    this.currentStepIdSignal.set('personal_details');
  }

  /**
   * Return from Step 2 to Step 1 without destroying OTP or authorization session.
   */
  backToEmailVerification(): void {
    this.currentStepIdSignal.set('email_verification');
    this.flowStateSignal.set('verified_action');
  }

  /**
   * Mark Step 2 complete and transition to Step 3.
   */
  completePersonalDetails(details: PersonalDetailsFormModel): void {
    this.setPersonalDetails(details);
    this.currentStepIdSignal.set('business_details');
    this.flowStateSignal.set('business_details');
  }

  /**
   * Store entered business details in transient state.
   */
  setBusinessDetails(details: BusinessDetailsFormModel): void {
    this.businessDetailsSignal.set(details);
  }

  /**
   * Retrieve saved business details if previously entered.
   */
  getBusinessDetails(): BusinessDetailsFormModel | null {
    return this.businessDetailsSignal();
  }

  /**
   * Transition to Step 3: Business Details view.
   */
  goToBusinessDetails(): void {
    this.flowStateSignal.set('business_details');
    this.currentStepIdSignal.set('business_details');
  }

  /**
   * Return from Step 3 to Step 2 without destroying OTP or authorization session.
   */
  backToPersonalDetails(): void {
    this.currentStepIdSignal.set('personal_details');
    this.flowStateSignal.set('personal_details');
  }

  /**
   * Mark Step 3 complete and transition to Step 4 (Identity Verification).
   */
  completeBusinessDetails(details: BusinessDetailsFormModel): void {
    this.setBusinessDetails(details);
    this.currentStepIdSignal.set('identity_verification');
    this.flowStateSignal.set('identity_verification');
  }

  /**
   * Transition to Step 4: Identity Verification view.
   */
  goToIdentityVerification(): void {
    this.currentStepIdSignal.set('identity_verification');
    this.flowStateSignal.set('identity_verification');
  }

  /**
   * Return from Step 4 to Step 3 (Business Details) without destroying draft or authorization session.
   */
  backToBusinessDetails(): void {
    this.currentStepIdSignal.set('business_details');
    this.flowStateSignal.set('business_details');
  }

  /**
   * Mark Step 4 complete and navigate forward to Step 5 (Review & Submit placeholder).
   */
  completeIdentityVerification(): void {
    this.currentStepIdSignal.set('review_submit');
    this.flowStateSignal.set('review_submit');
  }

  /**
   * Return from Step 5 to Step 4 (Identity Verification).
   */
  backToIdentityVerification(): void {
    this.currentStepIdSignal.set('identity_verification');
    this.flowStateSignal.set('identity_verification');
  }

  /**
   * Set document upload completion status signals.
   */
  setIdentityDocumentsStatus(selfie: boolean, nicFront: boolean, nicBack: boolean): void {
    this.selfieUploadedSignal.set(selfie);
    this.nicFrontUploadedSignal.set(nicFront);
    this.nicBackUploadedSignal.set(nicBack);
  }

  /**
   * Set active step explicitly.
   */
  setCurrentStepId(stepId: RegistrationStepId): void {
    this.currentStepIdSignal.set(stepId);
  }

  /**
   * Set active flow state explicitly.
   */
  setFlowState(flow: RegistrationFlowState): void {
    this.flowStateSignal.set(flow);
  }

  /**
   * Update cooldown timer.
   */
  setResendCooldown(seconds: number): void {
    this.resendCooldownSignal.set(Math.max(0, seconds));
  }

  decrementCooldown(): void {
    this.resendCooldownSignal.update((current) => Math.max(0, current - 1));
  }

  /**
   * Return to email entry state while preserving email address.
   */
  resetToEmailEntry(): void {
    this.flowStateSignal.set('email_entry');
    this.currentStepIdSignal.set('email_verification');
    this.authorizationTokenSignal.set(null);
    this.tokenExpiresAtSignal.set(null);
    this.nextActionSignal.set(null);
    this.actionMessageSignal.set(null);
  }

  clearAuthorization(): void {
    this.authorizationTokenSignal.set(null);
    this.tokenExpiresAtSignal.set(null);
  }

  /**
   * Full reset clearing all state, documents, and tokens.
   */
  clearRegistrationState(): void {
    this.emailSignal.set(null);
    this.flowStateSignal.set('email_entry');
    this.currentStepIdSignal.set('email_verification');
    this.authorizationTokenSignal.set(null);
    this.tokenExpiresAtSignal.set(null);
    this.nextActionSignal.set(null);
    this.actionMessageSignal.set(null);
    this.resendCooldownSignal.set(0);
    this.personalDetailsSignal.set(null);
    this.businessDetailsSignal.set(null);
    this.selfieUploadedSignal.set(false);
    this.nicFrontUploadedSignal.set(false);
    this.nicBackUploadedSignal.set(false);
  }
}
