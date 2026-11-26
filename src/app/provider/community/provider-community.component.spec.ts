import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { CommunityPostDetails } from '../../features/community/models/community.models';
import { CommunityService } from '../../features/community/services/community.service';
import { ProviderPreviewService } from '../provider-preview.service';
import { ProviderCommunityComponent } from './provider-community.component';

function buildProviderPost(id: number, authorType: 'traveler' | 'provider' = 'provider'): CommunityPostDetails {
  return {
    id,
    author_id: 50,
    author_name: 'Lanka Spice Farm',
    author_type: authorType,
    author: {
      id: 50,
      full_name: 'Lanka Spice Farm',
      author_type: authorType,
      provider_profile_id: 8,
      provider_business_name: 'Lanka Spice Farm',
      provider_district: 'Matale',
      is_verified_provider: true,
      member_since: '',
    },
    body: 'Seasonal Ceylon cinnamon harvest tour now open!',
    visibility: 'visible',
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
    likes_count: 7,
    comments_count: 1,
    viewer_has_liked: false,
    viewer_has_saved: false,
    media: [],
  };
}

describe('ProviderCommunityComponent', () => {
  let component: ProviderCommunityComponent;
  let fixture: ComponentFixture<ProviderCommunityComponent>;
  let serviceSpy: {
    getPosts: ReturnType<typeof vi.fn>;
    getMyPosts: ReturnType<typeof vi.fn>;
    getSavedPosts: ReturnType<typeof vi.fn>;
    getComments: ReturnType<typeof vi.fn>;
    createComment: ReturnType<typeof vi.fn>;
  };
  let previewFlag = false;

  beforeEach(async () => {
    previewFlag = false;
    serviceSpy = {
      getPosts: vi.fn().mockReturnValue(
        of({ items: [buildProviderPost(11)], total: 1, page: 1, page_size: 10, total_pages: 1 }),
      ),
      getMyPosts: vi.fn().mockReturnValue(
        of({ items: [buildProviderPost(11)], total: 1, page: 1, page_size: 10, total_pages: 1 }),
      ),
      getSavedPosts: vi.fn().mockReturnValue(
        of({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 }),
      ),
      getComments: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 })),
      createComment: vi.fn().mockReturnValue(
        of({
          id: 90,
          post_id: 11,
          author_id: 50,
          author_name: 'Lanka Spice Farm',
          author_type: 'provider',
          author: {
            id: 50,
            full_name: 'Lanka Spice Farm',
            author_type: 'provider',
            provider_profile_id: 8,
            provider_business_name: 'Lanka Spice Farm',
            provider_district: 'Matale',
            is_verified_provider: true,
            member_since: '',
          },
          body: 'We welcome morning groups!',
          visibility: 'visible',
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderCommunityComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: CommunityService, useValue: serviceSpy },
        {
          provide: ProviderAuthService,
          useValue: {
            currentProviderUser: signal({
              id: 50,
              email: 'spice@test.lk',
              full_name: 'Provider Owner',
              role: 'provider',
              is_active: true,
              business_name: 'Lanka Spice Farm',
              provider_type: 'artisan',
              district: 'Matale',
              approval_status: 'approved',
            }),
            isAuthenticated: vi.fn(() => true),
            getToken: vi.fn(() => 'provider-jwt'),
          },
        },
        {
          provide: ProviderPreviewService,
          useValue: {
            isPreview: () => previewFlag,
            syncFromNavigation: vi.fn(),
            previewUser: { id: 900, business_name: 'Preview Stay' },
            sampleCommunityPosts: [buildProviderPost(9001)],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderCommunityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads feed using provider actor context and opens inline comments drawer', () => {
    expect(serviceSpy.getPosts).toHaveBeenCalledWith(
      { page: 1, page_size: 10, search: null, author_type: null },
      'provider',
    );
    expect(fixture.nativeElement.textContent).toContain('Seasonal Ceylon cinnamon harvest');

    component.switchTab('my-posts');
    expect(serviceSpy.getMyPosts).toHaveBeenCalledWith(1, 10, 'provider');

    component.openCommentsDrawer(component.posts()[0]);
    expect(serviceSpy.getComments).toHaveBeenCalledWith(11, 1, 15, 'provider');

    component.newCommentBody = 'We welcome morning groups!';
    component.submitComment();
    expect(serviceSpy.createComment).toHaveBeenCalledWith(11, 'We welcome morning groups!', 'provider');
  });

  it('uses preview sample data and blocks mutations when Preview Mode is active', () => {
    previewFlag = true;
    component.switchTab('feed');
    component.loadPosts(1);
    fixture.detectChanges();

    expect(component.posts()[0].id).toBe(9001);
    component.openShareModal();
    expect(component.isComposerOpen()).toBe(false);
    expect(component.toast()?.message).toContain('Preview Mode');
  });
});
