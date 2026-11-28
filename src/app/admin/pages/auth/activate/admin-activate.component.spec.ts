import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AdminActivateComponent } from './admin-activate.component';

describe('AdminActivateComponent', () => {
  let component: AdminActivateComponent;
  let fixture: ComponentFixture<AdminActivateComponent>;
  let mockManagementService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockManagementService = {
      verifyInvitation: () =>
        of({
          valid: true,
          email: 'invited@ceylongo.lk',
          full_name: 'Invited Admin',
          role: 'admin',
          department: 'Operations',
          expires_at: '2026-12-31T23:59:59Z',
        }),
      activateAccount: () =>
        of({
          success: true,
          message: 'Account activated',
          email: 'invited@ceylongo.lk',
        }),
    };

    mockRouter = {
      navigate: () => Promise.resolve(true),
    };

    await TestBed.configureTestingModule({
      imports: [AdminActivateComponent],
      providers: [
        { provide: AdminManagementService, useValue: mockManagementService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: { token: 'valid-test-token-at-least-16-chars-long' },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminActivateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and verify token on initialization', () => {
    expect(component).toBeTruthy();
    expect(component.isVerifying()).toBe(false);
    expect(component.invitation()?.email).toBe('invited@ceylongo.lk');
    expect(component.verificationError()).toBeNull();
  });

  it('should reject submission if password is too short', () => {
    component.form.patchValue({
      password: 'short',
      confirmPassword: 'short',
    });
    expect(component.form.valid).toBe(false);
  });

  it('should reject submission if passwords do not match', () => {
    component.form.patchValue({
      password: 'SecurePassword123!',
      confirmPassword: 'DifferentPassword123!',
    });
    component.onSubmit();
    expect(component.activationError()).toContain('do not match');
  });

  it('should activate account on valid password submission', () => {
    component.form.patchValue({
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    });
    component.onSubmit();
    expect(component.activationSuccess()).toBe(true);
  });
});
