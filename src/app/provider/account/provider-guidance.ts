import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProviderPreviewService } from '../provider-preview.service';

@Component({
  selector: 'app-provider-availability',
  imports: [RouterLink],
  styleUrl: './provider-account.scss',
  template: `
    <section class="account-page">
      <header><h1>Availability</h1><p>Choose a service type to review inventory, dates and capacity.</p></header>
      <div class="field-grid">
        @for (section of sections; track section.path) {
          <article class="card"><h2>{{ section.title }}</h2><p>{{ section.description }}</p>
            <div><a class="action-link" [routerLink]="section.path" [queryParams]="previewParams()">Manage availability</a></div>
          </article>
        }
      </div>
    </section>`,
})
export class ProviderAvailabilityPage {
  readonly previewParams = inject(ProviderPreviewService).queryParams;
  readonly sections = [
    { title: 'Homestay rooms', path: '/provider/rooms', description: 'Manage room capacity, prices and available nights.' },
    { title: 'Adventure activities', path: '/provider/activities/availability', description: 'Open or close sessions and set participant capacity.' },
    { title: 'Tour guide packages & availability', path: '/provider/guides/availability', description: 'Review tour dates, guide schedules and spaces.' },
    { title: 'Bike and bicycle rentals', path: '/provider/rentals/availability', description: 'Manage fleet units and available rental periods.' },
    { title: 'Artisan showcase products', path: '/provider/artisans/products', description: 'Manage handmade product showcase items and prices.' },
  ];
}

@Component({
  selector: 'app-provider-help',
  imports: [RouterLink],
  styleUrl: './provider-account.scss',
  template: `
    <section class="account-page">
      <header><h1>Help &amp; Support</h1><p>Guidance for onboarding, publishing, bookings, commission, wallet top-ups, and contacting CeylonGo.</p></header>
      <article class="card"><h2>1. How to register and become verified</h2>
        <p>Verify your email with OTP, complete your personal and business details, and upload identity documents. After admin review and approval, set your password and sign in to access your Host Portal.</p>
        <div><a routerLink="/provider/register">Provider registration</a></div>
      </article>
      <article class="card"><h2>2. How to publish a service</h2>
        <p>Use Add New Service to create a Homestay, Adventure Activity, Tour Guide, Motorbike/Scooter, Bicycle, or Artisan listing. Upload photos, set pricing and availability, and submit it for verification. Once approved, publish or unpublish it anytime in My Services.</p>
        <div class="actions">
          <a routerLink="/provider/services/new" [queryParams]="previewParams()">Add New Service</a>
          <a routerLink="/provider/listings" [queryParams]="previewParams()">My Services</a>
          <a routerLink="/provider/availability" [queryParams]="previewParams()">Availability</a>
        </div>
      </article>
      <article class="card"><h2>3. How to manage bookings</h2>
        <p>Review incoming booking requests, separate booking and payment status badges, traveler contact details, and commission previews in Bookings. Confirm pending requests, decline unavailable dates, and mark completed or eligible cancelled bookings.</p>
        <div><a routerLink="/provider/bookings" [queryParams]="previewParams()">Open Bookings</a></div>
      </article>
      <article class="card"><h2>4. How the first three free bookings work</h2>
        <p>Every approved provider receives three commission-free confirmed bookings shared across all services. LKR 0.00 commission is deducted while free bookings remain.</p>
        <div><a routerLink="/provider/wallet" [queryParams]="previewParams()">View Free Booking Progress</a></div>
      </article>
      <article class="card"><h2>5. How the 10% commission works</h2>
        <p>From the fourth confirmed booking onward, CeylonGo calculates and deducts a 10% commission from your wallet balance when you confirm a booking. Eligible cancellations credit a commission refund back to your wallet.</p>
        <div><a routerLink="/provider/wallet" [queryParams]="previewParams()">View Commission Ledger</a></div>
      </article>
      <article class="card"><h2>6. How to top up your wallet</h2>
        <p>Open Wallet and select Top Up Wallet to choose quick amounts (LKR 1,000, LKR 2,500, LKR 5,000, or LKR 10,000) or enter a custom LKR amount via the Academic Demo Simulated Payment flow.</p>
        <div><a routerLink="/provider/wallet" [queryParams]="previewParams()">Top Up Wallet</a></div>
      </article>
      <article class="card"><h2>7. How to contact CeylonGo</h2>
        <p>Need help with an account review or listing? Reach CeylonGo using our existing Contact Us channel (<code>support@ceylongo.com</code> &middot; <code>+94 11 234 5678</code>) from the homepage navigation.</p>
        <div><a routerLink="/" fragment="contact">Open Homepage Contact Us</a></div>
      </article>
    </section>`,
})
export class ProviderHelpPage {
  readonly previewParams = inject(ProviderPreviewService).queryParams;
}
