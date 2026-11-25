import { Component, input } from '@angular/core';

export interface Destination {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly image: string;
}

@Component({
  selector: 'app-destination-card',
  standalone: true,
  templateUrl: './destination-card.html',
  styleUrl: './destination-card.scss'
})
export class DestinationCard {
  readonly destination = input.required<Destination>();
}
