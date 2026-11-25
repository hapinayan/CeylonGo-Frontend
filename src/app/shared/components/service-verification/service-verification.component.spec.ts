import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderService } from '../../../core/services/provider.service';
import { ServiceVerificationComponent } from './service-verification.component';

describe('ServiceVerificationComponent', () => {
  let component: ServiceVerificationComponent;
  let fixture: ComponentFixture<ServiceVerificationComponent>;

  const providerServiceMock = {
    saveEvidence: vi.fn().mockReturnValue(of({ success: true })),
    uploadEvidenceFile: vi.fn().mockReturnValue(of({ id: 1, file_name: 'cert.pdf' })),
    deleteEvidenceFile: vi.fn().mockReturnValue(of({ success: true })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceVerificationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render privacy notice', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Host Privacy & Verification Security');
    expect(compiled.textContent).toContain('These private documents are never displayed to travelers');
  });

  it('should allow adding and removing online presence links', () => {
    component.newLinkKind = 'maps';
    component.newLinkUrl = 'https://maps.app.goo.gl/sample';
    component.addLink();

    const links = component.links();
    expect(links.some((l) => l.url === 'https://maps.app.goo.gl/sample')).toBe(true);

    const initialLength = links.length;
    component.removeLink(initialLength - 1);
    expect(component.links().length).toBe(initialLength - 1);
  });
});
