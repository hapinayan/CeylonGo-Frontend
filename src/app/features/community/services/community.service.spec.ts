import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderAuthService } from '../../../core/services/provider-auth.service';
import { environment } from '../../../../environments/environment';
import {
  CommunityService,
  formatCommunityError,
  validateCommunityPhotoFile,
} from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;
  let travelerToken: string | null = 'traveler-jwt-123';
  let providerToken: string | null = 'provider-jwt-999';

  beforeEach(() => {
    travelerToken = 'traveler-jwt-123';
    providerToken = 'provider-jwt-999';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { getToken: vi.fn(() => travelerToken) },
        },
        {
          provide: ProviderAuthService,
          useValue: { getToken: vi.fn(() => providerToken) },
        },
      ],
    });

    service = TestBed.inject(CommunityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches public community posts anonymously when unauthenticated and sends filters', () => {
    travelerToken = null;

    service
      .getPosts({ page: 2, page_size: 10, search: 'Ella', author_type: 'provider' }, 'traveler')
      .subscribe((page) => {
        expect(page.total).toBe(21);
        expect(page.items.length).toBe(1);
        expect(page.items[0].media[0].image_url).toMatch(/^http/);
      });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/community/posts`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('search')).toBe('Ella');
    expect(req.request.params.get('author_type')).toBe('provider');
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush({
      items: [
        {
          id: 21,
          author_id: 5,
          author_name: 'Nadee',
          author_type: 'provider',
          author: {
            id: 5,
            full_name: 'Nadee',
            author_type: 'provider',
            provider_profile_id: 11,
            provider_business_name: 'Ella Trails',
            provider_district: 'Badulla',
            is_verified_provider: true,
            member_since: '2026-01-01T00:00:00Z',
          },
          body: 'Morning hike in Ella',
          visibility: 'visible',
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
          likes_count: 3,
          comments_count: 1,
          viewer_has_liked: false,
          viewer_has_saved: false,
          media: [
            {
              id: 1,
              post_id: 21,
              media_type: 'image',
              image_url: '/media/community/ella.jpg',
              alt_text: 'Ella view',
              display_order: 0,
              created_at: '2026-11-26T00:00:00Z',
            },
          ],
        },
      ],
      total: 21,
      page: 2,
      page_size: 10,
      total_pages: 3,
    });
  });

  it('strictly attaches Provider JWT when actor is provider and Traveler JWT when actor is traveler', () => {
    service.createPost('Provider seasonal post', 'provider').subscribe();
    const providerReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts`);
    expect(providerReq.request.headers.get('Authorization')).toBe('Bearer provider-jwt-999');
    providerReq.flush({ id: 30, body: 'Provider seasonal post', media: [] });

    service.createPost('Traveler story', 'traveler').subscribe();
    const travelerReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts`);
    expect(travelerReq.request.headers.get('Authorization')).toBe('Bearer traveler-jwt-123');
    travelerReq.flush({ id: 31, body: 'Traveler story', media: [] });
  });

  it('throws authentication required error before issuing protected requests when token missing', () => {
    providerToken = null;
    let caughtError: Error | null = null;
    service.getSavedPosts(1, 10, 'provider').subscribe({
      error: (err) => {
        caughtError = err;
      },
    });
    expect(caughtError).toBeTruthy();
    expect(formatCommunityError(caughtError, 'fallback')).toContain('approved provider');
  });

  it('supports photo upload, like, save, comment, and report endpoints', () => {
    const file = new File(['abc'], 'beach.jpg', { type: 'image/jpeg' });
    service.uploadPostPhoto(21, file, 'Beach sunrise', 'traveler').subscribe();
    const uploadReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts/21/media`);
    expect(uploadReq.request.method).toBe('POST');
    expect(uploadReq.request.body instanceof FormData).toBe(true);
    uploadReq.flush({ id: 9, post_id: 21, image_url: '/media/beach.jpg' });

    service.likePost(21, 'traveler').subscribe();
    const likeReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts/21/like`);
    expect(likeReq.request.method).toBe('PUT');
    likeReq.flush({ post_id: 21, liked: true, likes_count: 1 });

    service.savePost(21, 'traveler').subscribe();
    const saveReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts/21/save`);
    expect(saveReq.request.method).toBe('PUT');
    saveReq.flush({ post_id: 21, saved: true });

    service.createComment(21, 'Lovely spot!', 'provider').subscribe();
    const commentReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/posts/21/comments`);
    expect(commentReq.request.method).toBe('POST');
    expect(commentReq.request.headers.get('Authorization')).toBe('Bearer provider-jwt-999');
    commentReq.flush({ id: 50, post_id: 21, body: 'Lovely spot!' });

    service
      .submitReport(
        { entity_type: 'comment', entity_id: 50, reason: 'Spam or misleading promotion' },
        'traveler',
      )
      .subscribe();
    const reportReq = httpMock.expectOne(`${environment.apiBaseUrl}/community/reports`);
    expect(reportReq.request.method).toBe('POST');
    reportReq.flush({ id: 7, status: 'pending' });
  });

  it('validates photo file type, empty files, max size (5MB), and max count (6)', () => {
    const validFile = new File(['hello'], 'photo.webp', { type: 'image/webp' });
    expect(validateCommunityPhotoFile(validFile, 0)).toBeNull();
    expect(validateCommunityPhotoFile(validFile, 6)).toContain('at most 6');

    const invalidExt = new File(['hello'], 'script.gif', { type: 'image/gif' });
    expect(validateCommunityPhotoFile(invalidExt, 0)).toContain('JPEG, PNG, and WebP');

    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    expect(validateCommunityPhotoFile(emptyFile, 0)).toContain('empty');

    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 10)], 'huge.png', {
      type: 'image/png',
    });
    expect(validateCommunityPhotoFile(oversized, 0)).toContain('5 MB');
  });

  it('formats 401/403/404/409/422/503 HTTP errors cleanly', () => {
    expect(formatCommunityError(new HttpErrorResponse({ status: 403 }), 'err')).toContain('permission');
    expect(formatCommunityError(new HttpErrorResponse({ status: 409 }), 'err')).toContain('conflicts');
    expect(
      formatCommunityError(
        new HttpErrorResponse({ status: 422, error: { detail: 'You cannot report your own content.' } }),
        'err',
      ),
    ).toBe('You cannot report your own content.');
  });
});
