import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityPostDetails } from '../../models/community.models';
import { CommunityService } from '../../services/community.service';
import { CommunityMyPostsComponent } from './community-my-posts.component';
import { CommunitySavedComponent } from '../community-saved/community-saved.component';

function buildPost(id: number, saved: boolean): CommunityPostDetails {
  return {
    id,
    author_id: 101,
    author_name: 'Traveler User',
    author_type: 'traveler',
    author: {
      id: 101,
      full_name: 'Traveler User',
      author_type: 'traveler',
      provider_profile_id: null,
      provider_business_name: null,
      provider_district: null,
      is_verified_provider: false,
      member_since: '',
    },
    body: `Community post #${id}`,
    visibility: 'visible',
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
    likes_count: 1,
    comments_count: 0,
    viewer_has_liked: false,
    viewer_has_saved: saved,
    media: [],
  };
}

describe('CommunityMyPostsComponent and CommunitySavedComponent', () => {
  let serviceSpy: {
    getMyPosts: ReturnType<typeof vi.fn>;
    getSavedPosts: ReturnType<typeof vi.fn>;
    deletePost: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    serviceSpy = {
      getMyPosts: vi.fn().mockReturnValue(of({ items: [buildPost(1, false)], total: 1, page: 1, page_size: 10, total_pages: 1 })),
      getSavedPosts: vi.fn().mockReturnValue(of({ items: [buildPost(2, true)], total: 1, page: 1, page_size: 10, total_pages: 1 })),
      deletePost: vi.fn().mockReturnValue(of({ deleted: true, post_id: 1, visibility: 'deleted' })),
    };

    await TestBed.configureTestingModule({
      imports: [CommunityMyPostsComponent, CommunitySavedComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommunityService, useValue: serviceSpy },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 101, full_name: 'Traveler User', email: 't@test.lk', role: 'traveler', is_active: true, created_at: '' }),
            isAuthenticated: vi.fn(() => true),
            getToken: vi.fn(() => 'jwt'),
          },
        },
        {
          provide: AuthModalService,
          useValue: {
            open: vi.fn(),
            isOpen: signal(false),
            currentStep: signal('entry'),
            userEmail: signal(''),
            intentMode: signal('login'),
            registeredFullName: signal(''),
            registrationId: signal(null),
            resetToken: signal(null),
            pendingAction: signal(null),
          },
        },
      ],
    }).compileComponents();
  });

  it('loads My Posts from backend and removes post on confirmed delete', () => {
    const fixture: ComponentFixture<CommunityMyPostsComponent> = TestBed.createComponent(CommunityMyPostsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(serviceSpy.getMyPosts).toHaveBeenCalledWith(1, 10, 'traveler');
    expect(component.posts().length).toBe(1);

    component.postToDelete.set(component.posts()[0]);
    component.confirmDelete();
    expect(serviceSpy.deletePost).toHaveBeenCalledWith(1, 'traveler');
    expect(component.posts().length).toBe(0);
  });

  it('loads Saved Posts from backend and removes unsaved post immediately', () => {
    const fixture: ComponentFixture<CommunitySavedComponent> = TestBed.createComponent(CommunitySavedComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(serviceSpy.getSavedPosts).toHaveBeenCalledWith(1, 10, 'traveler');
    expect(component.posts().length).toBe(1);

    component.onPostChanged(buildPost(2, false));
    expect(component.posts().length).toBe(0);
    expect(component.totalPosts()).toBe(0);
  });
});
