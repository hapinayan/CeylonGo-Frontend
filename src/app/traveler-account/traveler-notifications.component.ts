import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  TravelerNotificationCategory,
  TravelerNotificationItem,
  TravelerNotificationsService,
  resolveNotificationRoute,
} from '../core/services/traveler-notifications.service';
import { ExperienceIcon } from '../experiences/components/icon';
import { AccountEmptyStateComponent } from '../shared/account/account-empty-state.component';
import { AccountLoadingSkeletonComponent } from '../shared/account/account-loading-skeleton.component';
import { AccountPageHeaderComponent } from '../shared/account/account-page-header.component';
import { TravelerAccountLayoutComponent } from '../shared/account/traveler-account-layout.component';

type NotificationFilter = 'all' | 'unread' | TravelerNotificationCategory;

@Component({
  selector: 'app-traveler-notifications',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ExperienceIcon,
    TravelerAccountLayoutComponent,
    AccountPageHeaderComponent,
    AccountEmptyStateComponent,
    AccountLoadingSkeletonComponent,
  ],
  template: `
    <app-traveler-account-layout active="notifications" contentLabel="Notifications">
      <app-account-page-header
        title="Notifications"
        description="Stay updated with your bookings and travel activities."
        headingId="notifications-heading"
      >
        <button
          type="button"
          class="btn-outline"
          (click)="reload()"
          [disabled]="notificationsService.isLoading()"
        >
          {{ notificationsService.isLoading() ? 'Refreshing...' : 'Refresh' }}
        </button>

        @if (notificationsService.unreadCount() > 0) {
          <button
            type="button"
            class="btn-primary"
            (click)="markAllAsRead()"
            [disabled]="notificationsService.isMutating()"
          >
            {{ notificationsService.isMutating() ? 'Updating...' : 'Mark All as Read' }}
          </button>
        }
      </app-account-page-header>

      <div class="filters-card">
        <div class="filter-pills" role="tablist" aria-label="Notification category filters">
          @for (tab of filterTabs; track tab.key) {
            <button
              type="button"
              class="filter-pill"
              [class.active]="activeFilter() === tab.key"
              (click)="selectFilter(tab.key)"
            >
              <span>{{ tab.label }}</span>
              @if (tab.key === 'unread' && notificationsService.unreadCount() > 0) {
                <span class="pill-count">{{ notificationsService.unreadCount() }}</span>
              }
            </button>
          }
        </div>
      </div>

      @if (actionError()) {
        <div class="state-banner error" role="alert">
          <span>{{ actionError() }}</span>
          <button type="button" class="btn-outline" (click)="actionError.set(null)">Dismiss</button>
        </div>
      }

      @if (notificationsService.isLoading() && notificationsService.notifications().length === 0) {
        <app-account-loading-skeleton variant="list" [count]="3" />
      } @else if (notificationsService.errorMessage(); as error) {
        <div class="state-banner error" role="alert">
          <span>{{ error }}</span>
          <button type="button" class="btn-outline" (click)="reload()">Retry</button>
        </div>
      } @else if (notificationsService.notifications().length === 0) {
        <app-account-empty-state
          icon="bell"
          heading="You're all caught up!"
          description="New booking updates and travel notifications will appear here."
          [actionLabel]="activeFilter() !== 'all' ? 'Show All Notifications' : null"
          (actionClicked)="selectFilter('all')"
        />
      } @else {
        <div class="notification-groups">
          @for (group of groupedItems(); track group.label) {
            <section class="notif-group" [attr.aria-label]="group.label">
              <h2 class="group-heading">{{ group.label }}</h2>
              <div class="notif-list">
                @for (item of group.items; track item.id) {
                  <article class="notif-card" [class.unread]="!item.is_read">
                    <div class="notif-icon" aria-hidden="true">
                      <app-experience-icon [name]="iconForCategory(item.category)" />
                    </div>
                    <div class="notif-body">
                      <div class="notif-title-row">
                        <h3>{{ item.title }}</h3>
                        @if (!item.is_read) {
                          <span class="unread-dot" aria-label="Unread notification"></span>
                        }
                      </div>
                      <p>{{ item.message }}</p>
                      <span class="notif-time">{{ item.created_at | date: 'd MMM yyyy, h:mm a' }}</span>
                    </div>
                    <div class="notif-actions">
                      @if (routeFor(item); as target) {
                        <button
                          type="button"
                          class="btn-link"
                          (click)="openNotification(item, target)"
                        >
                          View Details
                        </button>
                      }
                      @if (!item.is_read) {
                        <button
                          type="button"
                          class="btn-mark-read"
                          (click)="markAsRead(item)"
                        >
                          Mark as read
                        </button>
                      }
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        </div>

        @if (notificationsService.hasMore()) {
          <div class="load-more-row">
            <button
              type="button"
              class="btn-outline"
              (click)="loadMore()"
              [disabled]="notificationsService.isLoading()"
            >
              {{ notificationsService.isLoading() ? 'Loading...' : 'Load More Notifications' }}
            </button>
          </div>
        }
      }
    </app-traveler-account-layout>
  `,
  styles: [`
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.85rem 1rem;
    }

    .filter-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 38px;
      padding: 0 0.9rem;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #edf5ff;
        color: #082b5c;
      }

      &.active {
        background: #0066ff;
        border-color: #0066ff;
        color: #ffffff;
      }
    }

    .pill-count {
      padding: 0.08rem 0.42rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.22);
      font-size: 0.74rem;
    }

    .state-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .notification-groups {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .group-heading {
      margin: 0 0 0.55rem;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .notif-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .notif-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.95rem 1.05rem;
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;

      &.unread {
        background: #edf5ff;
        border-color: #bfdbfe;
      }
    }

    .notif-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eaf2ff;
      color: #0066ff;
      display: grid;
      place-items: center;
      font-size: 1.15rem;
      flex: none;
    }

    .notif-body {
      flex: 1;
      min-width: 0;

      h3 {
        margin: 0;
        color: #082b5c;
        font-size: 0.96rem;
        font-weight: 700;
      }

      p {
        margin: 0.25rem 0;
        color: #475569;
        font-size: 0.88rem;
      }
    }

    .notif-title-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0066ff;
    }

    .notif-time {
      color: #64748b;
      font-size: 0.78rem;
    }

    .notif-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .load-more-row {
      display: flex;
      justify-content: center;
      margin-top: 0.5rem;
    }

    .btn-primary,
    .btn-outline,
    .btn-link,
    .btn-mark-read {
      min-height: 36px;
      padding: 0 0.9rem;
      border-radius: 9px;
      font: inherit;
      font-size: 0.83rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-primary {
      border: none;
      background: #0066ff;
      color: #ffffff;
    }

    .btn-outline,
    .btn-link,
    .btn-mark-read {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #082b5c;
    }

    @media (max-width: 640px) {
      .filter-pills {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0.25rem;
      }

      .notif-card {
        flex-direction: column;
      }
    }
  `],
})
export class TravelerNotificationsComponent implements OnInit {
  private readonly router = inject(Router);
  readonly notificationsService = inject(TravelerNotificationsService);

  readonly activeFilter = signal<NotificationFilter>('all');
  readonly actionError = signal<string | null>(null);

  readonly filterTabs: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'booking', label: 'Bookings' },
    { key: 'payment', label: 'Payments' },
    { key: 'community', label: 'Community' },
    { key: 'account', label: 'Account' },
  ];

  readonly groupedItems = computed(() => {
    const items = this.notificationsService.notifications();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86_400_000;

    const today: TravelerNotificationItem[] = [];
    const yesterday: TravelerNotificationItem[] = [];
    const earlier: TravelerNotificationItem[] = [];

    for (const item of items) {
      const ts = Date.parse(item.created_at);
      if (Number.isFinite(ts) && ts >= startOfToday) today.push(item);
      else if (Number.isFinite(ts) && ts >= startOfYesterday) yesterday.push(item);
      else earlier.push(item);
    }

    const groups: { label: string; items: TravelerNotificationItem[] }[] = [];
    if (today.length) groups.push({ label: 'Today', items: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
    if (earlier.length) groups.push({ label: 'Earlier', items: earlier });
    return groups;
  });

  ngOnInit(): void {
    this.reload();
  }

  selectFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
    this.reload();
  }

  reload(): void {
    this.actionError.set(null);
    const f = this.activeFilter();
    this.notificationsService.refresh({
      page: 1,
      pageSize: 20,
      unreadOnly: f === 'unread',
      category: f !== 'all' && f !== 'unread' ? f : null,
    });
  }

  loadMore(): void {
    const f = this.activeFilter();
    this.notificationsService
      .loadNotifications(
        {
          page: this.notificationsService.page() + 1,
          pageSize: this.notificationsService.pageSize(),
          unreadOnly: f === 'unread',
          category: f !== 'all' && f !== 'unread' ? f : null,
        },
        true,
      )
      .subscribe({
        error: () => this.actionError.set('Could not load older notifications.'),
      });
  }

  markAsRead(item: TravelerNotificationItem): void {
    if (item.is_read) return;
    this.actionError.set(null);
    this.notificationsService.markAsRead(item.id).subscribe({
      error: () => this.actionError.set('Could not mark notification as read.'),
    });
  }

  markAllAsRead(): void {
    this.actionError.set(null);
    this.notificationsService.markAllAsRead().subscribe({
      error: () => this.actionError.set('Could not mark all notifications as read.'),
    });
  }

  routeFor(item: TravelerNotificationItem): string[] | null {
    return resolveNotificationRoute(item);
  }

  openNotification(item: TravelerNotificationItem, route: string[]): void {
    if (!item.is_read) {
      this.notificationsService.markAsRead(item.id).subscribe({ error: () => {} });
    }
    void this.router.navigate(route);
  }

  iconForCategory(category: TravelerNotificationCategory): string {
    switch (category) {
      case 'booking':
        return 'calendar';
      case 'payment':
        return 'shield';
      case 'community':
        return 'group';
      default:
        return 'bell';
    }
  }
}
