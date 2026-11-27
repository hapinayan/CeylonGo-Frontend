import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  isOpen: boolean;
}

// Custom validator to reject whitespace-only strings
export function nonWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const isWhitespace = (control.value || '').trim().length === 0;
  return isWhitespace && control.value ? { whitespace: true } : null;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  readonly contactForm: FormGroup;
  readonly submissionState = signal<'idle' | 'demonstration_success'>('idle');
  readonly isSubmitting = signal<boolean>(false);

  readonly inquiryCategories: readonly string[] = [
    'General Inquiry',
    'Trip Planning',
    'Booking Support',
    'Homestay Support',
    'Tour Guide Support',
    'Local Experiences',
    'Artisan & Small Business Support',
    'Bike & Bicycle Rental Support',
    'Become a Host',
    'Technical Issue',
    'Feedback',
  ];

  readonly faqItems = signal<FaqItem[]>([
    {
      id: 'faq-plan',
      question: 'How can I plan my trip with CeylonGo?',
      answer:
        'You can use our smart AI Trip Planner to generate custom daily itineraries based on your destination, travel duration, and budget. You can also explore curated experiences, homestays, and tour guides independently.',
      isOpen: false,
    },
    {
      id: 'faq-homestay',
      question: 'How do I book a homestay?',
      answer:
        'Navigate to the Homestays section, select an accommodation in your destination, verify dates and room availability, and submit a booking request. You can choose between simulated online demonstration payment or pay-at-location upon check-in.',
      isOpen: false,
    },
    {
      id: 'faq-guide',
      question: 'How can I find a local tour guide?',
      answer:
        'Visit our Tour Guides section to browse verified Sri Lankan guides. Each guide profile outlines regional specialties, spoken languages, and daily rates so you can book trusted local knowledge with confidence.',
      isOpen: false,
    },
    {
      id: 'faq-host',
      question: 'How can I become a host or service provider?',
      answer:
        'Click "Become a Host" or visit the Provider Portal. You can register your homestay, guide service, adventure activity, or bike rental fleet. Listings undergo administrator verification before publishing to ensure traveler trust.',
      isOpen: false,
    },
    {
      id: 'faq-artisan',
      question: 'How does CeylonGo promote local artisans and craftspeople?',
      answer:
        'Our Artisan module showcases traditional craft studios, handloom weavers, mask carvers, and local spice gardens. Travelers can explore artisan profiles and connect directly for visits and product inquiries.',
      isOpen: false,
    },
    {
      id: 'faq-support',
      question: 'How can I get support for an active booking?',
      answer:
        'Sign in to your traveler account and open "My Bookings" to view booking status, details, and host contact information. You can also email our support desk at support@ceylongo.com for assistance.',
      isOpen: false,
    },
    {
      id: 'faq-contact',
      question: 'How can I contact CeylonGo?',
      answer:
        'You can reach our team via email at support@ceylongo.com or by phone at +94 11 234 5678. For direct inquiries, you can use the contact form above in demonstration mode or trigger an email draft.',
      isOpen: false,
    },
  ]);

  constructor(private readonly fb: FormBuilder) {
    this.contactForm = this.fb.group({
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80),
          nonWhitespaceValidator,
        ],
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(100),
          nonWhitespaceValidator,
        ],
      ],
      phone: [
        '',
        [
          Validators.pattern(/^[+]?[\d\s-]{7,18}$/),
        ],
      ],
      inquiryType: [
        '',
        [Validators.required],
      ],
      subject: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(120),
          nonWhitespaceValidator,
        ],
      ],
      message: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
          nonWhitespaceValidator,
        ],
      ],
    });
  }

  get fullNameControl(): AbstractControl | null {
    return this.contactForm.get('fullName');
  }

  get emailControl(): AbstractControl | null {
    return this.contactForm.get('email');
  }

  get phoneControl(): AbstractControl | null {
    return this.contactForm.get('phone');
  }

  get inquiryTypeControl(): AbstractControl | null {
    return this.contactForm.get('inquiryType');
  }

  get subjectControl(): AbstractControl | null {
    return this.contactForm.get('subject');
  }

  get messageControl(): AbstractControl | null {
    return this.contactForm.get('message');
  }

  get messageLength(): number {
    return (this.messageControl?.value || '').length;
  }

  toggleFaq(faqId: string): void {
    this.faqItems.update((items) =>
      items.map((item) =>
        item.id === faqId ? { ...item, isOpen: !item.isOpen } : item
      )
    );
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    // In accordance with project restrictions:
    // Online inquiry submission endpoint is not yet available in the backend.
    // We complete client-side validation and display a clear demonstration notification.
    this.isSubmitting.set(true);
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submissionState.set('demonstration_success');
    }, 50);
  }

  resetForm(): void {
    this.contactForm.reset({
      fullName: '',
      email: '',
      phone: '',
      inquiryType: '',
      subject: '',
      message: '',
    });
    this.submissionState.set('idle');
  }

  dismissDemoNotice(): void {
    this.submissionState.set('idle');
  }
}
