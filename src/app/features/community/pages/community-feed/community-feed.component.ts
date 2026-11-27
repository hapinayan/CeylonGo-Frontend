import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
import { CommunityPostDetails, CommunityPostMediaItem } from '../../models/community.models';
import { CommunityService, formatCommunityError } from '../../services/community.service';

export type CommunityFeedFilter = 'all' | 'traveler' | 'provider';

@Component({
  selector: 'app-community-feed',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CommunityExploreSidebarComponent,
    CommunityPostCardComponent,
    CreatePostModalComponent,
    ReportContentModalComponent,
    ConfirmDeleteModalComponent,
    PhotoLightboxModalComponent,
  ],
  templateUrl: './community-feed.component.html',
  styleUrl: './community-feed.component.scss',
})
export class CommunityFeedComponent implements OnInit {
  private readonly communityService = inject(CommunityService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly posts = signal<CommunityPostDetails[]>([]);
  readonly totalPosts = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly pageSize = 10;

  readonly activeFilter = signal<CommunityFeedFilter>('all');
  searchQuery = '';
  private appliedSearch = '';

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Composer / Edit modal
  readonly isComposerOpen = signal(false);
  readonly editingPost = signal<CommunityPostDetails | null>(null);

  // Delete confirmation modal
  readonly postToDelete = signal<CommunityPostDetails | null>(null);
  readonly isDeletingPost = signal(false);
  readonly deleteErrorMessage = signal<string | null>(null);

  // Report modal
  readonly reportTarget = signal<ReportTarget | null>(null);

  // Photo lightbox
  readonly lightboxPhotos = signal<CommunityPostMediaItem[]>([]);
  readonly lightboxIndex = signal(0);
  readonly isLightboxOpen = signal(false);

  readonly toast = signal<{ kind: 'info' | 'error'; message: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly userInitials = computed(() => {
    const name = (this.currentUser()?.full_name || 'Guest').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'CG';
  });

  ngOnInit(): void {
    this.loadPosts(1);
  }

  loadPosts(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filterValue = this.activeFilter();
    this.communityService
      .getPosts(
        {
          page,
          page_size: this.pageSize,
          search: this.appliedSearch || null,
          author_type: filterValue === 'all' ? null : filterValue,
        },
        'traveler',
      )
      .subscribe({
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

  setFilter(filter: CommunityFeedFilter): void {
    if (this.activeFilter() === filter) return;
    this.activeFilter.set(filter);
    this.loadPosts(1);
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

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.loadPosts(page);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openCreatePostModal(): void {
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => {
        this.editingPost.set(null);
        this.isComposerOpen.set(true);
      });
      return;
    }
    this.editingPost.set(null);
    this.isComposerOpen.set(true);
  }

  navigateProtected(route: string): void {
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => {
        this.router.navigate([route]);
      });
      return;
    }
    this.router.navigate([route]);
  }

  onEditPost(post: CommunityPostDetails): void {
    this.editingPost.set(post);
    this.isComposerOpen.set(true);
  }

  onPostPublished(savedPost: CommunityPostDetails): void {
    const wasEdit = this.editingPost() !== null;
    this.isComposerOpen.set(false);
    this.editingPost.set(null);

    if (wasEdit) {
      this.posts.update((items) => items.map((item) => (item.id === savedPost.id ? savedPost : item)));
      this.showToast('info', 'Post updated.');
      return;
    }

    // Refresh first page on new post so feed stays ordered by latest and totals remain accurate.
    this.activeFilter.set('all');
    this.appliedSearch = '';
    this.searchQuery = '';
    this.loadPosts(1);
    this.showToast('info', 'Your community post has been published.');
  }

  onPostChanged(updated: CommunityPostDetails): void {
    this.posts.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  onDeleteRequested(post: CommunityPostDetails): void {
    this.deleteErrorMessage.set(null);
    this.postToDelete.set(post);
  }

  confirmDeletePost(): void {
    const target = this.postToDelete();
    if (!target || this.isDeletingPost()) return;

    this.isDeletingPost.set(true);
    this.deleteErrorMessage.set(null);

    this.communityService.deletePost(target.id, 'traveler').subscribe({
      next: () => {
        this.isDeletingPost.set(false);
        this.postToDelete.set(null);
        this.posts.update((items) => items.filter((item) => item.id !== target.id));
        this.totalPosts.update((total) => Math.max(0, total - 1));
        this.showToast('info', 'Post deleted.');
      },
      error: (err) => {
        this.isDeletingPost.set(false);
        this.deleteErrorMessage.set(formatCommunityError(err, 'Failed to delete post.'));
      },
    });
  }

  onReportRequested(post: CommunityPostDetails): void {
    if (!this.isAuthenticated()) {
      this.promptSignIn(() => {
        this.reportTarget.set({
          entityType: 'post',
          entityId: post.id,
          previewText: post.body.slice(0, 140),
        });
      });
      return;
    }
    this.reportTarget.set({
      entityType: 'post',
      entityId: post.id,
      previewText: post.body.slice(0, 140),
    });
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

  onActionFeedback(event: { kind: 'info' | 'error'; message: string }): void {
    this.showToast(event.kind, event.message);
  }

  promptSignIn(resumeCallback?: () => void): void {
    this.authModalService.open('login', undefined, {
      type: 'community',
      resumeCallback: () => {
        this.loadPosts(this.currentPage());
        resumeCallback?.();
      },
    });
  }

  private showToast(kind: 'info' | 'error', message: string): void {
    this.toast.set({ kind, message });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
