import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityPostDetails } from '../../models/community.models';
import { CommunityService } from '../../services/community.service';
import { CreatePostModalComponent } from './create-post-modal.component';

function makePost(id: number, body: string): CommunityPostDetails {
  return {
    id,
    author_id: 10,
    author_name: 'Traveler One',
    author_type: 'traveler',
    author: {
      id: 10,
      full_name: 'Traveler One',
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
    likes_count: 0,
    comments_count: 0,
    viewer_has_liked: false,
    viewer_has_saved: false,
    media: [],
  };
}

describe('CreatePostModalComponent', () => {
  let component: CreatePostModalComponent;
  let fixture: ComponentFixture<CreatePostModalComponent>;
  let serviceSpy: {
    createPost: ReturnType<typeof vi.fn>;
    updatePost: ReturnType<typeof vi.fn>;
    uploadPostPhoto: ReturnType<typeof vi.fn>;
    deletePostPhoto: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-preview');
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }

    serviceSpy = {
      createPost: vi.fn(),
      updatePost: vi.fn(),
      uploadPostPhoto: vi.fn(),
      deletePostPhoto: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CreatePostModalComponent],
      providers: [{ provide: CommunityService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePostModalComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('validates photo file limits and removes staged photos', () => {
    const valid = new File(['img'], 'kandy.jpg', { type: 'image/jpeg' });
    const invalid = new File(['bad'], 'note.txt', { type: 'text/plain' });

    component.onFilesSelected({ target: { files: [valid, invalid], value: 'x' } } as unknown as Event);
    expect(component.stagedPhotos().length).toBe(1);
    expect(component.errorMessage()).toContain('JPEG, PNG, and WebP');

    const id = component.stagedPhotos()[0].id;
    component.removeStagedPhoto(id);
    expect(component.stagedPhotos().length).toBe(0);
  });

  it('recovers from partial photo upload failure and retries without creating a duplicate post', async () => {
    const post = makePost(88, 'Sigiriya sunrise');
    serviceSpy.createPost.mockReturnValue(of(post));
    serviceSpy.updatePost.mockReturnValue(of(post));
    serviceSpy.uploadPostPhoto
      .mockReturnValueOnce(of({ id: 1, post_id: 88, media_type: 'image', image_url: '/1.jpg', alt_text: null, display_order: 0, created_at: '' }))
      .mockReturnValueOnce(throwError(() => new Error('503 upload failure')))
      .mockReturnValueOnce(of({ id: 2, post_id: 88, media_type: 'image', image_url: '/2.jpg', alt_text: null, display_order: 1, created_at: '' }));

    component.bodyText = 'Sigiriya sunrise';
    const file1 = new File(['1'], 'one.jpg', { type: 'image/jpeg' });
    const file2 = new File(['2'], 'two.jpg', { type: 'image/jpeg' });
    component.onFilesSelected({ target: { files: [file1, file2], value: '' } } as unknown as Event);

    await component.submit();
    expect(serviceSpy.createPost).toHaveBeenCalledTimes(1);
    expect(component.stagedPhotos().length).toBe(1);
    expect(component.errorMessage()).toContain('retry');

    const publishedPosts: CommunityPostDetails[] = [];
    component.published.subscribe((p) => publishedPosts.push(p));

    await component.submit();
    // Second submit does NOT call createPost again!
    expect(serviceSpy.createPost).toHaveBeenCalledTimes(1);
    expect(serviceSpy.uploadPostPhoto).toHaveBeenCalledTimes(3);
    expect(publishedPosts.length).toBe(1);
    expect(publishedPosts[0].media.length).toBe(2);
  });
});
