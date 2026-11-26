import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { CommunityExploreSidebarComponent } from '../../components/community-explore-sidebar/community-explore-sidebar.component';
import { CommunityPostCardComponent } from '../../components/community-post-card/community-post-card.component';
import { ConfirmDeleteModalComponent } from '../../components/confirm-delete-modal/confirm-delete-modal.component';
import { CreatePostModalComponent } from '../../components/create-post-modal/create-post-modal.component';
import { PhotoLightboxModalComponent } from '../../components/photo-lightbox-modal/photo-lightbox-modal.component';
import { CommunityPostDetails, CommunityPostMediaItem } from '../../models/community.models';
import { CommunityService, formatCommunityError } from '../../services/community.service';

@Component({
  selector: 'app-community-my-posts',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CommunityExploreSidebarComponent,
    CommunityPostCardComponent,
    CreatePostModalComponent,
    ConfirmDeleteModalComponent,
    PhotoLightboxModalComponent,
  ],
  templateUrl: './community-my-posts.component.html',
  styleUrl: './community-my-posts.component.scss',
})
export class CommunityMyPostsComponent implements OnInit {
  private readonly communityService = inject(CommunityService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly posts = signal<CommunityPostDetails[]>([]);
  readonly totalPosts = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly isComposerOpen = signal(false);
  readonly editingPost = signal<CommunityPostDetails | null>(null);
  readonly postToDelete = signal<CommunityPostDetails | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly lightboxPhotos = signal<CommunityPostMediaItem[]>([]);
  readonly lightboxIndex = signal(0);
  readonly isLightboxOpen = signal(false);
  readonly toast = signal<{ kind: 'info' | 'error'; message: string } | null>(null);

  readonly userInitials = computed(() => {
    const name = (this.currentUser()?.full_name || 'TR').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.loadMyPosts(1);
  }

  loadMyPosts(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.communityService.getMyPosts(page, 10, 'traveler').subscribe({
      next: (res) => {
        this.posts.set(res.items);
        this.totalPosts.set(res.total);
        this.currentPage.set(res.page);
        this.totalPages.set(Math.max(1, res.total_pages));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(formatCommunityError(err, 'Unable to load your community posts.'));
      },
    });
  }

  openCreateModal(): void {
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
    } else {
      this.loadMyPosts(1);
      this.showToast('info', 'Post published.');
    }
  }

  onPostChanged(updated: CommunityPostDetails): void {
    this.posts.update((items) => items.map((p) => (p.id === updated.id ? updated : p)));
  }

  confirmDelete(): void {
    const target = this.postToDelete();
    if (!target || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);
    this.communityService.deletePost(target.id, 'traveler').subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.postToDelete.set(null);
        this.posts.update((items) => items.filter((p) => p.id !== target.id));
        this.totalPosts.update((t) => Math.max(0, t - 1));
        this.showToast('info', 'Post deleted.');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.deleteError.set(formatCommunityError(err, 'Failed to delete post.'));
      },
    });
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
