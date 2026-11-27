import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-artisan-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './artisan-landing.component.html',
  styleUrl: './artisan-landing.component.scss',
})
export class ArtisanLandingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly isDemoMode = signal<boolean>(false);

  readonly queryParams = computed(() => {
    return this.isDemoMode() ? { demo: 'true' } : {};
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const demo = params.get('demo') === 'true';
      this.isDemoMode.set(demo);
    });
  }
}
