import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-provider-welcome',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './provider-welcome.html',
  styleUrl: './provider-welcome.scss'
})
export class ProviderWelcome {
  readonly activeNavSection = signal<'home' | 'how-it-works' | 'benefits' | 'help'>('home');
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly openFaqIndex = signal<number | null>(0);

  readonly faqs: FaqItem[] = [
    {
      question: 'Who can become a CeylonGo Service Provider?',
      answer: 'Any Sri Lankan resident or registered business offering authentic tourism services can join—including homestay hosts, certified local tour guides, cultural artisans, village experience hosts, bike/scooter rental operators, and transport providers.'
    },
    {
      question: 'What documents are required to complete registration?',
      answer: 'You will need a valid Sri Lankan National Identity Card (NIC) with clear front and back photos, a live photo (selfie) for identity verification, and your contact and business location details. Business registration numbers are optional for individual homestays and artisans.'
    },
    {
      question: 'How long does the verification and approval process take?',
      answer: 'Our local CeylonGo verification officers review submitted applications within 24 to 48 hours. Once approved, you will receive an email confirmation and can instantly activate your account with a secure password.'
    },
    {
      question: 'Are there any upfront charges or registration fees?',
      answer: 'No. Registering and listing your services on CeylonGo is 100% free with zero upfront charges. We operate on a fair, community-first success model where a nominal commission applies only when you receive confirmed bookings.'
    },
    {
      question: 'Can I save my application and finish it later?',
      answer: 'Yes! CeylonGo provides an automatic draft-saving system across all 4 registration steps. You can pause anytime and resume right where you left off using your verified email address.'
    }
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  scrollTo(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileMenu();

    if (sectionId === 'home') {
      this.activeNavSection.set('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      this.activeNavSection.set(sectionId as 'how-it-works' | 'benefits' | 'help');
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  toggleFaq(index: number): void {
    if (this.openFaqIndex() === index) {
      this.openFaqIndex.set(null);
    } else {
      this.openFaqIndex.set(index);
    }
  }
}
