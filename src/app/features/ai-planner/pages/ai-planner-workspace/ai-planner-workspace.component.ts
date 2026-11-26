import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AiBookingQuoteModalComponent } from '../../components/ai-booking-quote-modal/ai-booking-quote-modal.component';
import { AiConversationSidebarComponent } from '../../components/ai-conversation-sidebar/ai-conversation-sidebar.component';
import { AiMessageComposerComponent } from '../../components/ai-message-composer/ai-message-composer.component';
import { AiMessageComponent } from '../../components/ai-message/ai-message.component';
import { AiWelcomeScreenComponent } from '../../components/ai-welcome-screen/ai-welcome-screen.component';
import {
  AiBookingProposal,
  AiConversationThread,
  AiListingResult,
  AiTurn,
  buildNaturalLanguageTripPrompt,
} from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-planner-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AiConversationSidebarComponent,
    AiWelcomeScreenComponent,
    AiMessageComposerComponent,
    AiMessageComponent,
    AiBookingQuoteModalComponent,
  ],
  templateUrl: './ai-planner-workspace.component.html',
  styleUrl: './ai-planner-workspace.component.scss',
})
export class AiPlannerWorkspaceComponent implements OnInit {
  private readonly aiService = inject(AiPlannerService);
  private readonly authService = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chatScrollArea') chatScrollArea?: ElementRef<HTMLDivElement>;
  @ViewChild('composerRef') composerRef?: AiMessageComposerComponent;

  readonly conversations = signal<AiConversationThread[]>([]);
  readonly isLoadingSidebar = signal(false);
  readonly sidebarError = signal<string | null>(null);
  readonly sidebarCollapsed = signal(false);
  readonly mobileDrawerOpen = signal(false);

  readonly activeConversationId = signal<number | null>(null);
  readonly activeThread = signal<AiConversationThread | null>(null);
  readonly turns = signal<AiTurn[]>([]);
  readonly isLoadingMessages = signal(false);
  readonly messagesError = signal<string | null>(null);

  readonly composerText = signal('');
  readonly isSending = signal(false);
  readonly sendError = signal<string | null>(null);
  readonly retryAfterSec = signal<number | null>(null);
  readonly pendingUserPreview = signal<string | null>(null);

  // Proposal selection modal & live attached proposals per turn
  readonly quoteTargetListing = signal<AiListingResult | null>(null);
  readonly attachedProposalsByTurn = signal<Record<number, AiBookingProposal | undefined>>({});

  // Save trip dialog
  readonly saveModalTurn = signal<AiTurn | null>(null);
  saveTripTitleDraft = '';
  readonly isSavingTrip = signal(false);
  readonly savingTurnId = signal<number | null>(null);
  readonly saveError = signal<string | null>(null);

  readonly toast = signal<{ kind: 'info' | 'error'; message: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.toastTimer) clearTimeout(this.toastTimer);
    });

    // Clear private conversation state immediately on logout; reload on login.
    effect(() => {
      const authed = this.authService.isAuthenticated();
      const user = this.authService.currentUser();
      if (!authed) {
        this.conversations.set([]);
        this.activeConversationId.set(null);
        this.activeThread.set(null);
        this.turns.set([]);
        this.attachedProposalsByTurn.set({});
        this.quoteTargetListing.set(null);
        this.saveModalTurn.set(null);
      } else if (!user || (user.role !== 'provider' && user.role !== 'admin')) {
        this.loadConversations();
      }
    });
  }

  get isTravelerAuthenticated(): boolean {
    return this.aiService.hasTravelerSession();
  }

  ngOnInit(): void {
    const draft = this.aiService.consumePendingQuickDraft();
    if (draft) {
      this.composerText.set(buildNaturalLanguageTripPrompt(draft));
    }

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('conversationId');
      if (idParam) {
        const parsed = Number(idParam);
        if (Number.isFinite(parsed) && parsed > 0) {
          this.openConversationById(parsed);
        } else {
          this.messagesError.set('Invalid conversation identifier.');
        }
      } else {
        this.activeConversationId.set(null);
        this.activeThread.set(null);
        this.turns.set([]);
        this.messagesError.set(null);
      }
    });

    this.route.queryParamMap.subscribe((q) => {
      const qDest = q.get('destination');
      const qDur = q.get('duration');
      if (qDest && !this.composerText().trim()) {
        this.composerText.set(
          buildNaturalLanguageTripPrompt({
            destination: qDest,
            duration: qDur || undefined,
          }),
        );
      }
    });

    if (this.isTravelerAuthenticated) {
      this.loadConversations();
    }
  }

  loadConversations(): void {
    if (!this.isTravelerAuthenticated) return;
    this.isLoadingSidebar.set(true);
    this.sidebarError.set(null);

    this.aiService.listConversations(25, 0).subscribe({
      next: (items) => {
        this.conversations.set(items);
        this.isLoadingSidebar.set(false);
        const curId = this.activeConversationId();
        if (curId) {
          const matched = items.find((c) => c.id === curId) ?? null;
          if (matched) this.activeThread.set(matched);
        }
      },
      error: (err) => {
        this.isLoadingSidebar.set(false);
        this.sidebarError.set(formatAiPlannerError(err, 'Unable to load conversations.').message);
      },
    });
  }

  startNewTrip(): void {
    this.mobileDrawerOpen.set(false);
    this.activeConversationId.set(null);
    this.activeThread.set(null);
    this.turns.set([]);
    this.sendError.set(null);
    this.messagesError.set(null);
    this.attachedProposalsByTurn.set({});
    this.router.navigate(['/ai-planner']);
    setTimeout(() => this.composerRef?.focusInput(), 0);
  }

  onSelectConversation(thread: AiConversationThread): void {
    this.mobileDrawerOpen.set(false);
    this.router.navigate(['/ai-planner/chat', thread.id]);
  }

  openConversationById(conversationId: number): void {
    if (!this.isTravelerAuthenticated) {
      this.authModal.open('login', undefined, {
        type: 'custom',
        resumeCallback: () => this.openConversationById(conversationId),
      });
      return;
    }

    this.activeConversationId.set(conversationId);
    this.isLoadingMessages.set(true);
    this.messagesError.set(null);
    this.sendError.set(null);

    const known = this.conversations().find((c) => c.id === conversationId) ?? null;
    if (known) {
      this.activeThread.set(known);
    } else {
      this.aiService.getConversation(conversationId).subscribe({
        next: (thread) => this.activeThread.set(thread),
        error: () => {},
      });
    }

    this.aiService.getMessages(conversationId, 50).subscribe({
      next: (items) => {
        this.turns.set(items);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        this.isLoadingMessages.set(false);
        this.messagesError.set(formatAiPlannerError(err, 'Could not load conversation messages.').message);
      },
    });
  }

  onSuggestionClicked(prompt: string): void {
    this.composerText.set(prompt);
    setTimeout(() => this.composerRef?.focusInput(), 0);
  }

  onSendMessage(text: string): void {
    if (this.isSending()) return;
    const clean = text.trim();
    if (!clean) return;

    if (!this.authService.isAuthenticated()) {
      this.authModal.open('login', undefined, {
        type: 'generate-trip',
        data: { prompt: clean },
        resumeCallback: () => {
          this.loadConversations();
          this.onSendMessage(clean);
        },
      });
      return;
    }

    if (!this.isTravelerAuthenticated) {
      this.showToast('error', 'Please sign in with a Traveler account to plan trips with AI.');
      return;
    }

    this.sendError.set(null);
    this.retryAfterSec.set(null);
    this.isSending.set(true);
    this.pendingUserPreview.set(clean);
    this.composerText.set('');
    this.scrollToBottom();

    const currentId = this.activeConversationId();
    if (currentId) {
      this.dispatchTurn(currentId, clean);
      return;
    }

    const derivedTitle = clean.slice(0, 58) + (clean.length > 58 ? '...' : '');
    this.aiService.createConversation(derivedTitle).subscribe({
      next: (thread) => {
        this.conversations.update((list) => [thread, ...list]);
        this.activeConversationId.set(thread.id);
        this.activeThread.set(thread);
        this.router.navigate(['/ai-planner/chat', thread.id], { replaceUrl: true });
        this.dispatchTurn(thread.id, clean);
      },
      error: (err) => {
        this.isSending.set(false);
        this.pendingUserPreview.set(null);
        this.composerText.set(clean);
        const formatted = formatAiPlannerError(err, 'Could not start a new conversation.');
        this.sendError.set(formatted.message);
        this.retryAfterSec.set(formatted.retryAfterSeconds);
      },
    });
  }

  private dispatchTurn(conversationId: number, text: string): void {
    this.aiService.sendMessage(conversationId, text).subscribe({
      next: (turn) => {
        this.isSending.set(false);
        this.pendingUserPreview.set(null);
        this.turns.update((prev) => [...prev, turn]);
        this.conversations.update((list) =>
          list.map((c) => (c.id === conversationId ? { ...c, updated_at: turn.created_at } : c)),
        );
        this.scrollToBottom();
      },
      error: (err) => {
        this.isSending.set(false);
        this.pendingUserPreview.set(null);
        // Preserve unsent message on failure so Traveler can safely retry.
        this.composerText.set(text);
        const formatted = formatAiPlannerError(err, 'CeylonGo AI could not process that message.');
        this.sendError.set(formatted.message);
        this.retryAfterSec.set(formatted.retryAfterSeconds);
      },
    });
  }

  retryLastMessage(): void {
    const draft = this.composerText().trim();
    if (draft) {
      this.onSendMessage(draft);
    }
  }

  onRenameConversation(payload: { id: number; title: string }): void {
    this.aiService.renameConversation(payload.id, payload.title).subscribe({
      next: (updated) => {
        this.conversations.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        if (this.activeThread()?.id === updated.id) {
          this.activeThread.set(updated);
        }
        this.showToast('info', 'Conversation renamed.');
      },
      error: (err) => {
        this.showToast('error', formatAiPlannerError(err, 'Could not rename conversation.').message);
      },
    });
  }

  onDeleteConversation(conversationId: number): void {
    this.aiService.deleteConversation(conversationId).subscribe({
      next: () => {
        this.conversations.update((list) => list.filter((c) => c.id !== conversationId));
        this.showToast('info', 'Conversation deleted.');
        if (this.activeConversationId() === conversationId) {
          this.startNewTrip();
        }
      },
      error: (err) => {
        this.showToast('error', formatAiPlannerError(err, 'Could not delete conversation.').message);
      },
    });
  }

  onOpenSaveTrip(turn: AiTurn): void {
    if (!this.isTravelerAuthenticated) {
      this.authModal.open('login', undefined, {
        type: 'custom',
        resumeCallback: () => this.onOpenSaveTrip(turn),
      });
      return;
    }
    this.saveError.set(null);
    this.saveTripTitleDraft = turn.itinerary?.plan?.title || this.activeThread()?.title || 'My Sri Lanka Trip';
    this.saveModalTurn.set(turn);
  }

  confirmSaveTrip(): void {
    const turn = this.saveModalTurn();
    if (!turn || this.isSavingTrip()) return;
    const title = this.saveTripTitleDraft.trim();
    if (!title) {
      this.saveError.set('Please enter a trip title.');
      return;
    }

    this.saveError.set(null);
    this.isSavingTrip.set(true);
    this.savingTurnId.set(turn.id);

    this.aiService.saveTrip(title, turn.id).subscribe({
      next: () => {
        this.isSavingTrip.set(false);
        this.savingTurnId.set(null);
        this.saveModalTurn.set(null);
        this.showToast('info', 'Trip saved to Saved Trips.');
      },
      error: (err) => {
        this.isSavingTrip.set(false);
        this.savingTurnId.set(null);
        this.saveError.set(formatAiPlannerError(err, 'Unable to save trip.').message);
      },
    });
  }

  onModifyTrip(turn: AiTurn): void {
    const title = turn.itinerary?.plan?.title || 'this itinerary';
    this.composerText.set(`Modify "${title}": `);
    this.composerRef?.focusInput();
  }

  onAskAi(): void {
    this.composerRef?.focusInput();
  }

  onAskCheaper(): void {
    this.composerText.set('Please suggest a more budget-friendly option with cheaper stays and transport.');
    this.composerRef?.focusInput();
  }

  onBookWithAi(listing: AiListingResult): void {
    if (!this.isTravelerAuthenticated) {
      this.authModal.open('login', undefined, {
        type: 'custom',
        resumeCallback: () => this.quoteTargetListing.set(listing),
      });
      return;
    }
    this.quoteTargetListing.set(listing);
  }

  onProposalReady(proposal: AiBookingProposal): void {
    this.quoteTargetListing.set(null);
    const allTurns = this.turns();
    const targetTurn = allTurns[allTurns.length - 1];
    if (targetTurn) {
      this.attachedProposalsByTurn.update((map) => ({
        ...map,
        [targetTurn.id]: proposal,
      }));
      this.scrollToBottom();
    }
  }

  onModifyBookingProposal(prop: AiBookingProposal): void {
    const match = this.turns()
      .flatMap((t) => [...(t.listings ?? []), ...(t.itinerary?.listings ?? [])])
      .find((l) => l.listing_id === prop.quote.listing_id);

    if (match) {
      this.quoteTargetListing.set(match);
    } else {
      this.composerText.set(`Update booking details for ${prop.quote.title}: `);
      this.composerRef?.focusInput();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatScrollArea?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 30);
  }

  private showToast(kind: 'info' | 'error', message: string): void {
    this.toast.set({ kind, message });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
