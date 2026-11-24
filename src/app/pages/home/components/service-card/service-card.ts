import { Component, input } from '@angular/core';

export interface ServiceItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

@Component({
  selector: 'app-service-card',
  standalone: true,
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss'
})
export class ServiceCard {
  readonly service = input.required<ServiceItem>();
}
