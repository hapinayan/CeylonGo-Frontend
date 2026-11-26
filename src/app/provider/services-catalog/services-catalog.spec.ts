import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ServicesCatalog } from './services-catalog';

describe('ServicesCatalog Component', () => {
  let component: ServicesCatalog;
  let fixture: ComponentFixture<ServicesCatalog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesCatalog],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesCatalog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should expose Adventure & Experiences connected to /provider/activities/new', () => {
    const adventureCard = component.services.find((s) => s.id === 'adventure');
    expect(adventureCard).toBeDefined();
    expect(adventureCard?.route).toBe('/provider/activities/new');
    expect(adventureCard?.isAvailable).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Adventure & Experiences');
    const adventureLink = compiled.querySelector('a[href="/provider/activities/new"]');
    expect(adventureLink).toBeTruthy();
    expect(adventureLink?.textContent).toContain('Start 6-Step Wizard');
  });

  it('should expose Licensed Tour Guide connected to /provider/guides/new', () => {
    const guideCard = component.services.find((s) => s.id === 'guide');
    expect(guideCard).toBeDefined();
    expect(guideCard?.route).toBe('/provider/guides/new');
    expect(guideCard?.isAvailable).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Licensed Tour Guide');
    const guideLink = compiled.querySelector('a[href="/provider/guides/new"]');
    expect(guideLink).toBeTruthy();
    expect(guideLink?.textContent).toContain('Start 6-Step Wizard');
  });
});
