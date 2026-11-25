import { Provider } from '@angular/core';
import { demoExperiences } from '../testing/demo-experiences';
import { EXPERIENCE_CATALOG } from './catalog';

import { WEATHER_SOURCE } from './weather-api';
import { BOOKABLE_PREVIEW, TRAVEL_SOURCE } from './travel-api';
import { demoTravel, previewListing } from '../testing/demo-travel';
import { demoWeather } from '../testing/demo-weather';

export const catalogProviders: Provider[] = [
  { provide: TRAVEL_SOURCE, useValue: demoTravel },
  { provide: BOOKABLE_PREVIEW, useValue: previewListing },
  { provide: WEATHER_SOURCE, useValue: demoWeather },
  { provide: EXPERIENCE_CATALOG, useValue: { preview: true, experiences: demoExperiences } },
];
