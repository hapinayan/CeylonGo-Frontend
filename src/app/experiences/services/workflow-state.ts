import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, startWith } from 'rxjs';

export type LoadState<T> = { status: 'loading' | 'idle' } | { status: 'ready'; data: T } | { status: 'error'; code: number };
export function loadState<T>(request: Observable<T>): Observable<LoadState<T>> {
  return request.pipe(
    map((data): LoadState<T> => ({status: 'ready', data})),
    startWith({status: 'loading'} as LoadState<T>),
    catchError((error: HttpErrorResponse) => of<LoadState<T>>({status: 'error', code: error.status})),
  );
}
export function positiveId(value: string): number | null {
  const number = Number(value);
  return /^[1-9][0-9]*$/.test(value) && number <= 2147483647 ? number : null;
}
export function publishDate(offset = 0, timestamp = Date.now()): string {
  const date = new Date(timestamp + (offset * 24 * 60 + 330) * 60000);
  return date.toISOString().slice(0, 10);
}
