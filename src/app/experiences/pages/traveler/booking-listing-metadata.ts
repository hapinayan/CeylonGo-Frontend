import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActivityDetails } from '../../models/activity';
import { ActivitiesApi, formatLocation } from '../../services/activities-api';

interface SharedListingPayload {
  id?: number;
  category?: string;
  title?: string;
  vehicle_name?: string;
  city?: string | null;
  locality?: string | null;
  district?: string | null;
  primary_image_url?: string | null;
  image_url?: string | null;
  photos?: Array<{ url?: string | null }>;
  vehicle_type?: string | null;
}

export interface ResolvedBookingListing {
  activity: ActivityDetails | null;
  title: string;
  location: string;
  photoUrl: string | null;
  category: string;
  viewRoute: string[] | null;
  viewLabel: string;
  isRental: boolean;
  isMotorizedRental: boolean;
}

export function resolveBookingListingMetadata(
  http: HttpClient,
  activities: ActivitiesApi,
  listingId: number,
): Observable<ResolvedBookingListing> {
  return activities.detail(listingId).pipe(
    map((activity): ResolvedBookingListing => {
      const cat = ((activity as unknown as SharedListingPayload).category ?? 'adventure').toLowerCase();
      return {
        activity,
        title: activity.title,
        location: formatLocation(activity.locality, activity.district),
        photoUrl: (activity as unknown as SharedListingPayload).primary_image_url ?? activity.photos?.[0]?.image_url ?? null,
        category: cat,
        viewRoute: ['/experiences', String(listingId)],
        viewLabel: 'View experience',
        isRental: false,
        isMotorizedRental: false,
      };
    }),
    catchError(() =>
      http.get<SharedListingPayload>(`${environment.apiBaseUrl}/listings/${listingId}`).pipe(
        map((listing): ResolvedBookingListing => {
          const cat = (listing.category ?? '').toLowerCase();
          const isBicycle = cat === 'bicycle';
          const isBike = cat === 'bike' || cat === 'scooter' || cat === 'motorcycle';
          const isRental = isBike || isBicycle;
          const isGuide = cat === 'guide' || cat === 'tour_guide';

          return {
            activity: null,
            title: listing.title || listing.vehicle_name || `Listing #${listingId}`,
            location: formatLocation(listing.city ?? listing.locality ?? '', listing.district ?? ''),
            photoUrl: listing.primary_image_url ?? listing.photos?.[0]?.url ?? listing.image_url ?? null,
            category: cat || 'listing',
            viewRoute: isRental
              ? ['/bicycles', String(listingId)]
              : isGuide
                ? ['/tour-guides', String(listingId)]
                : ['/experiences', String(listingId)],
            viewLabel: isRental ? 'View vehicle' : isGuide ? 'View guide' : 'View listing',
            isRental,
            isMotorizedRental: isBike && listing.vehicle_type !== 'bicycle',
          };
        }),
        catchError(() =>
          of<ResolvedBookingListing>({
            activity: null,
            title: `Listing #${listingId}`,
            location: '',
            photoUrl: null,
            category: 'listing',
            viewRoute: null,
            viewLabel: 'View listing',
            isRental: false,
            isMotorizedRental: false,
          }),
        ),
      ),
    ),
  );
}
