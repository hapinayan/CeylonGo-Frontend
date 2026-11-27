import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the contact component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values and invalid status', () => {
    expect(component.contactForm.valid).toBe(false);
    expect(component.contactForm.value).toEqual({
      fullName: '',
      email: '',
      phone: '',
      inquiryType: '',
      subject: '',
      message: '',
    });
  });

  it('should validate required fields when touched', () => {
    const form = component.contactForm;
    expect(form.get('fullName')?.valid).toBe(false);
    expect(form.get('email')?.valid).toBe(false);
    expect(form.get('inquiryType')?.valid).toBe(false);
    expect(form.get('subject')?.valid).toBe(false);
    expect(form.get('message')?.valid).toBe(false);
  });

  it('should reject whitespace-only inputs for required fields', () => {
    const nameCtrl = component.fullNameControl;
    nameCtrl?.setValue('   ');
    expect(nameCtrl?.valid).toBe(false);
    expect(nameCtrl?.errors?.['whitespace']).toBe(true);

    const emailCtrl = component.emailControl;
    emailCtrl?.setValue('   ');
    expect(emailCtrl?.valid).toBe(false);

    const subjectCtrl = component.subjectControl;
    subjectCtrl?.setValue('   ');
    expect(subjectCtrl?.valid).toBe(false);
    expect(subjectCtrl?.errors?.['whitespace']).toBe(true);

    const msgCtrl = component.messageControl;
    msgCtrl?.setValue('           ');
    expect(msgCtrl?.valid).toBe(false);
    expect(msgCtrl?.errors?.['whitespace']).toBe(true);
  });

  it('should validate email format', () => {
    const emailCtrl = component.emailControl;
    emailCtrl?.setValue('invalid-email');
    expect(emailCtrl?.valid).toBe(false);
    expect(emailCtrl?.errors?.['email']).toBe(true);

    emailCtrl?.setValue('traveler@ceylongo.com');
    expect(emailCtrl?.valid).toBe(true);
  });

  it('should validate message length requirements', () => {
    const msgCtrl = component.messageControl;
    msgCtrl?.setValue('Short');
    expect(msgCtrl?.valid).toBe(false);
    expect(msgCtrl?.errors?.['minlength']).toBeTruthy();

    msgCtrl?.setValue('This is a sufficiently long inquiry message about Sri Lankan homestays.');
    expect(msgCtrl?.valid).toBe(true);
  });

  it('should validate optional phone number format when provided', () => {
    const phoneCtrl = component.phoneControl;
    expect(phoneCtrl?.valid).toBe(true); // Optional, empty is valid

    phoneCtrl?.setValue('abc-not-a-number');
    expect(phoneCtrl?.valid).toBe(false);

    phoneCtrl?.setValue('+94 77 123 4567');
    expect(phoneCtrl?.valid).toBe(true);
  });

  it('should enable submission when all required fields are valid', () => {
    component.contactForm.setValue({
      fullName: 'Kasun Perera',
      email: 'kasun@example.com',
      phone: '+94 77 987 6543',
      inquiryType: 'Homestay Support',
      subject: 'Inquiry about Ella homestay booking',
      message: 'Hello, I would like to inquire about family rooms in Ella homestays for December.',
    });

    expect(component.contactForm.valid).toBe(true);
  });

  it('should perform demonstration submission with explicit notice that no message was sent', async () => {
    component.contactForm.setValue({
      fullName: 'Kasun Perera',
      email: 'kasun@example.com',
      phone: '+94 77 987 6543',
      inquiryType: 'Homestay Support',
      subject: 'Inquiry about Ella homestay booking',
      message: 'Hello, I would like to inquire about family rooms in Ella homestays for December.',
    });

    component.onSubmit();
    expect(component.isSubmitting()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.submissionState()).toBe('demonstration_success');

    const compiled = fixture.nativeElement as HTMLElement;
    const demoCard = compiled.querySelector('.demo-feedback-card');
    expect(demoCard).toBeTruthy();
    expect(demoCard?.textContent).toContain('Form validation completed');
    expect(demoCard?.textContent).toContain('No message has been sent');

    // Values remain preserved
    expect(component.contactForm.value.fullName).toBe('Kasun Perera');
    expect(component.contactForm.value.email).toBe('kasun@example.com');
  });

  it('should clear form values and reset submission state on resetForm()', () => {
    component.contactForm.setValue({
      fullName: 'Kasun Perera',
      email: 'kasun@example.com',
      phone: '+94 77 987 6543',
      inquiryType: 'Homestay Support',
      subject: 'Inquiry about Ella homestay booking',
      message: 'Hello, I would like to inquire about family rooms in Ella homestays for December.',
    });
    component.submissionState.set('demonstration_success');

    component.resetForm();

    expect(component.contactForm.value.fullName).toBe('');
    expect(component.submissionState()).toBe('idle');
  });

  it('should toggle FAQ items open and closed', () => {
    const firstFaqId = component.faqItems()[0].id;
    expect(component.faqItems()[0].isOpen).toBe(false);

    component.toggleFaq(firstFaqId);
    expect(component.faqItems()[0].isOpen).toBe(true);

    component.toggleFaq(firstFaqId);
    expect(component.faqItems()[0].isOpen).toBe(false);
  });

  it('should render contact info cards with verified demonstration placeholders', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailPlaceholder = compiled.querySelector('.placeholder-val');
    const phonePlaceholder = compiled.querySelectorAll('.placeholder-val')[1];

    expect(emailPlaceholder?.textContent).toContain('support@ceylongo.com');
    expect(phonePlaceholder?.textContent).toContain('+94 11 234 5678');

    // Confirm that email and phone are rendered as non-clickable demonstration placeholders, not tel: or mailto: links
    const emailLink = compiled.querySelector('a[href^="mailto:"]');
    const phoneLink = compiled.querySelector('a[href^="tel:"]');
    expect(emailLink).toBeNull();
    expect(phoneLink).toBeNull();
  });
});
