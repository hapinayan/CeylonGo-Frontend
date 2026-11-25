import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app.routes';
import { providerAuthGuard } from '../../../core/guards/provider-auth.guard';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { demoExperiences } from '../../testing/demo-experiences';
import { Discover } from './discover';

describe('Experiences Discover preview', () => {
  let fixture: ComponentFixture<Discover>;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Discover],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: EXPERIENCE_CATALOG, useValue: { preview: true, experiences: demoExperiences } },
      ],
    });
    fixture = TestBed.createComponent(Discover);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  function click(label: string): void {
    const button = [...page.querySelectorAll('button')].find(element =>
      (element.getAttribute('aria-label') ?? element.textContent.trim()) === label,
    );
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  function edit(selector: string, value: string): void {
    const control = page.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
    fixture.detectChanges();
  }

  function cardTitles(): string[] {
    return [...page.querySelectorAll('.experience-card h3')].map(element => element.textContent);
  }

  it('renders preview inventory and the named categories', () => {
    expect(page.querySelector('h1')?.textContent).toBe('Experiences in Sri Lanka');
    expect(page.querySelector('#preview-note')?.textContent).toContain('Development preview');
    expect(page.querySelectorAll('.category-nav button')).toHaveLength(8);
    expect(cardTitles()).toHaveLength(8);
  });

  it('selects Eco-Tourism and resets combined filters', () => {
    click('Eco-Tourism');
    expect(page.querySelector('.category-nav [aria-pressed="true"]')?.textContent.trim()).toBe('Eco-Tourism');
    expect(cardTitles()).toEqual(['Tea Plantation Experience', 'Mangrove Exploration', 'Wetland Bird Walk']);
    click('Filters');
    edit('#experience-filters select', '4.9');
    expect(cardTitles()).toEqual(['Mangrove Exploration']);
    click('Reset filters');
    expect(cardTitles()).toHaveLength(8);
  });

  it('matches trimmed, case-insensitive locations and explains preview date behavior', () => {
    edit('[formControlName="location"]', '  eLLa  ');
    edit('[formControlName="date"]', '2027-06-01');
    click('Search');
    expect(cardTitles()).toEqual(["Little Adam's Peak Hike"]);
    expect(page.querySelector('.search-note')?.textContent).toContain('do not affect availability');
  });

  it('rejects out-of-range and fractional traveler counts before applying a search', () => {
    edit('[formControlName="location"]', 'Ella');
    for (const invalid of ['0', '21', '1.5', '']) {
      edit('[formControlName="travelers"]', invalid);
      click('Search');
      expect(page.querySelector('#traveler-error')).not.toBeNull();
      expect(cardTitles()).toHaveLength(8);
    }
    edit('[formControlName="travelers"]', '2');
    click('Search');
    expect(cardTitles()).toEqual(["Little Adam's Peak Hike"]);
  });

  it('sorts and navigates between derived pages', () => {
    edit('.sort-control select', 'price-low');
    expect(cardTitles()[0]).toBe('Wetland Bird Walk');
    click('Next page');
    expect(page.querySelector('.pagination [aria-current="page"]')?.textContent).toBe('2');
    expect(cardTitles()).toEqual(['White Water Rafting', 'Wildlife Safari']);
    click('Previous page');
    expect(cardTitles()[0]).toBe('Wetland Bird Walk');
  });

  it('shows an empty state and restores results on reset', () => {
    edit('[formControlName="location"]', 'Atlantis');
    click('Search');
    expect(page.querySelector('.empty-results h3')?.textContent).toContain('No experiences');
    click('Reset filters');
    expect(cardTitles()).toHaveLength(8);
  });

  it('links every sample by catalog ID and supports both numbered pages and boundary arrows', () => {
    const links = () => [...page.querySelectorAll('.experience-card--linked h3 a')].map(a => a.getAttribute('href'));
    expect(links()).toEqual(demoExperiences.slice(0, 8).map(item => '/experiences/' + item.id));
    expect(page.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);
    click('Page 2');
    expect(document.activeElement?.id).toBe('experience-results');
    expect(links()).toEqual(demoExperiences.slice(8).map(item => '/experiences/' + item.id));
    expect(page.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    click('Local Culture');
    expect(fixture.componentInstance.page()).toBe(1);
    expect(cardTitles()).toEqual(['Cultural Village Tour', 'Sigiriya Rock Walk']);
  });

  it('toggles a temporary favorite', () => {
    click('Preview favorite: Wildlife Safari');
    expect(page.querySelector('.favorite')?.getAttribute('aria-pressed')).toBe('true');
    click('Preview favorite: Wildlife Safari');
    expect(page.querySelector('.favorite')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('synchronizes selected category with query parameters', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    click('Local Culture');
    expect(fixture.componentInstance.category()).toBe('culture');
    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { category: 'culture' },
      queryParamsHandling: 'merge',
    }));
  });
});

describe('Experiences route and default catalog', () => {
  it('loads the public catalog without fixture data when no preview provider is configured', () => {
    TestBed.configureTestingModule({
      imports: [Discover],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Discover);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(EXPERIENCE_CATALOG)).toEqual({ preview: false, experiences: [] });
    expect(page.querySelector('#preview-note, .experience-card')).toBeNull();
    expect(page.querySelector('.empty-results')?.textContent).toContain('Loading experiences');
  });

  it('preserves the authentication redirect, provider guard and wildcard behavior', async () => {
    const index = routes.findIndex(route => route.path === 'experiences');
    expect(index).toBeGreaterThan(0);
    expect(index).toBeLessThan(routes.findIndex(route => route.path === '**'));
    expect(routes.find(route => route.path === '')).toBeDefined();
    expect(routes.find(route => route.path === 'auth')?.component).toBeDefined();
    expect(routes.find(route => route.path === 'provider/dashboard')?.canActivate).toEqual([providerAuthGuard]);
    expect(routes.find(route => route.path === '**')?.redirectTo).toBe('homestays');
    const children = await routes[index].loadChildren?.();
    expect(children).toEqual([
      expect.objectContaining({ path: 'wishlist', loadComponent: expect.any(Function) }),
      expect.objectContaining({ path: 'bookings', loadComponent: expect.any(Function) }),
      expect.objectContaining({ path: 'bookings/:bookingId', loadComponent: expect.any(Function) }),
      expect.objectContaining({ path: ':id/book', loadComponent: expect.any(Function) }),
      expect.objectContaining({ path: '', loadComponent: expect.any(Function) }),
      expect.objectContaining({ path: ':id', loadComponent: expect.any(Function) }),
    ]);
  }, 15000);
});
