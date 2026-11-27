import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminProfileDetails } from '../../core/models/admin-profile.models';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { AdminProfileService } from '../../core/services/admin-profile.service';
import { AdminProfileComponent } from './admin-profile.component';

describe('AdminProfileComponent', () => {
  let component: AdminProfileComponent;
  let fixture: ComponentFixture<AdminProfileComponent>;

  const mockProfile: AdminProfileDetails = {
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Platform Super Administrator',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
    notification_preferences: {
      email_alerts: true,
      verification_notifications: true,
      financial_summaries: true,
      security_alerts: true,
    },
  };

  const mockProfileService = {
    getProfile: vi.fn().mockReturnValue(of(mockProfile)),
    updateProfile: vi.fn().mockReturnValue(of(mockProfile)),
  };

  const mockAuthService = {
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProfileComponent],
      providers: [
        { provide: AdminProfileService, useValue: mockProfileService },
        { provide: AdminAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load profile', () => {
    expect(component).toBeTruthy();
    expect(component.profile?.email).toBe('admin@ceylongo.lk');
  });

  it('should save profile changes', () => {
    component.editFullName = 'Updated Admin';
    component.saveProfile();
    expect(mockProfileService.updateProfile).toHaveBeenCalled();
  });

  it('should call authService logout when terminating session', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
