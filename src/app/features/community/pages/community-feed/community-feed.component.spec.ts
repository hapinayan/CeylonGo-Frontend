import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityPostDetails } from '../../models/community.models';
import { CommunityService } from '../../services/community.service';
import { CommunityFeedComponent } from './community-feed.component';

function buildFeedItem(id: number, body: string): CommunityPostDetails {
  return {
    id,
    author_id: 2,
    author_name: 'Nimali Silva',
    author_type: 'traveler',
    author: {
      id: 2,
      full_name: 'Nimali Silva',
      author_type: 'traveler',
      provider_profile_id: null,
      provider_business_name: null,
      provider_district: null,
      is_verified_provider: false,
      member_since: '2026-01-01T00:00:00Z',
    },
    body,
    visibility: 'visible',
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
    likes_count: 5,
    comments_count: 1,
    viewer_has_liked: false,
    viewer_has_saved: false,
    media: [],
  };
}

describe('CommunityFeedComponent', () => {
  let component: CommunityFeedComponent;
  let fixture: ComponentFixture<CommunityFeedComponent>;
  let communityServiceSpy: { getPosts: ReturnType<typeof vi.fn> };
  let authModalSpy: {
    open: ReturnType<typeof vi.fn>;
    isOpen: ReturnType<typeof signal<boolean>>;
    currentStep: ReturnType<typeof signal<string>>;
    userEmail: ReturnType<typeof signal<string>>;
    intentMode: ReturnType<typeof signal<'login' | 'register'>>;
    registeredFullName: ReturnType<typeof signal<string>>;
    registrationId: ReturnType<typeof signal<string | null>>;
    resetToken: ReturnType<typeof signal<string | null>>;
    pendingAction: ReturnType<typeof signal<null>>;
  };
  const authState = signal(true);

  beforeEach(async () => {
    authState.set(true);
    communityServiceSpy = {
      getPosts: vi.fn().mockReturnValue(
        of({
          items: [buildFeedItem(21, 'Nine Arch Bridge morning train was unforgettable!')],
          total: 21,
          page: 1,
          page_size: 10,
          total_pages: 3,
        }),
      ),
    };

    authModalSpy = {
      open: vi.fn(),
      isOpen: signal(false),
      currentStep: signal('entry'),
      userEmail: signal(''),
      intentMode: signal('login'),
      registeredFullName: signal(''),
      registrationId: signal(null),
      resetToken: signal(null),
      pendingAction: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [CommunityFeedComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommunityService, useValue: communityServiceSpy },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 2, full_name: 'Nimali Silva', email: 'n@test.lk', role: 'traveler', is_active: true, created_at: '' }),
            isAuthenticated: vi.fn(() => authState()),
            getToken: vi.fn(() => (authState() ? 'jwt' : null)),
          },
        },
        { provide: AuthModalService, useValue: authModalSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads community feed on init and displays real total post count', () => {
    expect(communityServiceSpy.getPosts).toHaveBeenCalledWith(
      { page: 1, page_size: 10, search: null, author_type: null },
      'traveler',
    );
    expect(fixture.nativeElement.textContent).toContain('21 Posts');
    expect(fixture.nativeElement.textContent).toContain('Nine Arch Bridge morning train');
  });

  it('applies author filter and keyword search to backend feed queries', () => {
    component.setFilter('provider');
    expect(communityServiceSpy.getPosts).toHaveBeenCalledWith(
      { page: 1, page_size: 10, search: null, author_type: 'provider' },
      'traveler',
    );

    component.searchQuery = 'Ella';
    component.applySearch();
    expect(communityServiceSpy.getPosts).toHaveBeenCalledWith(
      { page: 1, page_size: 10, search: 'Ella', author_type: 'provider' },
      'traveler',
    );
  });

  it('shows retry error state on failure and prompts login modal for guest Create Post', () => {
    communityServiceSpy.getPosts.mockReturnValueOnce(throwError(() => new Error('Offline')));
    component.loadPosts(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load community feed');
    expect(fixture.nativeElement.textContent).toContain('Try Again');

    authState.set(false);
    component.openCreatePostModal();
    expect(authModalSpy.open).toHaveBeenCalledWith(
      'login',
      undefined,
      expect.objectContaining({ type: 'community' }),
    );
  });
});
