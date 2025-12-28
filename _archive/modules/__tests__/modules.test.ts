// AUTUS Unit Tests — 6 tests covering Alt/Loop/Exit
import { EntropyEngine, DecisionMemoryLedger, RouteAdvisor, GraphRouter } from '../index';

const mockCtx = () => ({
  theta: { confidence: 0.6, info: 0.6, risk: 0.6 },
  ledger: { push: jest.fn(), list: () => [], find: () => [] },
  now: () => Date.now()
});

describe('EntropyEngine', () => {
  test('stable when entropy <= 0.6', () => {
    const e = new EntropyEngine();
    e.init(mockCtx());
    const r = e.step({ a: 1, b: 2, risk: 0.3 });
    expect(r.ok).toBe(true);
    expect(r.tags).toContain('STABLE');
  });

  test('ALT when entropy > 0.6', () => {
    const e = new EntropyEngine();
    e.init(mockCtx());
    const r = e.step({ a: null, b: null, c: null, risk: 0.9, delta: 0.9 });
    expect(r.ok).toBe(false);
    expect(r.tags).toContain('ALT');
  });
});

describe('RouteAdvisor', () => {
  test('NORMAL edge when high confidence/info, low risk', () => {
    const a = new RouteAdvisor();
    a.init(mockCtx());
    const r = a.step({ confidence: 0.8, info: 0.8, risk: 0.2 });
    expect(r.out.edge).toBe('NORMAL');
    expect(r.out.station).toBe('Draft Station');
  });

  test('ALTERNATE edge triggers Research Loop', () => {
    const a = new RouteAdvisor();
    a.init(mockCtx());
    const r = a.step({ confidence: 0.4, info: 0.5, risk: 0.7 });
    expect(r.out.edge).toBe('ALTERNATE');
    expect(r.out.station).toBe('Research Station');
  });

  test('EXIT edge on decision=NO', () => {
    const a = new RouteAdvisor();
    a.init(mockCtx());
    const r = a.step({ decision: 'NO' });
    expect(r.out.edge).toBe('EXIT');
    expect(r.out.station).toBe('Drop Station');
  });
});

describe('GraphRouter', () => {
  const graph = {
    stations: [
      { id: 'start', type: 'START' as const },
      { id: 'decision', type: 'DECISION' as const },
      { id: 'draft', type: 'DRAFT' as const },
      { id: 'research', type: 'RESEARCH' as const },
      { id: 'drop', type: 'DROP' as const }
    ],
    edges: [
      { from: 'start', to: 'decision', type: 'NORMAL' as const },
      { from: 'decision', to: 'draft', type: 'NORMAL' as const },
      { from: 'decision', to: 'research', type: 'ALTERNATE' as const },
      { from: 'decision', to: 'drop', type: 'EXIT' as const },
      { from: 'research', to: 'decision', type: 'LOOP' as const }
    ]
  };

  test('routes through graph based on RouteAdvisor edge', () => {
    const router = new GraphRouter();
    router.init(graph);
    expect(router.getCurrent()).toBe('start');
    
    // First step: start -> decision (NORMAL)
    router.step({ confidence: 0.8, info: 0.8, risk: 0.2 });
    expect(router.getCurrent()).toBe('decision');
    
    // Second step: decision -> draft (NORMAL, high confidence)
    router.step({ confidence: 0.9, info: 0.9, risk: 0.1 });
    expect(router.getCurrent()).toBe('draft');
  });
});


