import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ProviderAccountService, ProviderProfile, ProviderProfileFields, providerError,
} from '../../core/services/provider-account.service';
import { ProviderPreviewService } from '../provider-preview.service';

type TextField = Exclude<keyof ProviderProfileFields, 'social_links'>;
interface Field {
  key: TextField | 'social_links';
  label: string;
  max: number;
  min?: number;
  nullable?: boolean;
  review?: boolean;
  multiline?: boolean;
}

const PERSONAL: Field[] = [
  { key: 'full_name', label: 'Full name', min: 2, max: 120, review: true },
  { key: 'personal_phone', label: 'Contact number', max: 32, nullable: true },
  { key: 'personal_address', label: 'Address', min: 2, max: 255, nullable: true, review: true },
  { key: 'personal_district', label: 'District', min: 2, max: 80, nullable: true, review: true },
];
const BUSINESS: Field[] = [
  { key: 'business_name', label: 'Business name', min: 2, max: 150, review: true },
  { key: 'business_category', label: 'Business category', max: 30, review: true },
  { key: 'business_description', label: 'Description', max: 1000, nullable: true, multiline: true },
  { key: 'business_phone', label: 'Business contact number', max: 32 },
  { key: 'business_address', label: 'Business address', min: 2, max: 255, nullable: true, review: true },
  { key: 'business_district', label: 'Business district', min: 2, max: 80, review: true },
  { key: 'website_url', label: 'Website link', max: 500, nullable: true },
  { key: 'social_links', label: 'Social links (one per line)', max: 4008, multiline: true },
];
const FIELDS = [...PERSONAL, ...BUSINESS];

@Component({
  selector: 'app-provider-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-account.scss',
})
export class ProviderProfilePage {
  readonly account = inject(ProviderAccountService);
  readonly preview = inject(ProviderPreviewService).isPreview;
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly groups = [{ title: 'Personal information', fields: PERSONAL },
    { title: 'Business information', fields: BUSINESS }];
  readonly categories = [
    ['homestay', 'Homestay'], ['tour_guide', 'Tour guide'], ['activity', 'Activity'],
    ['artisan', 'Artisan'], ['rental', 'Rental'], ['eco_tourism', 'Eco-tourism'],
  ];
  readonly form = this.fb.record(Object.fromEntries(
    FIELDS.map((field) => [field.key, this.fb.control('', Validators.maxLength(field.max))]),
  ));
  readonly loading = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly photoBusy = signal(false);
  readonly progress = signal<number | null>(null);
  readonly selectedPhoto = signal<string | null>(null);
  readonly removePrompt = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private photo: File | null = null;

  constructor() {
    this.destroy.onDestroy(() => this.clearPhoto());
    if (!this.preview()) this.refresh();
  }
  refresh(): void {
    if (this.loading() || this.saving() || this.photoBusy()) return;
    this.loading.set(true);
    this.error.set('');
    this.account.getProfile().pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false)),
    ).subscribe({ error: (error) => this.error.set(providerError(error, 'Could not load your profile.')) });
  }
  startEdit(profile: ProviderProfile): void {
    const values = Object.fromEntries(FIELDS.map(({ key }) => [key,
      key === 'social_links' ? (profile.social_links ?? []).join('\n') : profile[key] ?? '',
    ]));
    this.form.reset(values);
    for (const field of FIELDS) {
      const control = this.form.controls[field.key];
      if (field.review && profile.profile_change?.status === 'pending') control.disable();
      else control.enable();
    }
    this.editing.set(true);
    this.notice.set('');
    this.error.set('');
  }
  cancel(): void { this.editing.set(false); this.form.markAsPristine(); }
  canLeave(): boolean {
    return !this.account.profile() || !this.editing() || !this.form.dirty || window.confirm('Discard unsaved profile changes?');
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editing() && this.form.dirty) event.preventDefault();
  }
  save(profile: ProviderProfile): void {
    if (this.saving() || this.photoBusy() || this.form.invalid) return;
    const payload: Partial<ProviderProfileFields> = {};
    this.error.set('');
    this.notice.set('');
    for (const field of FIELDS) {
      const control = this.form.controls[field.key];
      if (control.disabled) continue;
      const input = control.value.trim();
      if (field.key === 'social_links') {
        const links = [...new Set(input.split(/\r?\n/).map((v) => v.trim()).filter(Boolean))];
        if (links.length > 8 || links.some((link) => !this.webLink(link))) {
          this.error.set('Enter up to eight valid HTTP or HTTPS social links.'); return;
        }
        if (JSON.stringify(links) !== JSON.stringify(profile.social_links ?? [])) payload.social_links = links;
      } else if (input !== (profile[field.key] ?? '')) {
        if ((!input && !field.nullable) || (input && input.length < (field.min ?? 0))) {
          this.error.set('Check the value for ' + field.label.toLowerCase() + '.'); return;
        }
        if (field.key === 'website_url' && input && !this.webLink(input)) {
          this.error.set('Enter a valid HTTP or HTTPS website link.'); return;
        }
        if ((field.key === 'personal_phone' || field.key === 'business_phone') && input &&
            !/^(?:\+94|0094|94)?0?[1-9]\d{8}$/.test(input.replace(/[\s-]/g, ''))) {
          this.error.set('Enter a valid Sri Lankan contact number.'); return;
        }
        Object.assign(payload, { [field.key]: input || null });
      }
    }
    if (!Object.keys(payload).length) { this.cancel(); return; }
    this.saving.set(true);
    this.account.updateProfile(payload).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: (updated) => {
        this.cancel();
        this.notice.set(updated.profile_change?.request_id !== profile.profile_change?.request_id &&
          updated.profile_change?.status === 'pending'
          ? 'Changes submitted for review. Your verified information remains active.'
          : 'Profile updated.');
      },
      error: (error) => this.error.set(providerError(error, 'Could not save your profile.')),
    });
  }
  choosePhoto(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.photoBusy()) return;
    this.clearPhoto();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Choose a JPEG, PNG or WebP image up to 5 MB.'); return;
    }
    this.error.set('');
    this.photo = file;
    this.selectedPhoto.set(URL.createObjectURL(file));
  }
  clearPhoto(): void {
    const url = this.selectedPhoto();
    if (url) URL.revokeObjectURL(url);
    this.selectedPhoto.set(null);
    this.photo = null;
  }
  upload(): void {
    if (!this.photo || this.photoBusy() || this.saving()) return;
    this.photoBusy.set(true);
    this.progress.set(null);
    this.error.set('');
    this.account.uploadAvatar(this.photo).pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.photoBusy.set(false)),
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round(event.loaded / event.total * 100));
        }
        if (event.type === HttpEventType.Response) {
          this.clearPhoto();
          this.notice.set('Profile photo updated.');
        }
      },
      error: (error) => this.error.set(providerError(error, 'Could not upload your photo.')),
    });
  }
  remove(): void {
    if (this.photoBusy() || this.saving()) return;
    this.removePrompt.set(false);
    this.photoBusy.set(true);
    this.error.set('');
    this.account.removeAvatar().pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.photoBusy.set(false)),
    ).subscribe({
      next: () => { this.clearPhoto(); this.notice.set('Profile photo removed.'); },
      error: (error) => this.error.set(providerError(error, 'Could not remove your photo.')),
    });
  }
  fieldLabel(key: string): string { return FIELDS.find((field) => field.key === key)?.label ?? key; }
  display(key: string, value: unknown): string {
    if (key === 'business_category') return this.categories.find(([id]) => id === value)?.[1] ?? String(value ?? '—');
    return Array.isArray(value) ? value.join(', ') || '—' : String(value ?? '—');
  }
  private webLink(value: string): boolean {
    if (value.length > 500 || /[\s\\]/.test(value)) return false;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !!url.hostname;
    } catch { return false; }
  }
}
