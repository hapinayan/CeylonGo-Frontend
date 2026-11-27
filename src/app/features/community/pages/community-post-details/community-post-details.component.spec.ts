import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityService } from '../../services/community.service';
import { CommunityPostDetailsComponent } from './community-post-details.component';

describe('CommunityPostDetailsComponent', () => {
  let component: CommunityPostDetailsComponent;
  let fixture: ComponentFixture<CommunityPostDetailsComponent>;
  let serviceSpy: {
    getPostById: ReturnType<typeof vi.fn>;
    getComments: ReturnType<typeof vi.fn>;
    createComment: ReturnType<typeof vi.fn>;
    updateComment: ReturnType<typeof vi.fn>;
    deleteComment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    serviceSpy = {
      getPostById: vi.fn().mockReturnValue(
        of({
          id: 21,
          author_id: 2,
          author_name: 'Nimali',
          author_type: 'traveler',
          author: {
            id: 2,
            full_name: 'Nimali',
            author_type: 'traveler',
            provider_profile_id: null,
            provider_business_name: null,
            provider_district: null,
            is_verified_provider: false,
            member_since: '',
          },
          body: 'Detailed Mirissa whale watching notes.',
          visibility: 'visible',
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
          likes_count: 2,
          comments_count: 1,
          viewer_has_liked: false,
          viewer_has_saved: false,
          media: [],
        }),
      ),
      getComments: vi.fn().mockReturnValue(
        of({
          items: [
            {
              id: 501,
              post_id: 21,
              author_id: 101,
              author_name: 'Hapinayan',
              author_type: 'traveler',
              author: {
                id: 101,
                full_name: 'Hapinayan',
                author_type: 'traveler',
                provider_profile_id: null,
                provider_business_name: null,
                provider_district: null,
                is_verified_provider: false,
                member_since: '',
              },
              body: 'Best time is 6:30 AM departure!',
              visibility: 'visible',
              created_at: '2026-11-26T01:00:00Z',
              updated_at: '2026-11-26T01:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          page_size: 15,
          total_pages: 1,
        }),
      ),
      createComment: vi.fn().mockReturnValue(
        of({
          id: 502,
          post_id: 21,
          author_id: 101,
          author_name: 'Hapinayan',
          author_type: 'traveler',
          author: {
            id: 101,
            full_name: 'Hapinayan',
            author_type: 'traveler',
            provider_profile_id: null,
            provider_business_name: null,
            provider_district: null,
            is_verified_provider: false,
            member_since: '',
          },
          body: 'Thanks for sharing!',
          visibility: 'visible',
          created_at: '2026-11-26T02:00:00Z',
          updated_at: '2026-11-26T02:00:00Z',
        }),
      ),
      updateComment: vi.fn().mockReturnValue(
        of({
          id: 501,
          post_id: 21,
          author_id: 101,
          author_name: 'Hapinayan',
          author_type: 'traveler',
          author: {
            id: 101,
            full_name: 'Hapinayan',
            author_type: 'traveler',
            provider_profile_id: null,
            provider_business_name: null,
            provider_district: null,
            is_verified_provider: false,
            member_since: '',
          },
          body: 'Updated timing: 6:15 AM.',
          visibility: 'visible',
          created_at: '2026-11-26T01:00:00Z',
          updated_at: '2026-11-26T03:00:00Z',
        }),
      ),
      deleteComment: vi.fn().mockReturnValue(of({ deleted: true, comment_id: 501, visibility: 'deleted' })),
    };

    await TestBed.configureTestingModule({
      imports: [CommunityPostDetailsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '21' })) } },
        { provide: CommunityService, useValue: serviceSpy },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 101, full_name: 'Hapinayan', email: 'h@test.lk', role: 'traveler', is_active: true, created_at: '' }),
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

    fixture = TestBed.createComponent(CommunityPostDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads post details and flat comments and supports creating, editing, and deleting own comments', () => {
    expect(serviceSpy.getPostById).toHaveBeenCalledWith(21, 'traveler');
    expect(serviceSpy.getComments).toHaveBeenCalledWith(21, 1, 15, 'traveler');
    expect(fixture.nativeElement.textContent).toContain('Detailed Mirissa whale watching notes.');
    expect(fixture.nativeElement.textContent).toContain('Best time is 6:30 AM departure!');

    component.newCommentBody = 'Thanks for sharing!';
    component.submitComment();
    expect(serviceSpy.createComment).toHaveBeenCalledWith(21, 'Thanks for sharing!', 'traveler');
    expect(component.comments().length).toBe(2);

    component.startEditComment(component.comments()[0]);
    component.editingCommentBody = 'Updated timing: 6:15 AM.';
    component.saveEditComment(component.comments()[0]);
    expect(serviceSpy.updateComment).toHaveBeenCalledWith(501, 'Updated timing: 6:15 AM.', 'traveler');

    component.requestDeleteComment(component.comments()[0]);
    component.confirmDelete();
    expect(serviceSpy.deleteComment).toHaveBeenCalledWith(501, 'traveler');
  });
});
