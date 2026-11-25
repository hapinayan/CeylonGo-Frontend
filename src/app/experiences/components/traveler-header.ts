import { Component } from '@angular/core';
import { TravelerNavbar } from '../../shared/components/traveler-navbar/traveler-navbar';

@Component({
  selector: 'app-traveler-header',
  standalone: true,
  imports: [TravelerNavbar],
  template: `<app-traveler-navbar />`,
})
export class TravelerHeader {}
