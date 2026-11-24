import { SaveControl } from './save-control';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { categories, Experience } from '../models/catalog';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-card',
  imports: [ExperienceIcon, DecimalPipe, RouterLink, SaveControl],
  template: `
    <article class="experience-card">
      <div class="card-media" [attr.data-category]="experience().category">
        @if (experience().image; as image) {
          <img [src]="image" [alt]="experience().imageAlt ?? ''"
            (error)="missingImage = true" [hidden]="missingImage" loading="lazy">
          @if (missingImage) { <app-experience-icon class="placeholder" [name]="category()?.icon ?? 'mountain'" /> }
        } @else {
          <app-experience-icon class="placeholder" [name]="category()?.icon ?? 'mountain'" />
        }
        @if (liveFavorite()) { <app-save-experience class="card-save" [id]="experience().id" [title]="experience().title" /> }
        @if (preview()) { <button class="favorite" type="button" [attr.aria-label]="'Preview favorite: ' + experience().title"
          [attr.aria-pressed]="favorite()" (click)="toggleFavorite.emit()"><app-experience-icon name="heart" /></button> }
        <span class="category-badge"><app-experience-icon [name]="category()?.icon ?? 'grid'" />{{ experience().categoryLabel ?? category()?.label }}</span>
      </div>
      <div class="card-body">
        <h3>@if (detailLink()) { <a [routerLink]="['/experiences', experience().id]">{{ experience().title }}</a> } @else { {{ experience().title }} }</h3>
        <p class="card-location"><app-experience-icon name="pin" />{{ experience().location }}</p>
        <div class="card-meta">
          @if (experience().rating != null && experience().reviews != null) { <span class="card-rating" [attr.aria-label]="experience().rating + ' out of 5, ' + experience().reviews + ' reviews'">
            <app-experience-icon name="star" /><strong>{{ experience().rating | number:'1.1-1' }}</strong>
            <span>({{ experience().reviews | number }})</span>
          </span> }
          <span><strong>{{ experience().currency ?? 'LKR' }} {{ experience().price | number }}</strong>@if (experience().unit) { <small> / {{ experience().unit }}</small> }</span>
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
  readonly category = computed(() => categories.find(category => category.id === this.experience().category));
  missingImage = false;
}
