import { InjectionToken } from '@angular/core';
import { Catalog } from '../models/catalog';

export const EXPERIENCE_CATALOG = new InjectionToken<Catalog>('Experience catalog', {
  factory: () => ({ preview: false, experiences: [] }),
});
