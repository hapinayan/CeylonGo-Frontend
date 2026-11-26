import { describe, expect, it } from 'vitest';
import { LkrCurrencyPipe } from './lkr-currency.pipe';

describe('LkrCurrencyPipe', () => {
  const pipe = new LkrCurrencyPipe();

  it('transforms valid numeric price into formatted LKR string', () => {
    expect(pipe.transform(7500)).toBe('LKR 7,500');
    expect(pipe.transform(4200)).toBe('LKR 4,200');
    expect(pipe.transform(125000)).toBe('LKR 125,000');
  });

  it('transforms string numbers correctly', () => {
    expect(pipe.transform('6800')).toBe('LKR 6,800');
  });

  it('returns "Price on inquiry" for null, undefined, or empty values', () => {
    expect(pipe.transform(null)).toBe('Price on inquiry');
    expect(pipe.transform(undefined)).toBe('Price on inquiry');
    expect(pipe.transform('')).toBe('Price on inquiry');
  });

  it('returns "Price on inquiry" for non-numeric NaN input', () => {
    expect(pipe.transform('abc')).toBe('Price on inquiry');
  });
});
