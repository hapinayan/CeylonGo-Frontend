export const wishlistKinds = ['homestay', 'eco', 'guide', 'rental'] as const;
export type WishlistKind = typeof wishlistKinds[number];

export const wishlistLabels = {
  homestay: 'Homestays', eco: 'Adventure & Activities', guide: 'Tour Guides', rental: 'Bike & Bicycle Rental',
} satisfies Record<WishlistKind, string>;

export interface SavedListing {
  kind: WishlistKind;
  id: number;
  title: string;
  location?: string | null;
  image?: string | null;
  savedAt: string;
  price?: number | null;
  currency?: string;
  unit?: string;
  rating?: number | null;
  reviews?: number;
  detail?: readonly (string | number)[];
}

export const listingKey = (item: SavedListing) => item.kind + '/' + item.id;
export const listingLocation = (...parts: (string | null | undefined)[]) =>
  [...new Set(parts.filter(Boolean))].join(', ');

export function displayListings(items: SavedListing[], category: string, query: string, sort: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return [...new Map(items.map(item => [listingKey(item), item])).values()]
    .filter(item => category === 'all' || item.kind === category)
    .filter(item => {
      const description = [item.title, wishlistLabels[item.kind], item.location].join(' ').toLowerCase();
      return terms.every(term => description.includes(term));
    }).sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title);
      if (sort === 'price') {
        if (a.price == null || b.price == null) return Number(a.price == null) - Number(b.price == null);
        return (a.currency ?? '').localeCompare(b.currency ?? '') || a.price - b.price;
      }
      return (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0);
    });
}
