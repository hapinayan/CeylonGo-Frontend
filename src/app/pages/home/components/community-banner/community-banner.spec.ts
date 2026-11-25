import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommunityBanner } from './community-banner';

describe('CommunityBanner', () => {
  let component: CommunityBanner;
  let fixture: ComponentFixture<CommunityBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the Community banner component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the heading, description, and button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const titleEl = el.querySelector('#community-banner-title');
    const descEl = el.querySelector('.banner-description');
    const btnEl = el.querySelector('.btn-join-community');
    const imgEl = el.querySelector('.banner-community-img') as HTMLImageElement;

    expect(titleEl?.textContent?.trim()).toBe('Join the CeylonGo Community');
    expect(descEl?.textContent).toContain('Connect with travelers, local hosts');
    expect(btnEl?.textContent).toContain('Join Community');
    expect(imgEl.src).toContain('/images/banners/local-community.webp');
  });

  it('should emit actionClick when Join Community button is clicked', () => {
    let clicked = false;
    component.actionClick.subscribe(() => {
      clicked = true;
    });

    const btnEl = fixture.nativeElement.querySelector('.btn-join-community') as HTMLButtonElement;
    btnEl.click();
    fixture.detectChanges();

    expect(clicked).toBe(true);
  });
});
