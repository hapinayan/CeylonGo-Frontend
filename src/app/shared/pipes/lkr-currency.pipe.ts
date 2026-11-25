import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a numeric price into Sri Lankan Rupee currency string: "LKR 7,500"
 */
@Pipe({
  name: 'lkrCurrency',
  standalone: true,
})
export class LkrCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return 'Price on inquiry';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numericValue)) {
      return 'Price on inquiry';
    }

    // Format with comma separation: e.g. 7500 -> "7,500"
    const formatted = Math.round(numericValue).toLocaleString('en-US');
    return `LKR ${formatted}`;
  }
}
