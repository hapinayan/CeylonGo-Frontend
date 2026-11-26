import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../../../core/models/auth.models';
import { AuthModalService } from '../../../../core/services/auth-modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AiConversationThread, AiTurn } from '../../models/ai-planner.models';
import { AiPlannerService } from '../../services/ai-planner.service';
import { AiPlannerWorkspaceComponent } from './ai-planner-workspace.component';

describe('AiPlannerWorkspaceComponent', () => {
  let component: AiPlannerWorkspaceComponent;
  let fixture: ComponentFixture<AiPlannerWorkspaceComponent>;
  let router: Router;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const currentUserSig = signal<User | null>({
    id: 101,
    full_name: 'Hapinayan Perera',
    email: 'hapinayan017@gmail.com',
    role: 'traveler',
    is_active: true,
    created_at: '2026-11-20T10:00:00Z',
  });
  const isAuthedSig = signal(true);

  const authServiceMock = {
    isAuthenticated: () => isAuthedSig(),
    currentUser: currentUserSig,
    getToken: () => (isAuthedSig() ? 'traveler-jwt' : null),
  };

  const sampleThread: AiConversationThread = {
    id: 11,
    title: 'Jaffna Cultural Getaway',
    created_at: '2026-11-27T00:00:00Z',
    updated_at: '2026-11-27T00:05:00Z',
  };

  const sampleTurn: AiTurn = {
    id: 301,
    user_message: 'Plan a 3-day trip to Jaffna.',
    assistant_message: '# Jaffna Heritage\n- Nallur Kovil\n- Jaffna Fort',
    itinerary: {
      plan: {
        title: 'Jaffna 3-Day Discovery',
        summary: 'Northern heritage temples and coastal cuisine.',
        start_date: '2026-12-10',
        travelers: 2,
        budget_lkr: '65000.00',
        days: [
          {
            day: 1,
            destination: 'Jaffna Town',
            morning: 'Nallur Kandaswamy Temple',
            afternoon: 'Jaffna Fort & Library',
            evening: 'Rio Ice Cream & Local Dinner',
            transport: 'Tuk-tuk',
            service_refs: [],
            estimated_food_lkr: '4500.00',
            estimated_transport_lkr: '2500.00',
            estimated_other_lkr: '1000.00',
          },
        ],
      },
      listings: [],
      quotes: [],
      quoted_services_lkr: '0.00',
      estimated_other_lkr: '8000.00',
      estimated_total_lkr: '8000.00',
      remaining_budget_lkr: '57000.00',
    },
    proposal: null,
    listings: [],
    quotes: [],
    bookings: [],
    created_at: '2026-11-27T00:05:00Z',
  };

  let aiServiceMock: {
    hasTravelerSession: ReturnType<typeof vi.fn>;
    listConversations: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
    getConversation: ReturnType<typeof vi.fn>;
    renameConversation: ReturnType<typeof vi.fn>;
    deleteConversation: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    saveTrip: ReturnType<typeof vi.fn>;
    consumePendingQuickDraft: ReturnType<typeof vi.fn>;
    resolveListingPhoto: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    isAuthedSig.set(true);
    currentUserSig.set({
      id: 101,
      full_name: 'Hapinayan Perera',
      email: 'hapinayan017@gmail.com',
      role: 'traveler',
      is_active: true,
      created_at: '2026-11-20T10:00:00Z',
    });

    paramMap$ = new BehaviorSubject(convertToParamMap({}));
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    aiServiceMock = {
      hasTravelerSession: vi.fn(() => isAuthedSig() && currentUserSig()?.role === 'traveler'),
      listConversations: vi.fn(() => of([sampleThread])),
      createConversation: vi.fn(() => of(sampleThread)),
      getConversation: vi.fn(() => of(sampleThread)),
      renameConversation: vi.fn((id: number, title: string) =>
        of({ ...sampleThread, id, title }),
      ),
      deleteConversation: vi.fn(() => of(void 0)),
      getMessages: vi.fn(() => of([sampleTurn])),
      sendMessage: vi.fn(() => of(sampleTurn)),
      saveTrip: vi.fn(() =>
        of({
          id: 88,
          title: 'Jaffna 3-Day Discovery',
          created_at: '2026-11-27T00:06:00Z',
          updated_at: '2026-11-27T00:06:00Z',
          itinerary: sampleTurn.itinerary!,
        }),
      ),
      consumePendingQuickDraft: vi.fn(() => null),
      resolveListingPhoto: vi.fn(() => of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [AiPlannerWorkspaceComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AiPlannerService, useValue: aiServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AiPlannerWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the Welcome screen initially and populates composer without auto-submitting on suggestion click', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Where would you like to go?');
    expect(el.textContent).toContain('Discover Sri Lanka with your personal AI travel assistant.');
    const cards = el.querySelectorAll('.suggestion-card');
    expect(cards.length).toBe(4);

    (cards[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.composerText()).toBe('Plan a 3-day trip to Jaffna.');
    expect(aiServiceMock.createConversation).not.toHaveBeenCalled();
    expect(aiServiceMock.sendMessage).not.toHaveBeenCalled();
  });

  it('populates quick trip draft passed via queryParams without auto-submitting', () => {
    queryParamMap$.next(convertToParamMap({ destination: 'Galle', duration: '3 Days' }));
    fixture.detectChanges();

    expect(component.composerText()).toBe('Plan a 3 Days trip to Galle.');
    expect(aiServiceMock.sendMessage).not.toHaveBeenCalled();
  });

  it('prompts Traveler login when a guest clicks Send and clears conversations cleanly on logout', () => {
    const authModal = TestBed.inject(AuthModalService);
    isAuthedSig.set(false);
    currentUserSig.set(null);
    fixture.detectChanges();

    expect(component.conversations()).toEqual([]);

    component.onSendMessage('Plan a 3-day trip to Ella');
    expect(authModal.isOpen()).toBe(true);
    expect(authModal.pendingAction()?.type).toBe('generate-trip');
    expect(aiServiceMock.createConversation).not.toHaveBeenCalled();
  });

  it('creates a conversation, sends the message, navigates to /ai-planner/chat/:id, and saves trip', () => {
    component.onSendMessage('Plan a 3-day trip to Jaffna.');
    fixture.detectChanges();

    expect(aiServiceMock.createConversation).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/ai-planner/chat', 11], { replaceUrl: true });
    expect(aiServiceMock.sendMessage).toHaveBeenCalledWith(11, 'Plan a 3-day trip to Jaffna.');
    expect(component.turns().length).toBe(1);

    component.onOpenSaveTrip(sampleTurn);
    fixture.detectChanges();
    component.confirmSaveTrip();
    fixture.detectChanges();
    expect(aiServiceMock.saveTrip).toHaveBeenCalledWith('Jaffna 3-Day Discovery', 301);
  });

  it('preserves unsent message and displays Retry banner if sending fails (503 / 429)', () => {
    aiServiceMock.sendMessage.mockReturnValueOnce(
      throwError(() => ({
        status: 503,
        error: { detail: 'Gemini temporarily overloaded' },
      })),
    );

    component.activeConversationId.set(11);
    component.onSendMessage('Find eco lodges near Sinharaja');
    fixture.detectChanges();

    expect(component.composerText()).toBe('Find eco lodges near Sinharaja');
    expect(component.sendError()).toContain('Gemini temporarily overloaded');
    const retryBtn = fixture.debugElement.query(By.css('.btn-retry-inline'));
    expect(retryBtn).toBeTruthy();

    aiServiceMock.sendMessage.mockReturnValueOnce(of(sampleTurn));
    retryBtn.nativeElement.click();
    expect(aiServiceMock.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('requires confirmation before deleting a conversation and supports renaming', () => {
    const el = fixture.nativeElement as HTMLElement;
    const renameBtn = el.querySelector('button[aria-label="Rename conversation"]') as HTMLButtonElement;
    renameBtn.click();
    fixture.detectChanges();

    const cancelRenameBtn = el.querySelector('.rename-form .mini-cancel') as HTMLButtonElement;
    cancelRenameBtn.click();
    fixture.detectChanges();

    component.onRenameConversation({ id: 11, title: 'Updated Jaffna Plan' });
    expect(aiServiceMock.renameConversation).toHaveBeenCalledWith(11, 'Updated Jaffna Plan');

    const delBtn = el.querySelector('button[aria-label="Delete conversation"]') as HTMLButtonElement;
    delBtn.click();
    fixture.detectChanges();
    expect(aiServiceMock.deleteConversation).not.toHaveBeenCalled();

    const confirmDelBtn = el.querySelector('.confirm-dialog .btn-danger') as HTMLButtonElement;
    confirmDelBtn.click();
    expect(aiServiceMock.deleteConversation).toHaveBeenCalledWith(11);
  });
});
