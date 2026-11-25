import { Component, input } from '@angular/core';

const paths: Record<string, string> = {
  share: 'M12 15V2m-4 4 4-4 4 4M6 9H4v12h16V9h-2',
  expand: 'M9 4H4v5m0-5 6 6m5-6h5v5m0-5-6 6M9 20H4v-5m0 5 6-6m5 6h5v-5m0 5-6-6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  group: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20v-2a6 5 0 0 1 12 0v2 M17 5a3 3 0 1 1 0 6m1 3a4 4 0 0 1 3 4v2',
  shield: 'M12 2l8 4v6c0 4-4 8-8 10-4-2-8-6-8-10V6l8-4z M8 12l3 3 5-6',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  culture: 'M2 9l10-6 10 6H2z M4 20h16 M6 10v8 M10 10v8 M14 10v8 M18 10v8',
  mountain: 'M2 19l6-9 3 4 5-9 6 14H2z',
  leaf: 'M5 20c4-8 7-11 13-15 M8 15c-4 0-6-3-6-7 4 0 6 2 6 7z M9 13C8 6 14 3 22 3c0 8-5 13-13 12',
  wildlife: 'M3 20v-7a7 7 0 0 1 7-7h4a5 5 0 0 1 5 5v6a2 2 0 0 0 4 0v-2 M3 17h4v3 M7 13v4 M11 20v-4h4v4 M15 14c-3 0-4-2-4-4 M19 11h.01',
  water: 'M2 6c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2 M2 12c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2 M2 18c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2',
  food: 'M6 15a4 4 0 1 1 2-7 4 4 0 0 1 8 0 4 4 0 1 1 2 7v6H6v-6z M6 17h12',
  hiking: 'M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M5 22l4-6 2-8 4 3 4 1 M9 16l5 1 2 5 M11 8l-4 2-2 4 M19 11l-2 11',
  cycling: 'M5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M12 17.5V14l-3-3 4-3 2 3h3.5 M12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  calendar: 'M3 5h18v16H3z M3 10h18 M7 3v4 M17 3v4 M8 15h2 M14 15h2',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-2a8 6 0 0 1 16 0v2H4z',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M15 15l6 6',
  heart: 'M12 21 3.7 13a5.2 5.2 0 0 1 7.4-7.4l.9.9.9-.9a5.2 5.2 0 0 1 7.4 7.4L12 21z',
  bell: 'M4 17h16l-2-3V9a6 6 0 0 0-12 0v5l-2 3z M10 21h4',
  filter: 'M3 6h8m4 0h6 M3 12h3m4 0h11 M3 18h12m4 0h2 M11 4h4v4h-4z M6 10h4v4H6z M15 16h4v4h-4z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  previous: 'M19 12H5m6-6-6 6 6 6',
  next: 'M5 12h14m-6-6 6 6-6 6',
};

@Component({
  selector: 'app-experience-icon',
  template: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="path()" /></svg>`,
  styles: ':host { display: inline-flex; width: 1em; height: 1em; flex: none; } svg { width: 100%; height: 100%; }',
})
export class ExperienceIcon {
  readonly name = input.required<string>();
  path() { return paths[this.name()]; }
}
