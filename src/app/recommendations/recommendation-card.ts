import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { SaveControl } from '../experiences/components/save-control';
import { Card, Category, DETAIL_PATH } from './recommendation.models';

const LABEL: Record<Category, string> = {
  homestay: 'Homestay',
  adventure: 'Experience',
  guide: 'Tour Guide',
  bike: 'Motorbike & Scooter',
  bicycle: 'Bicycle Rental',
  artisan: 'Local Artisan',
};

@Component({
  selector: 'app-recommendation-card',
  imports: [CurrencyPipe, RouterLink, SaveControl],
  template: `
    <article>
      <div class="cover">
        @if (image() && !failed()) {
          <img [src]="image()" alt="" loading="lazy" (error)="failed.set(true)" />
        } @else {
          <span>No photo available</span>
        }
      </div>
      <div class="body">
        <small>{{ labels[card().category] }}</small>
        <h3>{{ card().title }}</h3>
        <p>{{ card().location || card().district }}</p>
        @if (card().rating !== null) {
          <p>Rating {{ card().rating }} / 5</p>
        }
        @if (card().starting_price !== null && card().currency) {
          <p>
            From {{ card().starting_price | currency: card().currency! : 'code' }}
            {{ card().pricing_unit?.replace('_', ' ') }}
          </p>
        }
        <p class="reason">{{ card().recommendation_reason }}</p>
        @if (card().category === 'adventure') {
          <app-save-experience
            [id]="card().listing_id.toString()"
            [title]="card().title"
            [showLabel]="true"
          />
        }
        <a
          [routerLink]="[paths[card().category], card().listing_id]"
          [attr.aria-label]="'View details for ' + card().title"
          >View Details</a
        >
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    article {
      height: 100%;
      overflow: hidden;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      color: #142747;
      transition: box-shadow 0.2s;
    }
    article:hover {
      box-shadow: 0 8px 24px #14274718;
    }
    .cover {
      aspect-ratio: 16/9;
      display: grid;
      place-items: center;
      background: #eef3f9;
      color: #475569;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .body {
      padding: 1rem;
    }
    small,
    a {
      color: #155ac6;
      font-weight: 650;
    }
    h3 {
      font-size: 1.08rem;
      margin: 0.35rem 0;
    }
    p {
      margin: 0.35rem 0;
    }
    .reason {
      color: #475569;
      font-size: 0.88rem;
      margin: 0.7rem 0;
    }
  `,
})
export class RecommendationCard {
  readonly card = input.required<Card>();
  readonly labels = LABEL;
  readonly paths = DETAIL_PATH;
  readonly failed = signal(false);
  readonly image = computed(() => {
    const source = this.card().cover_image_url;
    if (!source) return null;
    try {
      const url = new URL(source, new URL(environment.apiBaseUrl).origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  });
  constructor() {
    effect(() => {
      this.image();
      this.failed.set(false);
    });
  }
}
