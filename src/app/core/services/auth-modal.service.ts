import { Injectable, signal } from '@angular/core';

export type AuthModalStep =
  | 'entry'
  | 'login'
  | 'register'
  | 'phone'
  | 'forgot-password'
  | 'check-email'
  | 'reset-password'
  | 'reset-success';

export interface PendingAuthAction {
  type: 'generate-trip' | 'wishlist' | 'booking' | 'community' | 'navigation' | 'custom';
  route?: string;
  queryParams?: Record<string, any>;
  data?: any;
  resumeCallback?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class AuthModalService {
  readonly isOpen = signal(false);
  readonly currentStep = signal<AuthModalStep>('entry');
  readonly userEmail = signal('');
  readonly intentMode = signal<'login' | 'register'>('login');
  readonly resetToken = signal<string | null>(null);
  readonly pendingAction = signal<PendingAuthAction | null>(null);

  private triggerElement: HTMLElement | null = null;

  open(
    mode: 'login' | 'register' = 'login',
    trigger?: HTMLElement,
    pendingAction?: PendingAuthAction
  ): void {
    if (trigger) {
      this.triggerElement = trigger;
    } else if (typeof document !== 'undefined') {
      this.triggerElement = document.activeElement as HTMLElement | null;
    }

    if (pendingAction) {
      this.pendingAction.set(pendingAction);
    }

    this.intentMode.set(mode);
    this.currentStep.set('entry');
    this.isOpen.set(true);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  openResetPassword(token: string, email?: string): void {
    if (typeof document !== 'undefined') {
      this.triggerElement = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
    }

    if (email) {
      this.userEmail.set(email);
    }
    this.resetToken.set(token);
    this.currentStep.set('reset-password');
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.currentStep.set('entry');
    this.userEmail.set('');
    this.resetToken.set(null);
    this.pendingAction.set(null);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
        this.triggerElement.focus();
      }
    }
    this.triggerElement = null;
  }

  setStep(step: AuthModalStep, email?: string, token?: string): void {
    if (email !== undefined) {
      this.userEmail.set(email);
    }
    if (token !== undefined) {
      this.resetToken.set(token);
    }
    this.currentStep.set(step);
  }

  setResetToken(token: string | null): void {
    this.resetToken.set(token);
  }

  setPendingAction(action: PendingAuthAction | null): void {
    this.pendingAction.set(action);
  }

  consumePendingAction(): PendingAuthAction | null {
    const action = this.pendingAction();
    this.pendingAction.set(null);
    return action;
  }

  clearPendingAction(): void {
    this.pendingAction.set(null);
  }
}
