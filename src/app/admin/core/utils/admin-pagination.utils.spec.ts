import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { extractAdminErrorMessage, isConcurrencyConflictError } from './admin-error.utils';
import { calculateTotalPages, normalizePagination } from './admin-pagination.utils';

describe('AdminPaginationUtils & AdminErrorUtils', () => {
  describe('Pagination Utils', () => {
    it('should calculate total pages correctly', () => {
      expect(calculateTotalPages(0, 20)).toBe(1);
      expect(calculateTotalPages(19, 20)).toBe(1);
      expect(calculateTotalPages(20, 20)).toBe(1);
      expect(calculateTotalPages(21, 20)).toBe(2);
      expect(calculateTotalPages(105, 20)).toBe(6);
    });

    it('should normalize pagination with safe bounds and offsets', () => {
      const p1 = normalizePagination(1, 20, 45);
      expect(p1.page).toBe(1);
      expect(p1.pageSize).toBe(20);
      expect(p1.offset).toBe(0);
      expect(p1.totalPages).toBe(3);

      const p2 = normalizePagination(2, 20, 45);
      expect(p2.page).toBe(2);
      expect(p2.offset).toBe(20);

      // Page beyond total pages should be clamped
      const p3 = normalizePagination(10, 20, 45);
      expect(p3.page).toBe(3);
      expect(p3.offset).toBe(40);

      // Negative or zero page should be normalized to 1
      const p4 = normalizePagination(-5, 20, 45);
      expect(p4.page).toBe(1);
      expect(p4.offset).toBe(0);
    });
  });

  describe('Error Utils', () => {
    it('should extract human-friendly error messages from HttpErrorResponse', () => {
      const err0 = new HttpErrorResponse({ status: 0 });
      expect(extractAdminErrorMessage(err0)).toContain('Unable to reach CeylonGo backend service');

      const err401 = new HttpErrorResponse({ status: 401 });
      expect(extractAdminErrorMessage(err401)).toContain('session has expired');

      const err403 = new HttpErrorResponse({ status: 403 });
      expect(extractAdminErrorMessage(err403)).toContain('authorization to perform this action');

      const err404 = new HttpErrorResponse({ status: 404, error: { detail: 'Traveler #999 not found.' } });
      expect(extractAdminErrorMessage(err404)).toBe('Traveler #999 not found.');

      const err409 = new HttpErrorResponse({ status: 409, error: { detail: 'State changed concurrently.' } });
      expect(extractAdminErrorMessage(err409)).toBe('State changed concurrently.');
      expect(isConcurrencyConflictError(err409)).toBe(true);

      const err422 = new HttpErrorResponse({
        status: 422,
        error: { detail: [{ loc: ['body', 'reason'], msg: 'Rejection reason too short.' }] },
      });
      expect(extractAdminErrorMessage(err422)).toBe('body.reason: Rejection reason too short.');
    });

    it('should handle standard Error and fallback messages', () => {
      expect(extractAdminErrorMessage(new Error('Custom error message'))).toBe('Custom error message');
      expect(extractAdminErrorMessage(null, 'Fallback')).toBe('Fallback');
    });
  });
});
