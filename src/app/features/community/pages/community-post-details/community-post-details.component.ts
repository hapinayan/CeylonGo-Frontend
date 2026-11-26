import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommunityExploreSidebarComponent } from '../../components/community-explore-sidebar/community-explore-sidebar.component';
import { CommunityPostCardComponent } from '../../components/community-post-card/community-post-card.component';
import { ConfirmDeleteModalComponent } from '../../components/confirm-delete-modal/confirm-delete-modal.component';
import { CreatePostModalComponent } from '../../components/create-post-modal/create-post-modal.component';
import { PhotoLightboxModalComponent } from '../../components/photo-lightbox-modal/photo-lightbox-modal.component';
import {
  ReportContentModalComponent,
  ReportTarget,
} from '../../components/report-content-modal/report-content-modal.component';
import {
  CommunityCommentDetails,
  CommunityPostDetails,
  CommunityPostMediaItem,
} from '../../models/community.models';
import { CommunityService, formatCommunityError } from '../../services/community.service';

@Component({
  selector: 'app-community-post-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CommunityExploreSidebarComponent,
    CommunityPostCardComponent,
    CreatePostModalComponent,
    ConfirmDeleteModalComponent,
    ReportContentModalComponent,
    PhotoLightboxModalComponent,
  ],
  templateUrl: './community-post-details.component.html',
  styleUrl: './community-post-details.component.scss',
})
export class CommunityPostDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly communityService = inject(CommunityService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly post = signal<CommunityPostDetails | null>(null);
  readonly isLoadingPost = signal(true);
  readonly postError = signal<string | null>(null);

  readonly comments = signal<CommunityCommentDetails[]>([]);
  readonly totalComments = signal(0);
  readonly commentsPage = signal(1);
  readonly commentsTotalPages = signal(1);
  readonly commentsPageSize = 15;
  readonly isLoadingComments = signal(false);
  readonly commentsError = signal<string | null>(null);

  newCommentBody = '';
  readonly isSubmittingComment = signal(false);
  readonly commentFormError = signal<string | null>(null);

  // Inline comment edit
  readonly editingCommentId = signal<number | null>(null);
  editingCommentBody = '';
  readonly isSavingCommentEdit = signal(false);

  // Modals
  readonly isEditPostOpen = signal(false);
  readonly deleteModalTarget = signal<{ type: 'post' | 'comment'; id: number } | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly reportTarget = signal<ReportTarget | null>(null);

  readonly lightboxPhotos = signal<CommunityPostMediaItem[]>([]);
  readonly lightboxIndex = signal(0);
  readonly isLightboxOpen = signal(false);

  readonly toast = signal<{ kind: 'info' | 'error'; message: string } | null>(null);
  private postId = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id <= 0) {
        this.isLoadingPost.set(false);
        this.postError.set('The requested community post could not be found.');
        return;
      }
      this.postId = id;
      this.loadPostAndComments();
    });
  }

  loadPostAndComments(): void {
    this.isLoadingPost.set(true);
    this.postError.set(null);

    this.communityService.getPostById(this.postId, 'traveler').subscribe({
      next: (post) => {
        this.post.set(post);
        this.isLoadingPost.set(false);
        this.loadComments(1);
      },
      error: (err) => {
        this.isLoadingPost.set(false);
        this.postError.set(formatCommunityError(err, 'Unable to load this community post.'));
      },
    });
  }

  loadComments(page = 1): void {
    this.isLoadingComments.set(true);
    this.commentsError.set(null);

    this.communityService
      .getComments(this.postId, page, this.commentsPageSize, 'traveler')
      .subscribe({
        next: (res) => {
          this.comments.set(res.items);
          this.totalComments.set(res.total);
          this.commentsPage.set(res.page);
          this.commentsTotalPages.set(Math.max(1, res.total_pages));
          this.isLoadingComments.set(false);
        },
        error: (err) => {
          this.isLoadingComments.set(false);
          this.commentsError.set(formatCommunityError(err, 'Failed to load comments.'));
        },
      });
  }

  submitComment(): void {
    if (this.isSubmittingComment()) return;
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => this.submitComment());
      return;
    }

    const body = this.newCommentBody.trim();
    if (!body) {
      this.commentFormError.set('Please write a comment before posting.');
      return;
    }
    if (body.length > 1500) {
      this.commentFormError.set('Comments cannot exceed 1500 characters.');
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentFormError.set(null);

    this.communityService.createComment(this.postId, body, 'traveler').subscribe({
      next: (created) => {
        this.isSubmittingComment.set(false);
        this.newCommentBody = '';
        this.post.update((p) => (p ? { ...p, comments_count: p.comments_count + 1 } : p));
        this.totalComments.update((t) => t + 1);
        if (this.commentsPage() === 1) {
          this.comments.update((items) => [...items, created]);
        } else {
          this.loadComments(this.commentsTotalPages());
        }
      },
      error: (err) => {
        this.isSubmittingComment.set(false);
        this.commentFormError.set(formatCommunityError(err, 'Could not post your comment.'));
      },
    });
  }

  startEditComment(comment: CommunityCommentDetails): void {
    this.editingCommentId.set(comment.id);
    this.editingCommentBody = comment.body;
  }

  cancelEditComment(): void {
    this.editingCommentId.set(null);
    this.editingCommentBody = '';
  }

  saveEditComment(comment: CommunityCommentDetails): void {
    if (this.isSavingCommentEdit()) return;
    const trimmed = this.editingCommentBody.trim();
    if (!trimmed) {
      this.showToast('error', 'Comment text cannot be empty.');
      return;
    }

    this.isSavingCommentEdit.set(true);
    this.communityService.updateComment(comment.id, trimmed, 'traveler').subscribe({
      next: (updated) => {
        this.isSavingCommentEdit.set(false);
        this.editingCommentId.set(null);
        this.comments.update((items) => items.map((c) => (c.id === updated.id ? updated : c)));
        this.showToast('info', 'Comment updated.');
      },
      error: (err) => {
        this.isSavingCommentEdit.set(false);
        this.showToast('error', formatCommunityError(err, 'Could not update comment.'));
      },
    });
  }

  requestDeletePost(post: CommunityPostDetails): void {
    this.deleteError.set(null);
    this.deleteModalTarget.set({ type: 'post', id: post.id });
  }

  requestDeleteComment(comment: CommunityCommentDetails): void {
    this.deleteError.set(null);
    this.deleteModalTarget.set({ type: 'comment', id: comment.id });
  }

  confirmDelete(): void {
    const target = this.deleteModalTarget();
    if (!target || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    if (target.type === 'post') {
      this.communityService.deletePost(target.id, 'traveler').subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deleteModalTarget.set(null);
          this.router.navigate(['/community']);
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.deleteError.set(formatCommunityError(err, 'Failed to delete post.'));
        },
      });
      return;
    }

    this.communityService.deleteComment(target.id, 'traveler').subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleteModalTarget.set(null);
        this.comments.update((items) => items.filter((c) => c.id !== target.id));
        this.totalComments.update((t) => Math.max(0, t - 1));
        this.post.update((p) => (p ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
        this.showToast('info', 'Comment deleted.');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.deleteError.set(formatCommunityError(err, 'Failed to delete comment.'));
      },
    });
  }

  reportPost(post: CommunityPostDetails): void {
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => this.reportPost(post));
      return;
    }
    this.reportTarget.set({
      entityType: 'post',
      entityId: post.id,
      previewText: post.body.slice(0, 140),
    });
  }

  reportComment(comment: CommunityCommentDetails): void {
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => this.reportComment(comment));
      return;
    }
    this.reportTarget.set({
      entityType: 'comment',
      entityId: comment.id,
      previewText: comment.body.slice(0, 140),
    });
  }

  focusCommentComposer(): void {
    if (typeof document !== 'undefined') {
      document.getElementById('commentBodyInput')?.focus();
    }
  }

  onOpenLightbox(payload: { post: CommunityPostDetails; index: number }): void {
    this.lightboxPhotos.set(payload.post.media ?? []);
    this.lightboxIndex.set(payload.index);
    this.isLightboxOpen.set(true);
  }

  onAuthRequired(actionLabel: string): void {
    this.showToast('info', `Sign in to ${actionLabel}.`);
    this.promptSignIn();
  }

  isCommentOwner(comment: CommunityCommentDetails): boolean {
    return this.currentUser()?.id != null && comment.author_id === this.currentUser()?.id;
  }

  wasCommentEdited(comment: CommunityCommentDetails): boolean {
    const created = Date.parse(comment.created_at);
    const updated = Date.parse(comment.updated_at);
    return Number.isFinite(created) && Number.isFinite(updated) && Math.abs(updated - created) > 2000;
  }

  commentAuthorLabel(comment: CommunityCommentDetails): string {
    if (comment.author_type === 'provider') {
      return comment.author?.is_verified_provider ? 'Verified Service Provider' : 'Service Provider';
    }
    return comment.author_type === 'admin' ? 'CeylonGo Team' : 'Traveler';
  }

  showToast(kind: 'info' | 'error', message: string): void {
    this.toast.set({ kind, message });
    setTimeout(() => this.toast.set(null), 4000);
  }

  private promptSignIn(resumeCallback?: () => void): void {
    this.authModalService.open('login', undefined, {
      type: 'community',
      resumeCallback: () => {
        this.loadPostAndComments();
        resumeCallback?.();
      },
    });
  }
}
