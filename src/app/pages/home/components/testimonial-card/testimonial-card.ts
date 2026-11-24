import { Component, input } from '@angular/core';

export interface TestimonialItem {
  readonly id: string;
  readonly name: string;
  readonly rating: number;
  readonly comment: string;
  readonly avatar: string;
  readonly isDemo?: boolean;
}

@Component({
  selector: 'app-testimonial-card',
  standalone: true,
  templateUrl: './testimonial-card.html',
  styleUrl: './testimonial-card.scss'
})
export class TestimonialCard {
  readonly testimonial = input.required<TestimonialItem>();
}
