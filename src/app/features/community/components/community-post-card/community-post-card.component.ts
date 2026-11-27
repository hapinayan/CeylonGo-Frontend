import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommunityActorContext, CommunityPostDetails } from '../../models/community.models';
import { CommunityService, formatCommunityError } from '../../services/community.service';

@Component({
  selector: 'app-community-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './community-post-card.component.html',
  styleUrl: './community-post-card.component.scss',
})
export class CommunityPostCardComponent {
  private readonly communityService = inject(CommunityService);

  @Input({ required: true }) post!: CommunityPostDetails;
  @Input() actorMode: CommunityActorContext = 'traveler';
  @Input() currentUserId: number | null = null;
  @Input() isAuthenticated = false;
  @Input() isPreview = false;
  @Input() inlineCommentsOnly = false;

  @Output() postChanged = new EventEmitter<CommunityPostDetails>();
  @Output() editRequested = new EventEmitter<CommunityPostDetails>();
  @Output() deleteRequested = new EventEmitter<CommunityPostDetails>();
  @Output() reportRequested = new EventEmitter<CommunityPostDetails>();
  @Output() commentClicked = new EventEmitter<CommunityPostDetails>();
  @Output() photoClicked = new EventEmitter<{ post: CommunityPostDetails; index: number }>();
  @Output() authRequired = new EventEmitter<string>();
  @Output() actionFeedback = new EventEmitter<{ kind: 'error' | 'info'; message: string }>();

  readonly isMenuOpen = signal(false);
  readonly isLikeBusy = signal(false);
  readonly isSaveBusy = signal(false);

  get isOwner(): boolean {
    return this.currentUserId != null && this.post?.author_id === this.currentUserId;
  }

  get authorInitials(): string {
    const name = (this.post?.author?.provider_business_name || this.post?.author_name || 'CG').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'CG';
  }

  get authorLabel(): string {
    if (this.post?.author_type === 'provider') {
      return this.post.author?.is_verified_provider ? 'Verified Service Provider' : 'Service Provider';
    }
    if (this.post?.author_type === 'admin') return 'CeylonGo Team';
    return 'Traveler';
  }

  get wasEdited(): boolean {
    if (!this.post?.created_at || !this.post?.updated_at) return false;
    const created = Date.parse(this.post.created_at);
    const updated = Date.parse(this.post.updated_at);
    return Number.isFinite(created) && Number.isFinite(updated) && Math.abs(updated - created) > 2000;
  }

  readonly mediaGridClass = computed(() => {
    const count = this.post?.media?.length ?? 0;
    if (count === 1) return 'media-grid-1';
    if (count === 2) return 'media-grid-2';
    if (count === 3) return 'media-grid-3';
    return 'media-grid-multi';
  });

  @HostListener('document:click')
  closeMenu(): void {
    if (this.isMenuOpen()) {
      this.isMenuOpen.set(false);
    }
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.update((open) => !open);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    if (this.isPreview) {
      this.actionFeedback.emit({ kind: 'info', message: 'Editing posts is disabled in Preview Mode.' });
      return;
    }
    this.editRequested.emit(this.post);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    if (this.isPreview) {
      this.actionFeedback.emit({ kind: 'info', message: 'Deleting posts is disabled in Preview Mode.' });
      return;
    }
    this.deleteRequested.emit(this.post);
  }

  onReport(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    if (this.isPreview) {
      this.actionFeedback.emit({ kind: 'info', message: 'Reporting posts is disabled in Preview Mode.' });
      return;
    }
    if (!this.isAuthenticated) {
      this.authRequired.emit('report');
      return;
    }
    if (this.isOwner) {
      this.actionFeedback.emit({ kind: 'info', message: 'You cannot report your own post.' });
      return;
    }
    this.reportRequested.emit(this.post);
  }

  onToggleLike(): void {
    if (this.isPreview) {
      this.actionFeedback.emit({ kind: 'info', message: 'Likes are disabled in Preview Mode.' });
      return;
    }
    if (!this.isAuthenticated) {
      this.authRequired.emit('like');
      return;
    }
    if (this.isLikeBusy()) return;

    const prevLiked = this.post.viewer_has_liked;
    const prevCount = this.post.likes_count;
    const nextLiked = !prevLiked;
    const optimistic: CommunityPostDetails = {
      ...this.post,
      viewer_has_liked: nextLiked,
      likes_count: Math.max(0, prevCount + (nextLiked ? 1 : -1)),
    };
    this.post = optimistic;
    this.postChanged.emit(optimistic);
    this.isLikeBusy.set(true);

    const request$ = nextLiked
      ? this.communityService.likePost(this.post.id, this.actorMode)
      : this.communityService.unlikePost(this.post.id, this.actorMode);

    request$.subscribe({
      next: (res) => {
        const settled: CommunityPostDetails = {
          ...this.post,
          viewer_has_liked: res.liked,
          likes_count: res.likes_count,
        };
        this.post = settled;
        this.postChanged.emit(settled);
        this.isLikeBusy.set(false);
      },
      error: (err) => {
        const rolledBack: CommunityPostDetails = {
          ...this.post,
          viewer_has_liked: prevLiked,
          likes_count: prevCount,
        };
        this.post = rolledBack;
        this.postChanged.emit(rolledBack);
        this.isLikeBusy.set(false);
        this.actionFeedback.emit({ kind: 'error', message: formatCommunityError(err, 'Could not update like.') });
      },
    });
  }

  onToggleSave(): void {
    if (this.isPreview) {
      this.actionFeedback.emit({ kind: 'info', message: 'Saving posts is disabled in Preview Mode.' });
      return;
    }
    if (!this.isAuthenticated) {
      this.authRequired.emit('save');
      return;
    }
    if (this.isSaveBusy()) return;

    const prevSaved = this.post.viewer_has_saved;
    const nextSaved = !prevSaved;
    const optimistic: CommunityPostDetails = { ...this.post, viewer_has_saved: nextSaved };
    this.post = optimistic;
    this.postChanged.emit(optimistic);
    this.isSaveBusy.set(true);

    const request$ = nextSaved
      ? this.communityService.savePost(this.post.id, this.actorMode)
      : this.communityService.unsavePost(this.post.id, this.actorMode);

    request$.subscribe({
      next: (res) => {
        const settled: CommunityPostDetails = { ...this.post, viewer_has_saved: res.saved };
        this.post = settled;
        this.postChanged.emit(settled);
        this.isSaveBusy.set(false);
      },
      error: (err) => {
        const rolledBack: CommunityPostDetails = { ...this.post, viewer_has_saved: prevSaved };
        this.post = rolledBack;
        this.postChanged.emit(rolledBack);
        this.isSaveBusy.set(false);
        this.actionFeedback.emit({ kind: 'error', message: formatCommunityError(err, 'Could not update saved post.') });
      },
    });
  }

  openPhoto(index: number): void {
    this.photoClicked.emit({ post: this.post, index });
  }

  onCommentClick(): void {
    this.commentClicked.emit(this.post);
  }
}
