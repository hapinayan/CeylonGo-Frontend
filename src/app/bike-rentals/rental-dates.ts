const DAY_MS = 86_400_000;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface RentalDates { pickup_at: string; return_at: string }

function timestamp(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !CLOCK.test(time)) return '';
  const calendar = new Date(date);
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === date
    ? date + 'T' + time + ':00+05:30' : '';
}

export function dateWindow(pickup: string, pickupTime: string, dropoff: string, dropoffTime: string, now = Date.now()) {
  const pickup_at = timestamp(pickup, pickupTime);
  const return_at = timestamp(dropoff, dropoffTime);
  if (!pickup_at || !return_at) return { error: 'Enter valid pickup and return dates and times.' } as const;
  const start = Date.parse(pickup_at);
  const end = Date.parse(return_at);
  if (start <= now) return { error: 'Pickup must be in the future.' } as const;
  if (end <= start) return { error: 'Return must be after pickup.' } as const;
  return { dates: { pickup_at, return_at }, days: Math.ceil((end - start) / DAY_MS), hours: Math.round((end - start) / 36_000) / 100 };
}

export function sriLankaDate(instant: number): string {
  return new Date(instant + 19_800_000).toISOString().slice(0, 10);
}

export function previewBlockedDay(now = Date.now()): string {
  return sriLankaDate(now + 2 * DAY_MS);
}

export function previewDateAvailable(dates: RentalDates, now = Date.now()): boolean {
  const start = Date.parse(previewBlockedDay(now) + 'T00:00:00+05:30');
  return !(Date.parse(dates.pickup_at) < start + DAY_MS && Date.parse(dates.return_at) > start);
}
