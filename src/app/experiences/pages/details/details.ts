import { DOCUMENT, DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  inject,
  Injector,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingPanel } from '../../components/booking-panel';
import { ExperienceIcon } from '../../components/icon';
import { SaveControl } from '../../components/save-control';
import { ActivityDetails, ActivitySlotDetails } from '../../models/activity';
import { Experience } from '../../models/catalog';
import {
  ActivitiesApi,
  activityImageUrl,
  extractApiErrorMessage,
  formatDurationMinutes,
  formatLocation,
  toActivityCard,
} from '../../services/activities-api';

interface DetailImage {
  url: string;
  caption: string;
}

interface Detail {
  card: Experience;
  activity: ActivityDetails;
  images: DetailImage[];
  slots?: ActivitySlotDetails[] | null;
  nextOpenSlot?: ActivitySlotDetails | null;
  durationLabel?: string;
  locationLabel: string;
}

type DetailState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: Detail };

@Component({
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    ExperienceIcon,
    BookingPanel,
    SaveControl,
  ],
  templateUrl: './details.html',
  styleUrls: ['../discover/discover.scss', './details.scss', '../traveler/traveler.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ExperienceDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly viewport = inject(ViewportScroller);
  private readonly injector = inject(Injector);
  private readonly api = inject(ActivitiesApi);

  readonly shareStatus = signal('');
  readonly shareUrl = signal('');
  readonly viewedImage = signal<DetailImage | null>(null);
  readonly failedImages = signal<ReadonlySet<string>>(new Set());
  private readonly reload = signal(0);

  readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.failedImages.set(new Set());
          this.shareStatus.set('');
          this.shareUrl.set('');
          this.viewedImage.set(null);
          afterNextRender(
            () => this.viewport.scrollToPosition([0, 0], { behavior: 'instant' }),
            { injector: this.injector },
          );
        }),
      ),
      toObservable(this.reload),
    ]).pipe(
      switchMap(([id]) => {
        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
          return of<DetailState>({ status: 'missing' });
        }
        const listingId = Number(id);
        return this.api.detail(listingId).pipe(
          switchMap((activity) =>
            this.api.availability(listingId, { limit: 50 }).pipe(
              catchError(() => of<ActivitySlotDetails[] | null>(null)),
              startWith(undefined as ActivitySlotDetails[] | null | undefined),
              map((slots): DetailState => {
                const images: DetailImage[] = (activity.photos ?? []).flatMap((photo) => {
                  const url = activityImageUrl(photo.image_url);
                  return url ? [{ url, caption: photo.alt_text ?? '' }] : [];
                });
                const nextOpenSlot = Array.isArray(slots)
                  ? slots.find((slot) => slot.available) ?? null
                  : undefined;

                return {
                  status: 'ready',
                  detail: {
                    card: toActivityCard(activity),
                    activity,
                    images,
                    slots,
                    nextOpenSlot: nextOpenSlot ?? null,
                    durationLabel: formatDurationMinutes(activity.activity?.duration_minutes),
                    locationLabel: formatLocation(activity.locality, activity.district),
                  },
                };
              }),
            ),
          ),
          startWith({ status: 'loading' } as DetailState),
          catchError((error: HttpErrorResponse) =>
            of<DetailState>(
              error.status === 404
                ? { status: 'missing' }
                : {
                    status: 'error',
                    message: extractApiErrorMessage(
                      error,
                      'Could not load this experience. Please try again.',
                    ),
                  },
            ),
          ),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as DetailState },
  );

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
        await view.navigator.share({ title, url });
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
    this.failedImages.update((images) => new Set([...images, url]));
  }

  retry(): void {
    this.reload.update((value) => value + 1);
  }
}
