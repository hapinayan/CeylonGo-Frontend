import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../../core/interceptors/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderAuthService } from '../../../core/services/provider-auth.service';
import {
  CommunityActorContext,
  CommunityCommentDetails,
  CommunityFeedFilters,
  CommunityLikeStatus,
  CommunityPage,
  CommunityPostDetails,
  CommunityPostMediaItem,
  CommunityReportCreateRequest,
  CommunityReportDetails,
  CommunitySaveStatus,
} from '../models/community.models';

export const COMMUNITY_MAX_PHOTOS_PER_POST = 6;
export const COMMUNITY_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT_RE = /\.(jpe?g|png|webp)$/i;

export function resolveCommunityMediaUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  try {
    const baseOrigin = new URL(environment.apiBaseUrl).origin;
    const resolved = new URL(value, baseOrigin);
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : '';
  } catch {
    return value;
  }
}

export function validateCommunityPhotoFile(file: File, existingCount = 0): string | null {
  if (existingCount >= COMMUNITY_MAX_PHOTOS_PER_POST) {
    return `You can upload at most ${COMMUNITY_MAX_PHOTOS_PER_POST} photos per post.`;
  }
  const mime = (file.type || '').toLowerCase();
  if (!COMMUNITY_ALLOWED_PHOTO_TYPES.has(mime) && !ALLOWED_EXT_RE.test(file.name || '')) {
    return 'Only JPEG, PNG, and WebP photographs are supported.';
  }
  if (file.size <= 0) {
    return 'Selected photo file is empty.';
  }
  if (file.size > COMMUNITY_MAX_PHOTO_BYTES) {
    return 'Each photograph must be 5 MB or smaller.';
  }
  return null;
}

export function formatCommunityError(err: unknown, fallback: string): string {
  if (err instanceof Error && (err.message === 'AUTHENTICATION_REQUIRED' || err.message === 'PROVIDER_AUTH_REQUIRED')) {
    return err.message === 'PROVIDER_AUTH_REQUIRED'
      ? 'Sign in with an approved provider account to perform this action.'
      : 'Please sign in to perform this action.';
  }
  const httpErr = err as HttpErrorResponse;
  const detail = httpErr?.error?.detail;
  const msg =
    typeof detail === 'string' && detail.trim()
      ? detail
      : Array.isArray(detail) && detail[0]?.msg
        ? String(detail[0].msg)
        : null;

  switch (httpErr?.status) {
    case 401:
      return msg || 'Your session has expired. Please sign in again.';
    case 403:
      return msg || 'You do not have permission to perform this action.';
    case 404:
      return msg || 'The requested post, comment, or media item was not found.';
    case 409:
      return msg || 'This action conflicts with an existing record.';
    case 422:
      return msg || 'Please check your input and try again.';
    case 503:
      return msg || 'Community storage is temporarily unavailable.';
    default:
      return msg || fallback;
  }
}

@Injectable({
  providedIn: 'root',
})
export class CommunityService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly providerAuthService = inject(ProviderAuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/community`;

  private getTokenForActor(actor: CommunityActorContext): string | null {
    return actor === 'provider'
      ? this.providerAuthService.getToken()
      : this.authService.getToken();
  }

  private requireAuthOptions(
    actor: CommunityActorContext,
    isMultipart = false,
  ): { headers: HttpHeaders } {
    const token = this.getTokenForActor(actor);
    if (!token) {
      throw new Error(actor === 'provider' ? 'PROVIDER_AUTH_REQUIRED' : 'AUTHENTICATION_REQUIRED');
    }
    let headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    if (!isMultipart) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return { headers };
  }

  private publicOrActorOptions(actor: CommunityActorContext): {
    headers?: HttpHeaders;
    context?: HttpContext;
  } {
    const token = this.getTokenForActor(actor);
    if (token) {
      return {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      };
    }
    return {
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    };
  }

  getPosts(
    filters: CommunityFeedFilters = {},
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPage<CommunityPostDetails>> {
    return this.fetchFeedEndpoint(`${this.baseUrl}/posts`, filters, actor);
  }

  getFeed(
    filters: CommunityFeedFilters = {},
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPage<CommunityPostDetails>> {
    return this.fetchFeedEndpoint(`${this.baseUrl}/feed`, filters, actor);
  }

  private fetchFeedEndpoint(
    url: string,
    filters: CommunityFeedFilters,
    actor: CommunityActorContext,
  ): Observable<CommunityPage<CommunityPostDetails>> {
    let params = new HttpParams()
      .set('page', String(Math.max(1, filters.page ?? 1)))
      .set('page_size', String(Math.min(50, Math.max(1, filters.page_size ?? 10))));

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim().slice(0, 150));
    }
    if (filters.author_id && filters.author_id > 0) {
      params = params.set('author_id', String(filters.author_id));
    }
    if (filters.author_type) {
      params = params.set('author_type', filters.author_type);
    }

    const opts = this.publicOrActorOptions(actor);
    return this.http
      .get<CommunityPage<CommunityPostDetails>>(url, { params, ...opts })
      .pipe(map((page) => this.normalizePostPage(page)));
  }

  getMyPosts(
    page = 1,
    pageSize = 10,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPage<CommunityPostDetails>> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    const params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('page_size', String(Math.min(50, Math.max(1, pageSize))));

    return this.http
      .get<CommunityPage<CommunityPostDetails>>(`${this.baseUrl}/posts/me`, { params, ...opts })
      .pipe(map((res) => this.normalizePostPage(res)));
  }

  getPostById(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPostDetails> {
    const opts = this.publicOrActorOptions(actor);
    return this.http
      .get<CommunityPostDetails>(`${this.baseUrl}/posts/${postId}`, opts)
      .pipe(map((post) => this.normalizePost(post)));
  }

  createPost(
    body: string,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPostDetails> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http
      .post<CommunityPostDetails>(`${this.baseUrl}/posts`, { body }, opts)
      .pipe(map((post) => this.normalizePost(post)));
  }

  updatePost(
    postId: number,
    body: string,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPostDetails> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http
      .patch<CommunityPostDetails>(`${this.baseUrl}/posts/${postId}`, { body }, opts)
      .pipe(map((post) => this.normalizePost(post)));
  }

  deletePost(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<{ deleted: boolean; post_id: number; visibility: string }> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<{ deleted: boolean; post_id: number; visibility: string }>(
      `${this.baseUrl}/posts/${postId}`,
      opts,
    );
  }

  uploadPostPhoto(
    postId: number,
    file: File,
    altText: string | null = null,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPostMediaItem> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor, true);
    } catch (err) {
      return throwError(() => err);
    }
    const formData = new FormData();
    formData.append('file', file);
    if (altText && altText.trim()) {
      formData.append('alt_text', altText.trim().slice(0, 160));
    }
    return this.http
      .post<CommunityPostMediaItem>(`${this.baseUrl}/posts/${postId}/media`, formData, opts)
      .pipe(map((item) => this.normalizeMedia(item)));
  }

  deletePostPhoto(
    postId: number,
    mediaId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<{ deleted: boolean; media_id: number; post_id: number }> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<{ deleted: boolean; media_id: number; post_id: number }>(
      `${this.baseUrl}/posts/${postId}/media/${mediaId}`,
      opts,
    );
  }

  likePost(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityLikeStatus> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.put<CommunityLikeStatus>(`${this.baseUrl}/posts/${postId}/like`, {}, opts);
  }

  unlikePost(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityLikeStatus> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<CommunityLikeStatus>(`${this.baseUrl}/posts/${postId}/like`, opts);
  }

  getComments(
    postId: number,
    page = 1,
    pageSize = 20,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPage<CommunityCommentDetails>> {
    const params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('page_size', String(Math.min(50, Math.max(1, pageSize))));
    const opts = this.publicOrActorOptions(actor);
    return this.http.get<CommunityPage<CommunityCommentDetails>>(
      `${this.baseUrl}/posts/${postId}/comments`,
      { params, ...opts },
    );
  }

  createComment(
    postId: number,
    body: string,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityCommentDetails> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<CommunityCommentDetails>(
      `${this.baseUrl}/posts/${postId}/comments`,
      { body },
      opts,
    );
  }

  updateComment(
    commentId: number,
    body: string,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityCommentDetails> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.patch<CommunityCommentDetails>(
      `${this.baseUrl}/comments/${commentId}`,
      { body },
      opts,
    );
  }

  deleteComment(
    commentId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<{ deleted: boolean; comment_id: number; visibility: string }> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<{ deleted: boolean; comment_id: number; visibility: string }>(
      `${this.baseUrl}/comments/${commentId}`,
      opts,
    );
  }

  savePost(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunitySaveStatus> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.put<CommunitySaveStatus>(`${this.baseUrl}/posts/${postId}/save`, {}, opts);
  }

  unsavePost(
    postId: number,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunitySaveStatus> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<CommunitySaveStatus>(`${this.baseUrl}/posts/${postId}/save`, opts);
  }

  getSavedPosts(
    page = 1,
    pageSize = 10,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityPage<CommunityPostDetails>> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    const params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('page_size', String(Math.min(50, Math.max(1, pageSize))));

    return this.http
      .get<CommunityPage<CommunityPostDetails>>(`${this.baseUrl}/saved`, { params, ...opts })
      .pipe(
        map((res) => this.normalizePostPage(res)),
        catchError((err) => throwError(() => err)),
      );
  }

  submitReport(
    payload: CommunityReportCreateRequest,
    actor: CommunityActorContext = 'traveler',
  ): Observable<CommunityReportDetails> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireAuthOptions(actor);
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<CommunityReportDetails>(`${this.baseUrl}/reports`, payload, opts);
  }

  private normalizePostPage(page: CommunityPage<CommunityPostDetails>): CommunityPage<CommunityPostDetails> {
    const items = Array.isArray(page?.items) ? page.items.map((p) => this.normalizePost(p)) : [];
    return {
      items,
      total: page?.total ?? items.length,
      page: page?.page ?? 1,
      page_size: page?.page_size ?? 10,
      total_pages: page?.total_pages ?? 1,
    };
  }

  private normalizePost(post: CommunityPostDetails): CommunityPostDetails {
    return {
      ...post,
      media: Array.isArray(post?.media) ? post.media.map((m) => this.normalizeMedia(m)) : [],
    };
  }

  private normalizeMedia(media: CommunityPostMediaItem): CommunityPostMediaItem {
    return {
      ...media,
      image_url: resolveCommunityMediaUrl(media.image_url),
    };
  }
}
