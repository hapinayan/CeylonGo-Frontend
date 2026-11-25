import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { AdminAuthService } from '../core/services/admin-auth.service';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminAuthService,
          useValue: {
            currentUser: signal(null),
            isSuperAdmin: signal(false),
            roleDisplayName: signal('Admin'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sidebar collapse state', () => {
    expect(component.isSidebarCollapsed()).toBe(false);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(true);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(false);
  });

  it('should toggle mobile drawer state', () => {
    expect(component.isMobileDrawerOpen()).toBe(false);
    component.openMobileDrawer();
    expect(component.isMobileDrawerOpen()).toBe(true);
    component.closeMobileDrawer();
    expect(component.isMobileDrawerOpen()).toBe(false);
  });
});
