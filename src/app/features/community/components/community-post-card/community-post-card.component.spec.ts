import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityPostDetails } from '../../models/community.models';
import { CommunityService } from '../../services/community.service';
import { CommunityPostCardComponent } from './community-post-card.component';

function buildSamplePost(overrides: Partial<CommunityPostDetails> = {}): CommunityPostDetails {
  return {
    id: 15,
    author_id: 201,
    author_name: 'Kasun Jayawardena',
    author_type: 'provider',
    author: {
      id: 201,
      full_name: 'Kasun Jayawardena',
      author_type: 'provider',
      provider_profile_id: 12,
      provider_business_name: 'Galle Fort Heritage Crafts',
      provider_district: 'Galle',
      is_verified_provider: true,
      member_since: '2026-01-10T00:00:00Z',
    },
    body: 'Hand-carved wooden masks showcased every weekend inside Galle Fort.',
    visibility: 'visible',
    created_at: '2026-11-26T08:00:00Z',
    updated_at: '2026-11-26T08:00:00Z',
    likes_count: 4,
    comments_count: 2,
    viewer_has_liked: false,
    viewer_has_saved: false,
    media: [],
    ...overrides,
  };
}

describe('CommunityPostCardComponent', () => {
  let component: CommunityPostCardComponent;
  let fixture: ComponentFixture<CommunityPostCardComponent>;
  let serviceSpy: {
    likePost: ReturnType<typeof vi.fn>;
    unlikePost: ReturnType<typeof vi.fn>;
    savePost: ReturnType<typeof vi.fn>;
    unsavePost: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    serviceSpy = {
      likePost: vi.fn(),
      unlikePost: vi.fn(),
      savePost: vi.fn(),
      unsavePost: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CommunityPostCardComponent],
      providers: [provideRouter([]), { provide: CommunityService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityPostCardComponent);
    component = fixture.componentInstance;
    component.post = buildSamplePost();
    component.isAuthenticated = true;
    component.currentUserId = 999;
    fixture.detectChanges();
  });

  it('renders author name, verified provider badge, business name, and counts', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Kasun Jayawardena');
    expect(text).toContain('Verified Service Provider');
    expect(text).toContain('Galle Fort Heritage Crafts');
    expect(text).toContain('4 Likes');
    expect(text).toContain('2 Comments');
  });

  it('shows Report in 3-dot menu for non-owner and Edit/Delete for owner', () => {
    component.toggleMenu(new Event('click'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report Post');
    expect(fixture.nativeElement.textContent).not.toContain('Delete Post');

    const ownerFixture = TestBed.createComponent(CommunityPostCardComponent);
    const ownerComp = ownerFixture.componentInstance;
    ownerComp.post = buildSamplePost();
    ownerComp.isAuthenticated = true;
    ownerComp.currentUserId = 201;
    ownerComp.toggleMenu(new Event('click'));
    ownerFixture.detectChanges();
    expect(ownerFixture.nativeElement.textContent).toContain('Edit Post');
    expect(ownerFixture.nativeElement.textContent).toContain('Delete Post');
  });

  it('optimistically likes a post and rolls back on backend failure', () => {
    serviceSpy.likePost.mockReturnValue(throwError(() => new Error('Network error')));
    const emitted: CommunityPostDetails[] = [];
    component.postChanged.subscribe((p) => emitted.push(p));

    component.onToggleLike();
    expect(serviceSpy.likePost).toHaveBeenCalledWith(15, 'traveler');
    // Rolled back to original state after failure
    expect(emitted[emitted.length - 1].viewer_has_liked).toBe(false);
    expect(emitted[emitted.length - 1].likes_count).toBe(4);
  });

  it('toggles saved state via backend and prompts auth for guests', () => {
    serviceSpy.savePost.mockReturnValue(of({ post_id: 15, saved: true }));
    component.onToggleSave();
    expect(serviceSpy.savePost).toHaveBeenCalledWith(15, 'traveler');
    expect(component.post.viewer_has_saved).toBe(true);

    component.isAuthenticated = false;
    const authPrompts: string[] = [];
    component.authRequired.subscribe((msg) => authPrompts.push(msg));
    component.onToggleLike();
    expect(authPrompts[0]).toContain('like');
  });
});
