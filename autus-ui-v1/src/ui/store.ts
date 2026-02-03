/**
 * AUTUS Global Store (Zustand)
 * Single source of truth for UI state
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Fact, 
  DecisionCard, 
  Rule, 
  FrictionDelta, 
  WeeklyBudget,
  LongTermDirection,
  Approval,
  Eligibility,
  InputSchema,
  IgnoredInput,
} from '../core/schema';
import { CONSTANTS } from '../core/schema';
import { EVENT_TYPES, createFact, type EventType } from '../core/events';
import { classifyDecision, isClaudeConfigured } from '../services/claude';
import { 
  createInitialNavigationState, 
  navigationReducer, 
  type NavigationState, 
  type NavigationAction 
} from './navigation';
import type { PageId } from './router';
import { 
  calculateDeadline, 
  calculateCooldownEnd, 
  createWeeklyBudget,
  isExpired,
  shouldAutoJumpToFriction,
  FRICTION_THRESHOLDS,
} from '../core/rules';

// ============================================================================
// Store State
// ============================================================================

interface AutusState {
  // Navigation
  navigation: NavigationState;
  
  // Facts (append-only)
  facts: Fact[];
  
  // Decision Queue
  decisionQueue: DecisionCard[];
  currentDecision: DecisionCard | null;
  
  // Rules (for Kill Board)
  rules: Rule[];
  
  // Friction Delta
  frictionDelta: FrictionDelta;
  
  // Budget
  weeklyBudget: WeeklyBudget;
  
  // Eligibility
  eligibilities: Eligibility[];
  
  // Long-term direction (temp for approve flow)
  pendingLongTermDirection: LongTermDirection | null;
  
  // Input Channel
  inputSchema: InputSchema;
  ignoredInputs: IgnoredInput[];
  
  // AI Status
  aiEnabled: boolean;
  aiClassifying: boolean;
  
  // Actions
  navigate: (action: NavigationAction) => void;
  goToPage: (pageId: PageId) => void;
  
  // Decision Actions
  approve: () => void;
  deny: () => void;
  defer: () => void;
  setLongTermDirection: (direction: LongTermDirection) => void;
  confirmLongTerm: () => void;
  confirmBudget: () => void;
  
  // Kill Board Actions
  killRule: (ruleId: string) => void;
  startRule: (name: string) => void;
  
  // Fact Actions
  appendFact: (eventType: EventType, subjectId: string, value: Record<string, unknown>, source: string) => void;
  
  // Input Actions
  processInput: (input: unknown) => void;
  
  // TTL Check
  checkExpiredDecisions: () => void;
  
  // Friction Check
  checkFrictionThreshold: () => void;
  
  // AI Actions
  classifyWithAI: (decision: DecisionCard) => Promise<void>;
  checkAIStatus: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialFrictionDelta: FrictionDelta = {
  questions: 0,
  interventions: 0,
  exceptions: 0,
  escalations: 0,
  computed_at: new Date().toISOString(),
};

const initialInputSchema: InputSchema = {
  version: '1.0',
  allowed_events: Object.values(EVENT_TYPES),
  required_fields: ['event_type', 'subject_id', 'value', 'source'],
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAutusStore = create<AutusState>((set, get) => ({
  // Initial State
  navigation: createInitialNavigationState(),
  facts: [],
  decisionQueue: [],
  currentDecision: null,
  rules: [],
  frictionDelta: initialFrictionDelta,
  weeklyBudget: createWeeklyBudget(),
  eligibilities: [],
  pendingLongTermDirection: null,
  inputSchema: initialInputSchema,
  ignoredInputs: [],
  aiEnabled: isClaudeConfigured(),
  aiClassifying: false,

  // Navigation Actions
  navigate: (action) => {
    set((state) => ({
      navigation: navigationReducer(state.navigation, action),
    }));
  },

  goToPage: (pageId) => {
    get().navigate({ type: 'GOTO', pageId });
  },

  // Decision Actions
  approve: () => {
    const { currentDecision, navigation } = get();
    if (!currentDecision || navigation.currentPage !== 'P1') return;
    
    // Start approve flow → P7
    get().navigate({ type: 'APPROVE_START' });
  },

  deny: () => {
    const { currentDecision, decisionQueue } = get();
    if (!currentDecision) return;
    
    // Record fact
    get().appendFact(
      EVENT_TYPES.DECISION_DENIED,
      currentDecision.id,
      { decision_cost: currentDecision.decision_cost },
      'autus-ui'
    );
    
    // Move to next decision
    const remaining = decisionQueue.filter(d => d.id !== currentDecision.id);
    set({
      decisionQueue: remaining,
      currentDecision: remaining[0] || null,
    });
  },

  defer: () => {
    const { currentDecision, decisionQueue } = get();
    if (!currentDecision) return;
    
    // Set TTL
    const deadline = calculateDeadline(CONSTANTS.TTL_DEFAULT_HOURS);
    
    // Record fact
    get().appendFact(
      EVENT_TYPES.DECISION_DEFERRED,
      currentDecision.id,
      { deadline, ttl_hours: CONSTANTS.TTL_DEFAULT_HOURS },
      'autus-ui'
    );
    
    // Update decision with deadline and move to end of queue
    const updated: DecisionCard = { ...currentDecision, deadline };
    const remaining = decisionQueue.filter(d => d.id !== currentDecision.id);
    remaining.push(updated);
    
    set({
      decisionQueue: remaining,
      currentDecision: remaining[0] || null,
    });
  },

  setLongTermDirection: (direction) => {
    set({ pendingLongTermDirection: direction });
  },

  confirmLongTerm: () => {
    const { pendingLongTermDirection } = get();
    if (!pendingLongTermDirection) return;
    
    // Move to P8
    get().navigate({ type: 'APPROVE_LONG_TERM_DONE' });
  },

  confirmBudget: () => {
    const { currentDecision, decisionQueue, weeklyBudget, pendingLongTermDirection } = get();
    if (!currentDecision) return;
    
    // Check budget for HIGH cost
    let newBudget = { ...weeklyBudget };
    if (currentDecision.decision_cost === 'HIGH') {
      if (newBudget.high_decisions_used >= newBudget.high_decisions_cap) {
        // Budget exceeded - auto kill
        get().appendFact(
          EVENT_TYPES.BUDGET_EXCEEDED,
          currentDecision.id,
          { budget_type: 'HIGH', current: newBudget.high_decisions_used, cap: newBudget.high_decisions_cap },
          'autus-ui'
        );
        
        // Deny instead of approve
        get().deny();
        get().navigate({ type: 'APPROVE_BUDGET_DONE' });
        return;
      }
      newBudget.high_decisions_used++;
    }
    
    // Record approval
    get().appendFact(
      EVENT_TYPES.DECISION_APPROVED,
      currentDecision.id,
      { 
        decision_cost: currentDecision.decision_cost,
        long_term_direction: pendingLongTermDirection,
      },
      'autus-ui'
    );
    
    // Move to next decision
    const remaining = decisionQueue.filter(d => d.id !== currentDecision.id);
    set({
      decisionQueue: remaining,
      currentDecision: remaining[0] || null,
      weeklyBudget: newBudget,
      pendingLongTermDirection: null,
    });
    
    // Complete flow → P1
    get().navigate({ type: 'APPROVE_BUDGET_DONE' });
  },

  // Kill Board Actions
  killRule: (ruleId) => {
    const { rules } = get();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || rule.status === 'killed') return;
    
    const cooldownUntil = calculateCooldownEnd();
    
    // Record fact
    get().appendFact(
      EVENT_TYPES.RULE_KILLED,
      ruleId,
      { rule_name: rule.name, cooldown_until: cooldownUntil },
      'autus-ui'
    );
    
    // Update rule
    set({
      rules: rules.map(r => 
        r.id === ruleId 
          ? { ...r, status: 'killed' as const, killed_at: new Date().toISOString(), cooldown_until: cooldownUntil }
          : r
      ),
    });
    
    // Navigate to P3 then back to P1
    setTimeout(() => get().goToPage('P1'), 1000);
  },

  startRule: (name) => {
    const newRule: Rule = {
      id: uuidv4(),
      name,
      status: 'running',
      started_at: new Date().toISOString(),
      killed_at: null,
      cooldown_until: null,
    };
    
    get().appendFact(
      EVENT_TYPES.RULE_STARTED,
      newRule.id,
      { rule_name: name },
      'autus-ui'
    );
    
    set((state) => ({ rules: [...state.rules, newRule] }));
  },

  // Fact Actions (APPEND-ONLY)
  appendFact: (eventType, subjectId, value, source) => {
    const fact = createFact(eventType, subjectId, value, source);
    set((state) => ({ facts: [...state.facts, fact] }));
    
    // Update friction delta based on event type
    const { frictionDelta } = get();
    let newDelta = { ...frictionDelta, computed_at: new Date().toISOString() };
    
    if (eventType === EVENT_TYPES.INTERVENTION_LOGGED) {
      newDelta.interventions++;
    } else if (eventType === EVENT_TYPES.EXCEPTION_REQUESTED) {
      newDelta.exceptions++;
    } else if (eventType === EVENT_TYPES.ESCALATION_RAISED) {
      newDelta.escalations++;
    }
    
    set({ frictionDelta: newDelta });
    
    // Check friction threshold
    get().checkFrictionThreshold();
  },

  // Input Processing
  processInput: (input) => {
    const { inputSchema } = get();
    
    // Validate input
    if (typeof input !== 'object' || input === null) {
      const ignored: IgnoredInput = {
        id: uuidv4(),
        raw_input: JSON.stringify(input),
        reason: 'invalid_format',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ ignoredInputs: [...state.ignoredInputs, ignored] }));
      get().appendFact(EVENT_TYPES.INPUT_IGNORED, 'input', { reason: 'invalid_format' }, 'autus-ui');
      return;
    }
    
    const inputObj = input as Record<string, unknown>;
    
    // Check required fields
    for (const field of inputSchema.required_fields) {
      if (!(field in inputObj)) {
        const ignored: IgnoredInput = {
          id: uuidv4(),
          raw_input: JSON.stringify(input),
          reason: 'missing_field',
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ ignoredInputs: [...state.ignoredInputs, ignored] }));
        get().appendFact(EVENT_TYPES.INPUT_IGNORED, 'input', { reason: 'missing_field', field }, 'autus-ui');
        return;
      }
    }
    
    // Check event type
    const eventType = inputObj.event_type as string;
    if (!inputSchema.allowed_events.includes(eventType)) {
      const ignored: IgnoredInput = {
        id: uuidv4(),
        raw_input: JSON.stringify(input),
        reason: 'unknown_event',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ ignoredInputs: [...state.ignoredInputs, ignored] }));
      get().appendFact(EVENT_TYPES.INPUT_IGNORED, 'input', { reason: 'unknown_event', event_type: eventType }, 'autus-ui');
      return;
    }
    
    // Valid input - create fact
    get().appendFact(
      eventType as EventType,
      inputObj.subject_id as string,
      inputObj.value as Record<string, unknown>,
      inputObj.source as string
    );
  },

  // TTL Check
  checkExpiredDecisions: () => {
    const { decisionQueue, currentDecision } = get();
    
    decisionQueue.forEach((decision) => {
      if (isExpired(decision.deadline)) {
        // Auto kill
        get().appendFact(
          EVENT_TYPES.TTL_EXPIRED,
          decision.id,
          { original_deadline: decision.deadline },
          'autus-ui'
        );
        
        // Remove from queue
        set((state) => ({
          decisionQueue: state.decisionQueue.filter(d => d.id !== decision.id),
          currentDecision: state.currentDecision?.id === decision.id 
            ? state.decisionQueue.filter(d => d.id !== decision.id)[0] || null
            : state.currentDecision,
        }));
        
        // Navigate to Kill Board
        get().navigate({ type: 'TTL_EXPIRED', decisionId: decision.id });
      }
    });
  },

  // Friction Threshold Check
  checkFrictionThreshold: () => {
    const { frictionDelta, navigation } = get();
    
    if (shouldAutoJumpToFriction(frictionDelta) && navigation.currentPage !== 'P2') {
      get().navigate({ type: 'RISK_SPIKE' });
    }
  },

  // AI: Classify decision
  classifyWithAI: async (decision: DecisionCard) => {
    if (!isClaudeConfigured()) return;
    
    set({ aiClassifying: true });
    
    try {
      const result = await classifyDecision(decision.summary);
      if (result) {
        // Update decision with AI classification
        const { decisionQueue, currentDecision } = get();
        const updated: DecisionCard = {
          ...decision,
          decision_cost: result.cost,
          reversibility: result.reversibility,
          blast_radius: result.blast_radius,
        };
        
        set({
          decisionQueue: decisionQueue.map(d => d.id === decision.id ? updated : d),
          currentDecision: currentDecision?.id === decision.id ? updated : currentDecision,
        });
        
        // Log AI classification as fact
        get().appendFact(
          EVENT_TYPES.ACCESS_LOGGED, // Using existing event type
          decision.id,
          { 
            action: 'ai_classification',
            result,
            confidence: result.confidence,
          },
          'autus-ai'
        );
      }
    } catch (error) {
      console.error('AI classification error:', error);
    } finally {
      set({ aiClassifying: false });
    }
  },

  // AI: Check status
  checkAIStatus: () => {
    set({ aiEnabled: isClaudeConfigured() });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentPage = (state: AutusState) => state.navigation.currentPage;
export const selectCurrentDecision = (state: AutusState) => state.currentDecision;
export const selectFacts = (state: AutusState) => state.facts;
export const selectRules = (state: AutusState) => state.rules;
export const selectFrictionDelta = (state: AutusState) => state.frictionDelta;
export const selectWeeklyBudget = (state: AutusState) => state.weeklyBudget;
export const selectPendingLongTermDirection = (state: AutusState) => state.pendingLongTermDirection;
export const selectIsInApproveFlow = (state: AutusState) => state.navigation.approveFlow.active;
