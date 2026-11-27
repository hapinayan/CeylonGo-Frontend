import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AdminSelectRegistryService } from '../../services/admin-select-registry.service';

export interface AdminSelectOption<T = string | number> {
  key: T;
  label: string;
  sublabel?: string;
  icon?: string;
  badgeColor?: 'amber' | 'green' | 'slate' | 'red' | string;
  disabled?: boolean;
}

let nextUniqueId = 0;

@Component({
  selector: 'app-admin-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-select.component.html',
  styleUrls: ['./admin-select.component.scss'],
})
export class AdminSelectComponent<T = string | number> implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly registry = inject(AdminSelectRegistryService);

  @Input() options: readonly AdminSelectOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() placeholder = 'Select an option';
  @Input() disabled = false;
  @Input() disabledHint = '';
  @Input() leadingIcon = '';
  @Input() ariaLabel = 'Select';
  @Input() id = `admin-select-${++nextUniqueId}`;
  @Input() minWidth = '160px';
  @Input() maxWidth = '340px';

  @Output() readonly valueChange = new EventEmitter<T>();

  readonly isOpen = signal<boolean>(false);
  readonly focusedIndex = signal<number>(-1);

  readonly selectedOption = computed(() => {
    return this.options.find((opt) => opt.key === this.value) || null;
  });

  readonly displayLabel = computed(() => {
    if (this.disabled && this.disabledHint) {
      return this.disabledHint;
    }
    const selected = this.selectedOption();
    return selected ? selected.label : this.placeholder;
  });

  constructor() {
    // Synchronize with global registry so only one dropdown opens at a time
    effect(() => {
      const activeId = this.registry.activeId();
      if (activeId !== this.id && this.isOpen()) {
        this.isOpen.set(false);
        this.focusedIndex.set(-1);
      }
    });
  }

  ngOnInit(): void {
    if (!this.id) {
      this.id = `admin-select-${++nextUniqueId}`;
    }
  }

  ngOnDestroy(): void {
    this.registry.registerClose(this.id);
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    if (this.disabled) return;
    this.isOpen.set(true);
    this.registry.registerOpen(this.id);

    // Set initial focus to currently selected option or first non-disabled option
    const currentIndex = this.options.findIndex((opt) => opt.key === this.value);
    this.focusedIndex.set(currentIndex >= 0 ? currentIndex : 0);
  }

  closeDropdown(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
    this.registry.registerClose(this.id);
  }

  selectOption(option: AdminSelectOption<T>): void {
    if (this.disabled || option.disabled) return;
    this.value = option.key;
    this.valueChange.emit(option.key);
    this.closeDropdown();

    // Return focus to trigger button
    const trigger = this.elementRef.nativeElement.querySelector('.select-trigger') as HTMLElement;
    trigger?.focus();
  }

  onTriggerKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen()) {
          const index = this.focusedIndex();
          if (index >= 0 && index < this.options.length) {
            this.selectOption(this.options[index]);
          } else {
            this.closeDropdown();
          }
        } else {
          this.openDropdown();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else {
          this.moveFocus(1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else {
          this.moveFocus(-1);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;

      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  private moveFocus(step: number): void {
    if (this.options.length === 0) return;
    let nextIndex = this.focusedIndex() + step;
    if (nextIndex < 0) nextIndex = this.options.length - 1;
    if (nextIndex >= this.options.length) nextIndex = 0;

    // Skip disabled options if possible
    let attempts = 0;
    while (this.options[nextIndex]?.disabled && attempts < this.options.length) {
      nextIndex = (nextIndex + step + this.options.length) % this.options.length;
      attempts++;
    }

    this.focusedIndex.set(nextIndex);
    this.scrollFocusedIntoView(nextIndex);
  }

  private scrollFocusedIntoView(index: number): void {
    setTimeout(() => {
      const panel = this.elementRef.nativeElement.querySelector('.select-options-panel') as HTMLElement;
      const focusedItem = this.elementRef.nativeElement.querySelector(`[data-option-index="${index}"]`) as HTMLElement;
      if (panel && focusedItem) {
        const panelTop = panel.scrollTop;
        const panelBottom = panelTop + panel.clientHeight;
        const itemTop = focusedItem.offsetTop;
        const itemBottom = itemTop + focusedItem.clientHeight;

        if (itemTop < panelTop) {
          panel.scrollTop = itemTop;
        } else if (itemBottom > panelBottom) {
          panel.scrollTop = itemBottom - panel.clientHeight;
        }
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  getBadgeColorClass(option: AdminSelectOption<T>): string {
    if (option.badgeColor) {
      return `badge-${option.badgeColor}`;
    }
    const keyStr = String(option.key).toLowerCase();
    if (keyStr.includes('pending')) return 'badge-amber';
    if (keyStr.includes('approved') || keyStr.includes('verified')) return 'badge-green';
    if (keyStr.includes('suspended') || keyStr.includes('unverified')) return 'badge-slate';
    if (keyStr.includes('rejected') || keyStr.includes('failed')) return 'badge-red';
    return '';
  }
}
