import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AiConversationThread } from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-conversation-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    @if (mobileDrawerOpen) {
      <div class="drawer-backdrop" (click)="closeDrawer.emit()" aria-hidden="true"></div>
    }

    <aside
      class="ai-sidebar"
      [class.collapsed]="collapsed"
      [class.mobile-open]="mobileDrawerOpen"
      aria-label="AI Trip Conversations"
    >
      <div class="sidebar-top">
        @if (!collapsed) {
          <button type="button" class="new-trip-btn" (click)="newTrip.emit()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Trip</span>
          </button>
        }

        <button
          type="button"
          class="collapse-btn"
          (click)="toggleCollapse.emit()"
          [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          [title]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            @if (collapsed) {
              <polyline points="9 18 15 12 9 6" />
            } @else {
              <polyline points="15 18 9 12 15 6" />
            }
          </svg>
        </button>
      </div>

      @if (!collapsed) {
        <nav class="sidebar-shortcuts" aria-label="AI Planner Navigation">
          <a routerLink="/ai-planner/saved" class="saved-trips-link" (click)="closeDrawer.emit()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>Saved Trips</span>
          </a>
        </nav>

        <div class="search-wrap">
          <label for="aiConversationSearch" class="sr-only">Search conversations</label>
          <input
            id="aiConversationSearch"
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Search conversations..."
          />
        </div>

        <div class="conversations-section">
          <div class="section-label">Recent Conversations</div>

          @if (isLoading) {
            <div class="sidebar-state" aria-busy="true">Loading conversations...</div>
          } @else if (errorMessage) {
            <div class="sidebar-error" role="alert">
              <p>{{ errorMessage }}</p>
              <button type="button" class="retry-btn" (click)="retryLoad.emit()">Retry</button>
            </div>
          } @else if (!isAuthenticated) {
            <div class="sidebar-state">Sign in to save and revisit your Sri Lanka trip chats.</div>
          } @else if (filteredConversations().length === 0) {
            <div class="sidebar-state">
              {{ searchQuery().trim() ? 'No matching conversations.' : 'No conversations yet. Start planning above.' }}
            </div>
          } @else {
            <ul class="conv-list">
              @for (thread of filteredConversations(); track thread.id) {
                <li class="conv-item" [class.active]="activeConversationId === thread.id">
                  @if (renamingId() === thread.id) {
                    <form class="rename-form" (submit)="$event.preventDefault(); saveRename(thread)">
                      <input
                        type="text"
                        maxlength="120"
                        [(ngModel)]="renameDraft"
                        name="renameTitle"
                        aria-label="Rename conversation title"
                      />
                      <div class="rename-actions">
                        <button type="submit" class="mini-save">Save</button>
                        <button type="button" class="mini-cancel" (click)="cancelRename()">Cancel</button>
                      </div>
                    </form>
                  } @else {
                    <button
                      type="button"
                      class="conv-select-btn"
                      (click)="selectConversation.emit(thread)"
                    >
                      <span class="conv-title">{{ thread.title }}</span>
                      <span class="conv-time">{{ thread.updated_at | date: 'shortDate' }}</span>
                    </button>

                    <div class="conv-ops">
                      <button
                        type="button"
                        class="icon-op"
                        (click)="startRename(thread, $event)"
                        aria-label="Rename conversation"
                        title="Rename"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="icon-op danger"
                        (click)="promptDelete(thread, $event)"
                        aria-label="Delete conversation"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </aside>

    @if (deleteCandidate(); as target) {
      <div class="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-conv-title" (click)="deleteCandidate.set(null)">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <h3 id="delete-conv-title">Delete Conversation?</h3>
          <p>Remove “{{ target.title }}” permanently from your AI Trip Planner history? Any confirmed bookings will not be affected.</p>
          <div class="confirm-actions">
            <button type="button" class="btn-secondary" (click)="deleteCandidate.set(null)">Cancel</button>
            <button type="button" class="btn-danger" (click)="confirmDelete(target)">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer-backdrop {
      display: none;
    }

    .ai-sidebar {
      width: 260px;
      flex-shrink: 0;
      background: #f5f8fc;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 0.9rem 0.75rem;
      gap: 0.75rem;
      box-sizing: border-box;
      height: 100%;
      transition: width 0.18s ease;

      &.collapsed {
        width: 54px;
        padding-inline: 0.5rem;
        align-items: center;
      }
    }

    .sidebar-top {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
    }

    .new-trip-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      height: 38px;
      border-radius: 10px;
      border: 1px solid #0066ff;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;

      &:hover { background: #0052cc; }
    }

    .collapse-btn {
      width: 36px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      display: grid;
      place-items: center;
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        color: #0066ff;
        border-color: #bfdbfe;
      }
    }

    .saved-trips-link {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 0.7rem;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #082b5c;
      font-size: 0.87rem;
      font-weight: 600;
      text-decoration: none;

      svg { color: #0066ff; }
      &:hover {
        background: #eaf2ff;
        border-color: #bfdbfe;
      }
    }

    .search-wrap input {
      width: 100%;
      padding: 0.48rem 0.7rem;
      border-radius: 9px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font: inherit;
      font-size: 0.84rem;
      color: #0f172a;
      box-sizing: border-box;

      &:focus {
        outline: 2px solid rgba(0, 102, 255, 0.2);
        border-color: #0066ff;
      }
    }

    .conversations-section {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .section-label {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      padding: 0 0.25rem;
    }

    .conv-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .conv-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 10px;
      padding: 0.35rem 0.45rem;
      gap: 0.25rem;
      transition: background 0.15s ease;

      &:hover { background: #ffffff; }
      &.active { background: #eaf2ff; }
    }

    .conv-select-btn {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      text-align: left;
      padding: 0.2rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .conv-title {
      color: #0f172a;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conv-item.active .conv-title { color: #0066ff; }

    .conv-time {
      color: #64748b;
      font-size: 0.72rem;
    }

    .conv-ops {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      flex-shrink: 0;
    }

    .icon-op {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #64748b;
      display: grid;
      place-items: center;
      cursor: pointer;

      &:hover {
        background: #e2e8f0;
        color: #082b5c;
      }

      &.danger:hover {
        background: #fee2e2;
        color: #dc2626;
      }
    }

    .rename-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      input {
        width: 100%;
        padding: 0.35rem 0.5rem;
        border: 1px solid #0066ff;
        border-radius: 7px;
        font: inherit;
        font-size: 0.83rem;
        box-sizing: border-box;
      }
    }

    .rename-actions {
      display: flex;
      gap: 0.35rem;
    }

    .mini-save {
      border: none;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .mini-cancel {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      background: #ffffff;
      color: #475569;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .sidebar-state,
    .sidebar-error {
      padding: 0.65rem 0.45rem;
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.45;
    }

    .sidebar-error {
      color: #b91c1c;
      p { margin: 0 0 0.4rem; }
    }

    .retry-btn {
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      padding: 0.28rem 0.65rem;
      background: #ffffff;
      color: #082b5c;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(8, 43, 92, 0.55);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .confirm-dialog {
      width: 100%;
      max-width: 400px;
      background: #ffffff;
      border-radius: 14px;
      padding: 1.2rem;
      box-shadow: 0 20px 48px rgba(8, 43, 92, 0.25);

      h3 {
        margin: 0 0 0.45rem;
        color: #082b5c;
        font-size: 1.05rem;
      }

      p {
        margin: 0 0 1rem;
        color: #475569;
        font-size: 0.88rem;
        line-height: 1.5;
      }
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
    }

    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.48rem 0.9rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-danger {
      border: none;
      border-radius: 8px;
      padding: 0.48rem 0.95rem;
      background: #dc2626;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    @media (max-width: 900px) {
      .drawer-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 1040;
        background: rgba(8, 43, 92, 0.45);
      }

      .ai-sidebar {
        position: fixed;
        top: 72px;
        bottom: 0;
        left: 0;
        z-index: 1050;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        width: 270px !important;

        &.mobile-open {
          transform: translateX(0);
        }
      }
    }
  `],
})
export class AiConversationSidebarComponent {
  @Input() conversations: AiConversationThread[] = [];
  @Input() activeConversationId: number | null = null;
  @Input() isLoading = false;
  @Input() isAuthenticated = false;
  @Input() errorMessage: string | null = null;
  @Input() collapsed = false;
  @Input() mobileDrawerOpen = false;

  @Output() newTrip = new EventEmitter<void>();
  @Output() selectConversation = new EventEmitter<AiConversationThread>();
  @Output() renameConversation = new EventEmitter<{ id: number; title: string }>();
  @Output() deleteConversation = new EventEmitter<number>();
  @Output() retryLoad = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();

  readonly searchQuery = signal('');
  readonly renamingId = signal<number | null>(null);
  renameDraft = '';
  readonly deleteCandidate = signal<AiConversationThread | null>(null);

  readonly filteredConversations = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sorted = [...this.conversations].sort(
      (a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at),
    );
    if (!q) return sorted;
    return sorted.filter((c) => c.title.toLowerCase().includes(q));
  });

  startRename(thread: AiConversationThread, event: Event): void {
    event.stopPropagation();
    this.renamingId.set(thread.id);
    this.renameDraft = thread.title;
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameDraft = '';
  }

  saveRename(thread: AiConversationThread): void {
    const next = this.renameDraft.trim();
    if (!next || next === thread.title) {
      this.cancelRename();
      return;
    }
    this.renamingId.set(null);
    this.renameConversation.emit({ id: thread.id, title: next });
  }

  promptDelete(thread: AiConversationThread, event: Event): void {
    event.stopPropagation();
    this.deleteCandidate.set(thread);
  }

  confirmDelete(thread: AiConversationThread): void {
    this.deleteCandidate.set(null);
    this.deleteConversation.emit(thread.id);
  }
}
