/**
 * ═══════════════════════════════════════════════════════════════
 * Encounter Service 테스트
 * Phase 1: Encounter Kernel
 * ═══════════════════════════════════════════════════════════════
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock supabase
const mockRpc = jest.fn();
const mockInsert = jest.fn().mockReturnValue({ error: null });
const mockSelect = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ error: null });

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'ioo_trace') {
        return { insert: mockInsert };
      }
      if (table === 'action_queue') {
        return { insert: mockInsert };
      }
      if (table === 'encounters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'enc_001',
                        title: '초5,6부',
                        scheduled_at: new Date().toISOString(),
                        duration_minutes: 90,
                        location: 'A코트',
                        coach_id: 'coach_001',
                        status: 'SCHEDULED',
                        expected_count: 8,
                        actual_count: 0,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      };
    }),
    rpc: mockRpc,
  },
}));

// Mock fetch for network check
global.fetch = jest.fn().mockResolvedValue({ ok: true });

// Import after mocks
import { EncounterService, PresenceOutbox } from '../lib/encounterService';

describe('EncounterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('getTodayEncounters', () => {
    it('오늘의 수업 목록을 반환해야 한다', async () => {
      const encounters = await EncounterService.getTodayEncounters('coach_001');
      expect(encounters).toHaveLength(1);
      expect(encounters[0].title).toBe('초5,6부');
    });

    it('coachId 없이도 전체 수업을 반환해야 한다', async () => {
      const encounters = await EncounterService.getTodayEncounters();
      expect(encounters).toBeDefined();
    });
  });

  describe('recordPresence', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({ data: 'presence_001', error: null });
    });

    it('PRESENT 상태를 기록해야 한다 (outbox에 저장)', async () => {
      await EncounterService.recordPresence(
        'enc_001', 'student_001', 'PRESENT', 'coach_001'
      );
      // outbox에 저장되었는지 확인
      const queue = await PresenceOutbox.getAll();
      const entry = queue.find(e => e.subject_id === 'student_001' && e.status === 'PRESENT');
      expect(entry).toBeDefined();
    });

    it('ABSENT 상태를 기록하면 outbox에 저장해야 한다', async () => {
      await EncounterService.recordPresence(
        'enc_001', 'student_001', 'ABSENT', 'coach_001'
      );
      const queue = await PresenceOutbox.getAll();
      const entry = queue.find(e => e.subject_id === 'student_001' && e.status === 'ABSENT');
      expect(entry).toBeDefined();
    });

    it('LATE 상태를 기록해야 한다 (outbox에 저장)', async () => {
      await EncounterService.recordPresence(
        'enc_001', 'student_001', 'LATE', 'coach_001'
      );
      const queue = await PresenceOutbox.getAll();
      const entry = queue.find(e => e.subject_id === 'student_001' && e.status === 'LATE');
      expect(entry).toBeDefined();
    });

    it('IOO trace를 기록해야 한다 (INPUT + OUTPUT)', async () => {
      await EncounterService.recordPresence(
        'enc_001', 'student_001', 'PRESENT', 'coach_001'
      );
      // ioo_trace insert가 최소 2번 호출 (INPUT + OUTPUT)
      const traceInsertCalls = mockInsert.mock.calls;
      expect(traceInsertCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('startEncounter', () => {
    it('encounter 상태를 IN_PROGRESS로 변경해야 한다', async () => {
      const result = await EncounterService.startEncounter('enc_001');
      expect(result).toBe(true);
    });
  });

  describe('endEncounter', () => {
    it('encounter 상태를 COMPLETED로 변경해야 한다', async () => {
      const result = await EncounterService.endEncounter('enc_001');
      expect(result).toBe(true);
    });
  });
});

describe('PresenceOutbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it('큐에 이벤트를 추가할 수 있어야 한다', async () => {
    await PresenceOutbox.add({
      id: 'p_001',
      encounter_id: 'enc_001',
      subject_id: 'student_001',
      status: 'PRESENT',
      recorded_by: 'coach_001',
      trace_id: 'trace_001',
      dedupe_key: 'presence:enc_001:student_001',
      created_at: new Date().toISOString(),
    });

    const queue = await PresenceOutbox.getAll();
    expect(queue).toHaveLength(1);
    expect(queue[0].subject_id).toBe('student_001');
  });

  it('중복 dedupe_key는 추가하지 않아야 한다', async () => {
    const entry = {
      id: 'p_001',
      encounter_id: 'enc_001',
      subject_id: 'student_001',
      status: 'PRESENT' as const,
      recorded_by: 'coach_001',
      trace_id: 'trace_001',
      dedupe_key: 'presence:enc_001:student_001',
      created_at: new Date().toISOString(),
    };

    await PresenceOutbox.add(entry);
    await PresenceOutbox.add(entry);

    const queue = await PresenceOutbox.getAll();
    expect(queue).toHaveLength(1);
  });

  it('dequeue로 항목을 제거할 수 있어야 한다', async () => {
    await PresenceOutbox.add({
      id: 'p_001',
      encounter_id: 'enc_001',
      subject_id: 'student_001',
      status: 'PRESENT',
      recorded_by: 'coach_001',
      trace_id: 'trace_001',
      dedupe_key: 'presence:enc_001:student_001',
      created_at: new Date().toISOString(),
    });

    await PresenceOutbox.remove('p_001');

    const queue = await PresenceOutbox.getAll();
    expect(queue).toHaveLength(0);
  });

  it('remove로 특정 항목을 제거하면 나머지만 남아야 한다', async () => {
    await PresenceOutbox.add({
      id: 'p_001',
      encounter_id: 'enc_001',
      subject_id: 'student_001',
      status: 'PRESENT',
      recorded_by: 'coach_001',
      trace_id: 'trace_001',
      dedupe_key: 'presence:enc_001:student_001',
      created_at: new Date().toISOString(),
    });
    await PresenceOutbox.add({
      id: 'p_002',
      encounter_id: 'enc_001',
      subject_id: 'student_002',
      status: 'ABSENT',
      recorded_by: 'coach_001',
      trace_id: 'trace_002',
      dedupe_key: 'presence:enc_001:student_002',
      created_at: new Date().toISOString(),
    });

    await PresenceOutbox.remove('p_001');

    const queue = await PresenceOutbox.getAll();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('p_002');
  });

  it('pending count를 반환해야 한다', async () => {
    const count = await EncounterService.getPendingPresenceCount();
    expect(typeof count).toBe('number');
  });
});

describe('getOptimisticPresence', () => {
  it('PRESENT 상태의 optimistic record를 생성해야 한다', () => {
    const record = EncounterService.getOptimisticPresence('student_001', 'PRESENT');
    expect(record.subject_id).toBe('student_001');
    expect(record.status).toBe('PRESENT');
    expect(record.source).toBe('mobile_app');
  });

  it('ABSENT 상태의 optimistic record를 생성해야 한다', () => {
    const record = EncounterService.getOptimisticPresence('student_001', 'ABSENT');
    expect(record.status).toBe('ABSENT');
  });
});
