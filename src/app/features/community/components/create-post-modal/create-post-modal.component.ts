import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  CommunityActorContext,
  CommunityPostDetails,
  CommunityPostMediaItem,
} from '../../models/community.models';
import {
  COMMUNITY_MAX_PHOTOS_PER_POST,
  CommunityService,
  formatCommunityError,
  validateCommunityPhotoFile,
} from '../../services/community.service';

export interface StagedPostPhoto {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
}

@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-post-modal.component.html',
  styleUrl: './create-post-modal.component.scss',
})
export class CreatePostModalComponent implements OnChanges, OnDestroy {
  private readonly communityService = inject(CommunityService);

  readonly maxPhotos = COMMUNITY_MAX_PHOTOS_PER_POST;
  readonly maxBodyLength = 2000;

  @Input() isOpen = false;
  @Input() initialPost: CommunityPostDetails | null = null;
  @Input() actorMode: CommunityActorContext = 'traveler';
  @Input() authorName = 'CeylonGo Member';
  @Input() authorSubtitle = 'Traveler';
  @Input() isPreview = false;

  @Output() closed = new EventEmitter<void>();
  @Output() published = new EventEmitter<CommunityPostDetails>();

  bodyText = '';

  readonly existingPhotos = signal<CommunityPostMediaItem[]>([]);
  readonly removedMediaIds = signal<number[]>([]);
  readonly stagedPhotos = signal<StagedPostPhoto[]>([]);

  readonly isSubmitting = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Preserves a post created during an earlier submit attempt when one or more
   * photo uploads failed so a retry attaches remaining photos without duplicating the post.
   */
  private partialCreatedPost: CommunityPostDetails | null = null;
  private stagedCounter = 0;

  get isEditMode(): boolean {
    return this.initialPost !== null || this.partialCreatedPost !== null;
  }

  get hasPartialCreatedPost(): boolean {
    return this.partialCreatedPost !== null;
  }

  get modalTitle(): string {
    if (this.initialPost) return 'Edit Post';
    if (this.partialCreatedPost) return 'Complete Photo Upload';
    return this.actorMode === 'provider' ? 'Share Promotional Post' : 'Create Post';
  }

  get totalSelectedPhotos(): number {
    return this.existingPhotos().length + this.stagedPhotos().length;
  }

  get remainingSlots(): number {
    return Math.max(0, this.maxPhotos - this.totalSelectedPhotos);
  }

  get trimmedBodyLength(): number {
    return this.bodyText.trim().length;
  }

  get authorInitials(): string {
    const clean = (this.authorName || 'CG').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'CG';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['initialPost']) {
      if (this.isOpen) {
        this.resetFormFromInitialPost();
      } else {
        this.revokeAllStagedPreviews();
      }
    }
  }

  ngOnDestroy(): void {
    this.revokeAllStagedPreviews();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (input) {
      input.value = '';
    }
    if (!files.length) return;

    this.errorMessage.set(null);
    const errors: string[] = [];
    const added: StagedPostPhoto[] = [];
    let currentCount = this.totalSelectedPhotos;

    for (const file of files) {
      const validationError = validateCommunityPhotoFile(file, currentCount);
      if (validationError) {
        if (!errors.includes(validationError)) {
          errors.push(validationError);
        }
        continue;
      }
      this.stagedCounter += 1;
      added.push({
        id: `staged-${this.stagedCounter}`,
        file,
        previewUrl: URL.createObjectURL(file),
        altText: '',
      });
      currentCount += 1;
    }

    if (added.length > 0) {
      this.stagedPhotos.update((prev) => [...prev, ...added]);
    }
    if (errors.length > 0) {
      this.errorMessage.set(errors.join(' '));
    }
  }

  removeStagedPhoto(photoId: string): void {
    if (this.isSubmitting()) return;
    const target = this.stagedPhotos().find((item) => item.id === photoId);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.stagedPhotos.update((prev) => prev.filter((item) => item.id !== photoId));
    this.errorMessage.set(null);
  }

  removeExistingPhoto(mediaId: number): void {
    if (this.isSubmitting()) return;
    this.existingPhotos.update((prev) => prev.filter((item) => item.id !== mediaId));
    this.removedMediaIds.update((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
    this.errorMessage.set(null);
  }

  async submit(): Promise<void> {
    if (this.isSubmitting()) return;

    if (this.isPreview) {
      this.errorMessage.set('Publishing community posts is disabled in Preview Mode.');
      return;
    }

    const body = this.bodyText.trim();
    if (!body) {
      this.errorMessage.set('Please write something to share with the community.');
      return;
    }
    if (body.length > this.maxBodyLength) {
      this.errorMessage.set(`Post text cannot exceed ${this.maxBodyLength} characters.`);
      return;
    }
    if (this.totalSelectedPhotos > this.maxPhotos) {
      this.errorMessage.set(`You can attach up to ${this.maxPhotos} photographs per post.`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      let postRecord: CommunityPostDetails;

      if (this.initialPost) {
        this.statusMessage.set('Saving post changes...');
        postRecord = await firstValueFrom(
          this.communityService.updatePost(this.initialPost.id, body, this.actorMode),
        );
      } else if (this.partialCreatedPost) {
        this.statusMessage.set('Updating saved post...');
        postRecord =
          this.partialCreatedPost.body.trim() !== body
            ? await firstValueFrom(
                this.communityService.updatePost(this.partialCreatedPost.id, body, this.actorMode),
              )
            : this.partialCreatedPost;
      } else {
        this.statusMessage.set('Creating post...');
        postRecord = await firstValueFrom(this.communityService.createPost(body, this.actorMode));
        this.partialCreatedPost = postRecord;
      }

      const toDelete = [...this.removedMediaIds()];
      if (toDelete.length > 0) {
        this.statusMessage.set(`Removing ${toDelete.length} photo(s)...`);
        for (const mediaId of toDelete) {
          await firstValueFrom(
            this.communityService.deletePostPhoto(postRecord.id, mediaId, this.actorMode),
          );
          this.removedMediaIds.update((prev) => prev.filter((id) => id !== mediaId));
        }
      }

      const pendingUploads = [...this.stagedPhotos()];
      const uploadedMedia: CommunityPostMediaItem[] = [...this.existingPhotos()];

      for (let idx = 0; idx < pendingUploads.length; idx += 1) {
        const staged = pendingUploads[idx];
        this.statusMessage.set(`Uploading photo ${idx + 1} of ${pendingUploads.length}...`);
        const mediaItem = await firstValueFrom(
          this.communityService.uploadPostPhoto(
            postRecord.id,
            staged.file,
            staged.altText.trim() || null,
            this.actorMode,
          ),
        );
        uploadedMedia.push(mediaItem);
        URL.revokeObjectURL(staged.previewUrl);
        this.existingPhotos.set([...uploadedMedia]);
        this.stagedPhotos.update((prev) => prev.filter((item) => item.id !== staged.id));
      }

      const finalPost: CommunityPostDetails = {
        ...postRecord,
        media: uploadedMedia,
      };

      if (this.partialCreatedPost) {
        this.partialCreatedPost = finalPost;
      }

      this.isSubmitting.set(false);
      this.statusMessage.set(null);
      this.partialCreatedPost = null;
      this.published.emit(finalPost);
    } catch (err) {
      this.isSubmitting.set(false);
      this.statusMessage.set(null);
      if (this.partialCreatedPost && this.stagedPhotos().length > 0) {
        this.partialCreatedPost = {
          ...this.partialCreatedPost,
          body,
          media: [...this.existingPhotos()],
        };
        this.errorMessage.set(
          `${formatCommunityError(err, 'Photo upload failed.')} Your post was saved — retry to upload the remaining ${this.stagedPhotos().length} photo(s), or remove them to publish now.`,
        );
      } else {
        this.errorMessage.set(formatCommunityError(err, 'Unable to publish your post right now.'));
      }
    }
  }

  onClose(): void {
    if (this.isSubmitting()) return;
    if (this.partialCreatedPost) {
      // Emit the partially created post so the feed shows what is already stored on the backend.
      const savedSoFar: CommunityPostDetails = {
        ...this.partialCreatedPost,
        media: [...this.existingPhotos()],
      };
      this.partialCreatedPost = null;
      this.revokeAllStagedPreviews();
      this.published.emit(savedSoFar);
      return;
    }
    this.revokeAllStagedPreviews();
    this.closed.emit();
  }

  private resetFormFromInitialPost(): void {
    this.revokeAllStagedPreviews();
    this.partialCreatedPost = null;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.removedMediaIds.set([]);
    if (this.initialPost) {
      this.bodyText = this.initialPost.body ?? '';
      this.existingPhotos.set([...(this.initialPost.media ?? [])]);
    } else {
      this.bodyText = '';
      this.existingPhotos.set([]);
    }
  }

  private revokeAllStagedPreviews(): void {
    for (const photo of this.stagedPhotos()) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    this.stagedPhotos.set([]);
  }
}
