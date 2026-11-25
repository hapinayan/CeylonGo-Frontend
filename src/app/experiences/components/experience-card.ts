import { SaveControl } from './save-control';
import { RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { categories, Experience } from '../models/catalog';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-card',
  standalone: true,
  imports: [CommonModule, ExperienceIcon, DecimalPipe, RouterLink, SaveControl],
  template: `
    <article class="experience-card" [class.experience-card--linked]="detailLink()">
      <!-- Card Media Header -->
      <div class="card-media" [attr.data-category]="experience().category">
        @if (experience().image; as image) {
          <img
            [src]="image"
            [alt]="experience().imageAlt ?? experience().title"
            (error)="missingImage = true"
            [hidden]="missingImage"
            loading="lazy"
          />
          @if (missingImage) {
            <app-experience-icon class="placeholder" [name]="category()?.icon ?? 'mountain'" />
          }
        } @else {
          <app-experience-icon class="placeholder" [name]="category()?.icon ?? 'mountain'" />
        }

        <!-- Category Badge Top-Left -->
        <span class="category-badge">
          <app-experience-icon [name]="category()?.icon ?? 'grid'" />
          <span>{{ experience().categoryLabel ?? category()?.label }}</span>
        </span>

        <!-- Wishlist Button Top-Right -->
        @if (liveFavorite()) {
          <app-save-experience class="card-save" [id]="experience().id" [title]="experience().title" />
        }
        @if (preview()) {
          <button
            class="favorite"
            type="button"
            [attr.aria-label]="'Preview favorite: ' + experience().title"
            [attr.aria-pressed]="favorite()"
            (click)="toggleFavorite.emit()"
          >
            <app-experience-icon name="heart" />
          </button>
        }
      </div>

      <!-- Card Body -->
      <div class="card-body">
        <!-- Experience Title -->
        <h3 class="card-title">
          @if (detailLink()) {
            <a class="card-title-link" [routerLink]="['/experiences', experience().id]">{{ experience().title }}</a>
          } @else {
            {{ experience().title }}
          }
        </h3>

        <!-- Location with Pin Icon -->
        <p class="card-location">
          <app-experience-icon name="pin" />
          <span>{{ experience().location }}</span>
        </p>

        <!-- Rating & Reviews -->
        <div class="card-rating-row">
          @if (experience().rating != null && experience().reviews != null) {
            <span class="card-rating" [attr.aria-label]="experience().rating + ' out of 5, ' + experience().reviews + ' reviews'">
              <span class="star-icons">
                <app-experience-icon name="star" />
                <app-experience-icon name="star" />
                <app-experience-icon name="star" />
                <app-experience-icon name="star" />
                <app-experience-icon name="star" />
              </span>
              <strong class="rating-val">{{ experience().rating | number:'1.1-1' }}</strong>
              <span class="reviews-count">({{ experience().reviews | number }} reviews)</span>
            </span>
          }
        </div>

        <!-- Activity Metadata: Duration & Capacity -->
        <div class="card-activity-meta">
          <span class="meta-item duration">
            <app-experience-icon name="clock" />
            <span>{{ experience().duration || '≈ 3 hours' }}</span>
          </span>
          <span class="meta-item capacity">
            <app-experience-icon name="user" />
            <span>{{ experience().maxParticipants ? 'Max ' + experience().maxParticipants + ' people' : 'Max 8 people' }}</span>
          </span>
        </div>

        <!-- Price & Action Footer -->
        <div class="card-footer-row">
          <div class="price-wrap">
            <div class="price-amount">
              <strong>{{ experience().currency ?? 'LKR' }} {{ experience().price | number }}</strong>
              <span class="price-unit"> / {{ experience().unit ?? 'person' }}</span>
            </div>
          </div>

          @if (detailLink()) {
            <a [routerLink]="['/experiences', experience().id]" class="btn-view-details">
              <span>View Details</span>
              <span class="btn-arrow">→</span>
            </a>
          }
        </div>
      </div>
    </article>
  `,
})
export class ExperienceCard {
  readonly experience = input.required<Experience>();
  readonly favorite = input.required<boolean>();
  readonly preview = input(false);
  readonly liveFavorite = input(false);
  readonly detailLink = input(false);
  readonly toggleFavorite = output<void>();
  readonly category = computed(() => categories.find((c) => c.id === this.experience().category));
  missingImage = false;
}
