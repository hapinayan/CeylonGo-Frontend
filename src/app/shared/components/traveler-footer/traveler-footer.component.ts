import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-traveler-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './traveler-footer.component.html',
  styleUrl: './traveler-footer.component.scss'
})
export class TravelerFooterComponent {
  readonly currentYear = new Date().getFullYear();
}
