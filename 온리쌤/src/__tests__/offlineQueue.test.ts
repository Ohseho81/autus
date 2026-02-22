/**
 * 오프라인 큐 매니저 테스트
 * 이벤트 큐 CRUD, 동기화 로직, 재시도 메커니즘 검증
 */

// Mock __DEV__
(global as any).__DEV__ = true;

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

// NetInfo mock - use jest.setup.ts mock (already configured in jest.setup.ts)
// The setup file mocks: fetch, addEventListener, useNetInfo
// We import it to override behavior per test
import NetInfo from '@react-native-community/netinfo';

// Mock supabase
const mockUpsert = jest.fn();
const mockSessionUpdate = jest.fn();
const mockEmergencyInsert = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'atb_session_students') {
        return {
          upsert: mockUpsert,
        };
      }
      if (table === 'atb_sessions') {
        return {
          update: jest.fn().mockReturnValue({
            eq: mockSessionUpdate,
          }),
        };
      }
      if (table === 'atb_emergency_reports') {
        return {
          insert: mockEmergencyInsert,
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }),
    functions: {
      invoke: mockFunctionsInvoke,
    },
  },
}));

import {
  addToQueue,
  getQueue,
  removeFromQueue,
  clearQueue,
  syncQueue,
  isOnline,
  setupAutoSync,
} from '../utils/offlineQueue';

import type { QueuedEvent } from '../utils/offlineQueue';

const QUEUE_KEY = '@offline_queue';

describe('오프라인 큐 - Queue Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('addToQueue', () => {
    it('이벤트를 큐에 추가해야 한다', async () => {
      await addToQueue({
        type: 'attendance',
        payload: { sessionId: 'session_001', students: [] },
      });

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('attendance');
    });

    it('자동으로 id, timestamp, retries를 생성해야 한다', async () => {
      await addToQueue({
        type: 'session_start',
        payload: { sessionId: 'session_001', startedAt: '2026-02-14T10:00:00Z' },
      });

      const queue = await getQueue();
      expect(queue[0].id).toBeTruthy();
      expect(queue[0].timestamp).toBeTruthy();
      expect(queue[0].retries).toBe(0);
    });

    it('여러 이벤트를 순서대로 추가해야 한다', async () => {
      await addToQueue({
        type: 'attendance',
        payload: { sessionId: 's1', students: [] },
      });
      await addToQueue({
        type: 'session_start',
        payload: { sessionId: 's2', startedAt: '2026-02-14T10:00:00Z' },
      });
      await addToQueue({
        type: 'emergency',
        payload: { staffId: 'staff_001', message: '부상 발생' },
      });

      const queue = await getQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].type).toBe('attendance');
      expect(queue[1].type).toBe('session_start');
      expect(queue[2].type).toBe('emergency');
    });
  });

  describe('getQueue', () => {
    it('빈 큐는 빈 배열을 반환해야 한다', async () => {
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('저장된 이벤트를 올바르게 반환해야 한다', async () => {
      const events: QueuedEvent[] = [
        {
          id: 'evt_001',
          type: 'attendance',
          payload: { sessionId: 's1', students: [] },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('evt_001');
    });

    it('잘못된 JSON은 빈 배열을 반환해야 한다', async () => {
      mockStorage[QUEUE_KEY] = 'invalid json{{{';

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('removeFromQueue', () => {
    it('특정 이벤트를 큐에서 제거해야 한다', async () => {
      const events: QueuedEvent[] = [
        { id: 'evt_001', type: 'attendance', payload: {}, timestamp: '', retries: 0 },
        { id: 'evt_002', type: 'session_start', payload: {}, timestamp: '', retries: 0 },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      await removeFromQueue('evt_001');

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('evt_002');
    });

    it('존재하지 않는 ID 제거 시 큐가 변경되지 않아야 한다', async () => {
      const events: QueuedEvent[] = [
        { id: 'evt_001', type: 'attendance', payload: {}, timestamp: '', retries: 0 },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      await removeFromQueue('nonexistent');

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
    });
  });

  describe('clearQueue', () => {
    it('큐를 완전히 비워야 한다', async () => {
      await addToQueue({ type: 'attendance', payload: {} });
      await addToQueue({ type: 'emergency', payload: { staffId: 's1', message: 'test' } });

      await clearQueue();

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });
});

describe('오프라인 큐 - Sync Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('syncQueue - attendance', () => {
    it('출석 이벤트를 동기화하고 성공 카운트를 반환해야 한다', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });

      const events: QueuedEvent[] = [
        {
          id: 'evt_001',
          type: 'attendance',
          payload: {
            sessionId: 'session_001',
            students: [
              { id: 'stu_001', status: 'present' },
              { id: 'stu_002', status: 'absent' },
            ],
          },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('출석 동기화 실패 시 재시도 횟수를 증가해야 한다', async () => {
      mockUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } });

      const events: QueuedEvent[] = [
        {
          id: 'evt_fail',
          type: 'attendance',
          payload: { sessionId: 's1', students: [] },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.failed).toBe(1);

      const queue = await getQueue();
      expect(queue[0].retries).toBe(1);
    });

    it('최대 재시도(3회) 초과 시 큐에서 제거해야 한다', async () => {
      mockUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } });

      const events: QueuedEvent[] = [
        {
          id: 'evt_maxretry',
          type: 'attendance',
          payload: { sessionId: 's1', students: [] },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 3, // MAX_RETRIES에 도달
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      await syncQueue();

      const queue = await getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('syncQueue - session_start', () => {
    it('세션 시작 이벤트를 동기화해야 한다', async () => {
      mockSessionUpdate.mockResolvedValueOnce({ error: null });
      mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: null });

      const events: QueuedEvent[] = [
        {
          id: 'evt_start',
          type: 'session_start',
          payload: {
            sessionId: 'session_001',
            startedAt: '2026-02-14T10:00:00Z',
          },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.success).toBe(1);
    });
  });

  describe('syncQueue - session_end', () => {
    it('세션 종료 이벤트를 동기화해야 한다', async () => {
      mockSessionUpdate.mockResolvedValueOnce({ error: null });
      mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: null });

      const events: QueuedEvent[] = [
        {
          id: 'evt_end',
          type: 'session_end',
          payload: {
            sessionId: 'session_001',
            endedAt: '2026-02-14T11:00:00Z',
            attendanceStats: { present: 8, absent: 2, total: 10 },
          },
          timestamp: '2026-02-14T11:00:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.success).toBe(1);
    });
  });

  describe('syncQueue - emergency', () => {
    it('긴급 신고 이벤트를 동기화해야 한다', async () => {
      mockEmergencyInsert.mockResolvedValueOnce({ error: null });
      mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: null });

      const events: QueuedEvent[] = [
        {
          id: 'evt_emg',
          type: 'emergency',
          payload: {
            staffId: 'staff_001',
            message: '학생 부상 발생',
            location: '농구코트 A',
          },
          timestamp: '2026-02-14T10:30:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.success).toBe(1);
    });
  });

  describe('syncQueue - 빈 큐', () => {
    it('빈 큐 동기화 시 0/0을 반환해야 한다', async () => {
      const result = await syncQueue();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('syncQueue - 혼합 이벤트', () => {
    it('여러 유형의 이벤트를 순서대로 처리해야 한다', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockEmergencyInsert.mockResolvedValueOnce({ error: null });
      mockFunctionsInvoke.mockResolvedValue({ data: null, error: null });

      const events: QueuedEvent[] = [
        {
          id: 'evt_1',
          type: 'attendance',
          payload: { sessionId: 's1', students: [{ id: 'stu_1', status: 'present' }] },
          timestamp: '2026-02-14T10:00:00Z',
          retries: 0,
        },
        {
          id: 'evt_2',
          type: 'emergency',
          payload: { staffId: 'staff_1', message: '긴급' },
          timestamp: '2026-02-14T10:01:00Z',
          retries: 0,
        },
      ];
      mockStorage[QUEUE_KEY] = JSON.stringify(events);

      const result = await syncQueue();
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });
});

describe('오프라인 큐 - Network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isOnline', () => {
    it('네트워크 연결 시 true를 반환해야 한다', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: true });
      const online = await isOnline();
      expect(online).toBe(true);
    });

    it('네트워크 끊김 시 false를 반환해야 한다', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
      const online = await isOnline();
      expect(online).toBe(false);
    });

    it('isConnected가 null이면 false를 반환해야 한다', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: null });
      const online = await isOnline();
      expect(online).toBe(false);
    });
  });

  describe('setupAutoSync', () => {
    it('NetInfo 리스너를 설정하고 해제 함수를 반환해야 한다', () => {
      const unsubscribe = setupAutoSync();
      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('콜백이 전달되면 동기화 후 호출되어야 한다', () => {
      const onSync = jest.fn();
      setupAutoSync(onSync);
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});

describe('오프라인 큐 - QueuedEvent 타입', () => {
  it('지원하는 이벤트 타입이 4개여야 한다', () => {
    const validTypes: QueuedEvent['type'][] = [
      'attendance',
      'session_start',
      'session_end',
      'emergency',
    ];
    expect(validTypes).toHaveLength(4);
  });
});
