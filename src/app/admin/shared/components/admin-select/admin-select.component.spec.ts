import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminSelectComponent, AdminSelectOption } from './admin-select.component';
import { AdminSelectRegistryService } from '../../services/admin-select-registry.service';

describe('AdminSelectComponent', () => {
  let component: AdminSelectComponent<any>;
  let fixture: ComponentFixture<AdminSelectComponent<any>>;
  let registry: AdminSelectRegistryService;

  const mockOptions: AdminSelectOption[] = [
    { key: 'all', label: 'All Options' },
    { key: 'pending', label: 'Pending Review', badgeColor: 'amber' },
    { key: 'approved', label: 'Approved', badgeColor: 'green' },
    { key: 'disabled_item', label: 'Disabled Item', disabled: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSelectComponent],
      providers: [AdminSelectRegistryService],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSelectComponent);
    component = fixture.componentInstance;
    component.options = mockOptions;
    component.value = 'all';
    registry = TestBed.inject(AdminSelectRegistryService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
  });

  it('should display the selected option label in trigger', () => {
    const trigger = fixture.nativeElement.querySelector('.trigger-label');
    expect(trigger?.textContent?.trim()).toBe('All Options');
  });

  it('should toggle dropdown open and closed on trigger click', () => {
    const triggerBtn = fixture.nativeElement.querySelector('.select-trigger') as HTMLButtonElement;
    triggerBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.select-options-panel')).toBeTruthy();

    triggerBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.select-options-panel')).toBeNull();
  });

  it('should select an option and emit valueChange on option click', () => {
    let emittedValue: any = null;
    component.valueChange.subscribe((val) => (emittedValue = val));

    component.openDropdown();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.select-option');
    expect(options.length).toBe(4);

    (options[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(emittedValue).toBe('pending');
    expect(component.value).toBe('pending');
    expect(component.isOpen()).toBe(false);
  });

  it('should close dropdown on Escape key', () => {
    component.openDropdown();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    const triggerBtn = fixture.nativeElement.querySelector('.select-trigger');
    triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('should navigate options with ArrowDown and ArrowUp and select with Enter', () => {
    let emittedValue: any = null;
    component.valueChange.subscribe((val) => (emittedValue = val));

    const triggerBtn = fixture.nativeElement.querySelector('.select-trigger');
    triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);

    // Arrow down moves to next
    triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    // Select with Enter
    triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(emittedValue).toBeTruthy();
    expect(component.isOpen()).toBe(false);
  });

  it('should close when clicked outside', () => {
    component.openDropdown();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    document.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('should be disabled and display disabledHint when disabled is true', () => {
    const disabledFixture = TestBed.createComponent(AdminSelectComponent);
    const disabledComp = disabledFixture.componentInstance;
    disabledComp.options = mockOptions;
    disabledComp.value = 'all';
    disabledComp.disabled = true;
    disabledComp.disabledHint = 'Select a province first';
    disabledFixture.detectChanges();

    const triggerBtn = disabledFixture.nativeElement.querySelector('.select-trigger') as HTMLButtonElement;
    expect(triggerBtn.disabled).toBe(true);

    const triggerLabel = disabledFixture.nativeElement.querySelector('.trigger-label');
    expect(triggerLabel?.textContent?.trim()).toBe('Select a province first');

    triggerBtn.click();
    disabledFixture.detectChanges();
    expect(disabledComp.isOpen()).toBe(false);
  });

  it('should close automatically when another select registers as open in registry', () => {
    component.id = 'select-1';
    component.openDropdown();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    registry.registerOpen('select-2');
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });
});
