import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { CommunityPostCardComponent } from '../../features/community/components/community-post-card/community-post-card.component';
import { ConfirmDeleteModalComponent } from '../../features/community/components/confirm-delete-modal/confirm-delete-modal.component';
import { CreatePostModalComponent } from '../../features/community/components/create-post-modal/create-post-modal.component';
import { PhotoLightboxModalComponent } from '../../features/community/components/photo-lightbox-modal/photo-lightbox-modal.component';
import {
  ReportContentModalComponent,
  ReportTarget,
} from '../../features/community/components/report-content-modal/report-content-modal.component';
import {
  CommunityCommentDetails,
  CommunityPostDetails,
  CommunityPostMediaItem,
} from '../../features/community/models/community.models';
import {
  CommunityService,
  formatCommunityError,
} from '../../features/community/services/community.service';
import { ProviderPreviewService } from '../provider-preview.service';

export type ProviderCommunityTab = 'feed' | 'my-posts' | 'saved';
export type ProviderFeedFilter = 'all' | 'traveler' | 'provider';

@Component({
  selector: 'app-provider-community',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommunityPostCardComponent,
    CreatePostModalComponent,
    ConfirmDeleteModalComponent,
    ReportContentModalComponent,
    PhotoLightboxModalComponent,
  ],
  templateUrl: './provider-community.component.html',
  styleUrl: './provider-community.component.scss',
})
export class ProviderCommunityComponent implements OnInit {
  private readonly communityService = inject(CommunityService);
  private readonly providerAuthService = inject(ProviderAuthService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);

  readonly providerUser = this.providerAuthService.currentProviderUser;
  readonly isPreview = this.previewService.isPreview;

  readonly isAuthenticatedProvider = computed(() => {
    if (this.isPreview()) return false;
    return this.providerAuthService.isAuthenticated();
  });

  readonly currentProviderUserId = computed(() => {
    if (this.isPreview()) return this.previewService.previewUser?.id ?? null;
    return this.providerUser()?.id ?? null;
  });

  readonly activeAuthorName = computed(() => {
    if (this.isPreview()) return this.previewService.previewUser?.business_name || 'Service Provider';
    const u = this.providerUser();
    return u?.business_name || u?.full_name || 'Service Provider';
  });

  readonly activeAuthorSubtitle = computed(() => {
    if (this.isPreview()) return 'Preview Mode · Verified Service Provider';
    const u = this.providerUser();
    return u?.district ? `Service Provider · ${u.district}` : 'Verified Service Provider';
  });

  readonly activeTab = signal<ProviderCommunityTab>('feed');
  readonly feedFilter = signal<ProviderFeedFilter>('all');
  searchQuery = '';
  private appliedSearch = '';

  readonly posts = signal<CommunityPostDetails[]>([]);
  readonly totalPosts = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Composer / Edit modal
  readonly isComposerOpen = signal(false);
  readonly editingPost = signal<CommunityPostDetails | null>(null);

  // Delete confirmation modal
  readonly deleteTarget = signal<{ type: 'post' | 'comment'; id: number } | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  // Report modal
  readonly reportTarget = signal<ReportTarget | null>(null);

  // Lightbox
  readonly lightboxPhotos = signal<CommunityPostMediaItem[]>([]);
  readonly lightboxIndex = signal(0);
  readonly isLightboxOpen = signal(false);

  // Inline Comments Drawer (strictly Provider Portal scoped)
  readonly commentsDrawerPost = signal<CommunityPostDetails | null>(null);
  readonly drawerComments = signal<CommunityCommentDetails[]>([]);
  readonly drawerCommentsPage = signal(1);
  readonly drawerCommentsTotalPages = signal(1);
  readonly isLoadingComments = signal(false);
  readonly commentsError = signal<string | null>(null);
  newCommentBody = '';
  readonly isSubmittingComment = signal(false);
  readonly editingCommentId = signal<number | null>(null);
  editingCommentBody = '';
  readonly isSavingCommentEdit = signal(false);

  readonly toast = signal<{ kind: 'info' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.previewService.syncFromNavigation(undefined, params.get('preview'));
      this.loadPosts(1);
    });
  }

  switchTab(tab: ProviderCommunityTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.loadPosts(1);
  }

  setFeedFilter(filter: ProviderFeedFilter): void {
    if (this.feedFilter() === filter) return;
    this.feedFilter.set(filter);
    if (this.activeTab() === 'feed') {
      this.loadPosts(1);
    }
  }

  applySearch(): void {
    this.appliedSearch = this.searchQuery.trim();
    this.loadPosts(1);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.appliedSearch = '';
    this.loadPosts(1);
  }

  loadPosts(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isPreview()) {
      const sample = this.previewService.sampleCommunityPosts as CommunityPostDetails[];
      const tab = this.activeTab();
      let filtered = [...sample];
      if (tab === 'my-posts') {
        const previewId = this.previewService.previewUser?.id;
        filtered = previewId != null ? filtered.filter((p) => p.author_id === previewId) : [];
      } else if (tab === 'saved') {
        filtered = filtered.filter((p) => p.viewer_has_saved);
      } else {
        const filterVal = this.feedFilter();
        if (filterVal !== 'all') {
          filtered = filtered.filter((p) => p.author_type === filterVal);
        }
        if (this.appliedSearch) {
          const term = this.appliedSearch.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.body.toLowerCase().includes(term) ||
              p.author_name.toLowerCase().includes(term) ||
              (p.author?.provider_business_name || '').toLowerCase().includes(term),
          );
        }
      }
      this.posts.set(filtered);
      this.totalPosts.set(filtered.length);
      this.currentPage.set(1);
      this.totalPages.set(1);
      this.isLoading.set(false);
      return;
    }

    const tab = this.activeTab();
    const selectedFilter = this.feedFilter();
    const request$ =
      tab === 'my-posts'
        ? this.communityService.getMyPosts(page, 10, 'provider')
        : tab === 'saved'
          ? this.communityService.getSavedPosts(page, 10, 'provider')
          : this.communityService.getPosts(
              {
                page,
                page_size: 10,
                search: this.appliedSearch || null,
                author_type: selectedFilter === 'all' ? null : selectedFilter,
              },
              'provider',
            );

    request$.subscribe({
      next: (res) => {
        this.posts.set(res.items);
        this.totalPosts.set(res.total);
        this.currentPage.set(res.page);
        this.totalPages.set(Math.max(1, res.total_pages));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(formatCommunityError(err, 'Unable to load community posts right now.'));
      },
    });
  }

  openShareModal(): void {
    if (this.isPreview()) {
      this.showToast('info', 'Creating promotional posts is disabled in Preview Mode.');
      return;
    }
    this.editingPost.set(null);
    this.isComposerOpen.set(true);
  }

  onEditPost(post: CommunityPostDetails): void {
    this.editingPost.set(post);
    this.isComposerOpen.set(true);
  }

  onPostPublished(saved: CommunityPostDetails): void {
    const wasEdit = this.editingPost() !== null;
    this.isComposerOpen.set(false);
    this.editingPost.set(null);

    if (wasEdit) {
      this.posts.update((items) => items.map((p) => (p.id === saved.id ? saved : p)));
      this.showToast('info', 'Post updated.');
      return;
    }

    this.loadPosts(1);
    this.showToast('info', 'Promotional post published to CeylonGo Community.');
  }

  onPostChanged(updated: CommunityPostDetails): void {
    if (this.activeTab() === 'saved' && !updated.viewer_has_saved) {
      this.posts.update((items) => items.filter((p) => p.id !== updated.id));
      this.totalPosts.update((t) => Math.max(0, t - 1));
      return;
    }
    this.posts.update((items) => items.map((p) => (p.id === updated.id ? updated : p)));
  }

  onDeletePostRequested(post: CommunityPostDetails): void {
    this.deleteError.set(null);
    this.deleteTarget.set({ type: 'post', id: post.id });
  }

  onReportPostRequested(post: CommunityPostDetails): void {
    this.reportTarget.set({
      entityType: 'post',
      entityId: post.id,
      previewText: post.body.slice(0, 140),
    });
  }

  openCommentsDrawer(post: CommunityPostDetails): void {
    this.commentsDrawerPost.set(post);
    this.newCommentBody = '';
    this.editingCommentId.set(null);
    this.loadDrawerComments(1);
  }

  closeCommentsDrawer(): void {
    this.commentsDrawerPost.set(null);
    this.drawerComments.set([]);
    this.commentsError.set(null);
  }

  loadDrawerComments(page = 1): void {
    const targetPost = this.commentsDrawerPost();
    if (!targetPost) return;

    if (this.isPreview()) {
      this.drawerComments.set([]);
      this.drawerCommentsPage.set(1);
      this.drawerCommentsTotalPages.set(1);
      this.isLoadingComments.set(false);
      return;
    }

    this.isLoadingComments.set(true);
    this.commentsError.set(null);

    this.communityService.getComments(targetPost.id, page, 15, 'provider').subscribe({
      next: (res) => {
        this.drawerComments.set(res.items);
        this.drawerCommentsPage.set(res.page);
        this.drawerCommentsTotalPages.set(Math.max(1, res.total_pages));
        this.isLoadingComments.set(false);
      },
      error: (err) => {
        this.isLoadingComments.set(false);
        this.commentsError.set(formatCommunityError(err, 'Failed to load comments.'));
      },
    });
  }

  submitComment(): void {
    const targetPost = this.commentsDrawerPost();
    if (!targetPost || this.isSubmittingComment()) return;

    if (this.isPreview()) {
      this.showToast('info', 'Commenting is disabled in Preview Mode.');
      return;
    }

    const body = this.newCommentBody.trim();
    if (!body) {
      this.commentsError.set('Please enter a comment before submitting.');
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentsError.set(null);

    this.communityService.createComment(targetPost.id, body, 'provider').subscribe({
      next: (created) => {
        this.isSubmittingComment.set(false);
        this.newCommentBody = '';
        this.drawerComments.update((items) => [...items, created]);
        const nextCount = targetPost.comments_count + 1;
        this.commentsDrawerPost.set({ ...targetPost, comments_count: nextCount });
        this.posts.update((items) =>
          items.map((p) => (p.id === targetPost.id ? { ...p, comments_count: nextCount } : p)),
        );
      },
      error: (err) => {
        this.isSubmittingComment.set(false);
        this.commentsError.set(formatCommunityError(err, 'Could not submit comment.'));
      },
    });
  }

  startEditComment(comment: CommunityCommentDetails): void {
    this.editingCommentId.set(comment.id);
    this.editingCommentBody = comment.body;
  }

  saveEditComment(comment: CommunityCommentDetails): void {
    if (this.isSavingCommentEdit()) return;
    const body = this.editingCommentBody.trim();
    if (!body) return;

    this.isSavingCommentEdit.set(true);
    this.communityService.updateComment(comment.id, body, 'provider').subscribe({
      next: (updated) => {
        this.isSavingCommentEdit.set(false);
        this.editingCommentId.set(null);
        this.drawerComments.update((items) => items.map((c) => (c.id === updated.id ? updated : c)));
      },
      error: (err) => {
        this.isSavingCommentEdit.set(false);
        this.showToast('error', formatCommunityError(err, 'Could not update comment.'));
      },
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    if (target.type === 'post') {
      this.communityService.deletePost(target.id, 'provider').subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deleteTarget.set(null);
          this.posts.update((items) => items.filter((p) => p.id !== target.id));
          this.totalPosts.update((t) => Math.max(0, t - 1));
          if (this.commentsDrawerPost()?.id === target.id) {
            this.closeCommentsDrawer();
          }
          this.showToast('info', 'Post deleted.');
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.deleteError.set(formatCommunityError(err, 'Failed to delete post.'));
        },
      });
      return;
    }

    this.communityService.deleteComment(target.id, 'provider').subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleteTarget.set(null);
        this.drawerComments.update((items) => items.filter((c) => c.id !== target.id));
        const activePost = this.commentsDrawerPost();
        if (activePost) {
          const nextCount = Math.max(0, activePost.comments_count - 1);
          this.commentsDrawerPost.set({ ...activePost, comments_count: nextCount });
          this.posts.update((items) =>
            items.map((p) => (p.id === activePost.id ? { ...p, comments_count: nextCount } : p)),
          );
        }
        this.showToast('info', 'Comment deleted.');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.deleteError.set(formatCommunityError(err, 'Failed to delete comment.'));
      },
    });
  }

  isCommentOwner(comment: CommunityCommentDetails): boolean {
    const uid = this.currentProviderUserId();
    return uid != null && comment.author_id === uid;
  }

  onOpenLightbox(payload: { post: CommunityPostDetails; index: number }): void {
    this.lightboxPhotos.set(payload.post.media ?? []);
    this.lightboxIndex.set(payload.index);
    this.isLightboxOpen.set(true);
  }

  showToast(kind: 'info' | 'error', message: string): void {
    this.toast.set({ kind, message });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
