import { DOCUMENT, DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, inject, Injector, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, forkJoin, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingPanel } from '../../components/booking-panel';
import { SaveControl } from '../../components/save-control';
import { BOOKABLE_PREVIEW } from '../../services/travel-api';
import { WeatherPanel } from '../../components/weather-panel/weather-panel';
import { coordinatesOf } from '../../models/weather';
import { TravelerHeader } from '../../components/traveler-header';
import { ExperienceIcon } from '../../components/icon';
import { categories, Category, Experience } from '../../models/catalog';
import { EcoDetail, EcoReviews, EcoSlot } from '../../models/eco';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { EcoApi, ecoImageUrl, toExperience } from '../../services/eco-api';

interface DetailImage { url: string; caption: string }

interface Detail {
  card: Experience;
  eco?: EcoDetail;
  images: DetailImage[];
  reviews?: EcoReviews | null;
  slots?: EcoSlot[] | null;
}

type DetailState = { status: 'loading' | 'missing' | 'error' } | { status: 'ready'; detail: Detail };

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe, TravelerHeader, ExperienceIcon, WeatherPanel, BookingPanel, SaveControl],
  templateUrl: './details.html',
  styleUrls: ['../discover/discover.scss', './details.scss', '../traveler/traveler.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ExperienceDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly viewport = inject(ViewportScroller);
  private readonly injector = inject(Injector);
  readonly shareStatus = signal('');
  readonly shareUrl = signal('');
  readonly viewedImage = signal<DetailImage | null>(null);
  readonly failedImages = signal<ReadonlySet<string>>(new Set());
  private readonly api = inject(EcoApi);
  private readonly reload = signal(0);
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly coordinatesOf = coordinatesOf;
  readonly sample = inject(BOOKABLE_PREVIEW);

  readonly state = toSignal(combineLatest([
    this.route.paramMap.pipe(map(params => params.get('id') ?? ''), distinctUntilChanged(), tap(() => {
      this.failedImages.set(new Set());
      this.shareStatus.set('');
      this.shareUrl.set('');
      this.viewedImage.set(null);
      afterNextRender(() => this.viewport.scrollToPosition([0, 0], {behavior: 'instant'}), {injector: this.injector});
    })),
    toObservable(this.reload),
  ]).pipe(switchMap(([id]) => {
    if (this.catalog.preview) {
      const card = this.catalog.experiences.find(item => item.id === id);
      if (!card) return of<DetailState>({ status: 'missing' });
      return of<DetailState>({ status: 'ready', detail: {
        card, images: card.image ? [{ url: '/' + card.image, caption: card.imageAlt ?? '' }] : [],
      } });
    }
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return of<DetailState>({ status: 'missing' });
    }
    const number = Number(id);
    return this.api.detail(number).pipe(
      switchMap(eco => forkJoin({
        reviews: this.api.reviews(number).pipe(catchError(() => of(null))),
        slots: this.api.availability(number).pipe(catchError(() => of(null))),
      }).pipe(
        startWith({ reviews: undefined, slots: undefined }),
        map(({ reviews, slots }): DetailState => {
          const images = [...(eco.images ?? [])]
            .sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order)
            .flatMap(image => {
              const url = ecoImageUrl(image.image_url);
              return url ? [{ url, caption: image.caption ?? '' }] : [];
            });
          return { status: 'ready', detail: { card: toExperience(eco), eco, images, reviews, slots } };
        }),
      )),
      startWith({ status: 'loading' } as DetailState),
      catchError((error: HttpErrorResponse) => of<DetailState>({
        status: error.status === 404 ? 'missing' : 'error',
      })),
    );
  })), { initialValue: { status: 'loading' } as DetailState });

  categoryName(category: Category): string {
    return categories.find(item => item.id === category)?.label ?? '';
  }

  openImage(image: DetailImage, dialog: HTMLDialogElement): void {
    this.viewedImage.set(image);
    dialog.showModal();
  }

  async share(title: string): Promise<void> {
    const view = this.document.defaultView;
    if (!view) return;
    const url = view.location.origin + view.location.pathname;
    this.shareStatus.set('');
    this.shareUrl.set('');
    try {
      if (view.navigator.share) {
        await view.navigator.share({title, url});
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
    try {
      await view.navigator.clipboard.writeText(url);
      this.shareStatus.set('Link copied.');
    } catch {
      this.shareUrl.set(url);
      this.shareStatus.set('Copy the link below to share this experience.');
    }
  }

  imageFailed(url: string): void {
    this.failedImages.update(images => new Set([...images, url]));
  }

  retry(): void { this.reload.update(value => value + 1); }
}
