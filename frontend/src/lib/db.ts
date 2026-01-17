/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💾 AUTUS IndexedDB — 로컬 저장소
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zero-Cloud 원칙: 모든 데이터는 사용자 기기에만 저장
 * 
 * Tables:
 * - tasks: 할 일 목록
 * - decisions: 회의 결정 사항
 * - reports: 일일 보고서
 * - ledger: 결정 기록 (불변)
 */

const DB_NAME = 'autus_mvp';
const DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface StoredTask {
  id: string;
  content: string;
  quadrant: string;
  urgency_score: number;
  importance_score: number;
  priority_score: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
}

export interface StoredDecision {
  id: string;
  meeting_id: string;
  content: string;
  assignee: string | null;
  deadline: string | null;
  status: 'pending' | 'done' | 'cancelled';
  created_at: string;
}

export interface StoredReport {
  id: string;
  date: string;
  report_text: string;
  total_hours: number;
  task_count: number;
  created_at: string;
}

export interface LedgerBlock {
  id: string;
  type: 'accept' | 'reject' | 'delegate' | 'complete';
  target_id: string;
  target_type: 'task' | 'decision';
  prev_hash: string;
  hash: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════════════════════════════════════

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Tasks store
      if (!database.objectStoreNames.contains('tasks')) {
        const taskStore = database.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('quadrant', 'quadrant', { unique: false });
        taskStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Decisions store
      if (!database.objectStoreNames.contains('decisions')) {
        const decisionStore = database.createObjectStore('decisions', { keyPath: 'id' });
        decisionStore.createIndex('meeting_id', 'meeting_id', { unique: false });
        decisionStore.createIndex('status', 'status', { unique: false });
        decisionStore.createIndex('deadline', 'deadline', { unique: false });
      }

      // Reports store
      if (!database.objectStoreNames.contains('reports')) {
        const reportStore = database.createObjectStore('reports', { keyPath: 'id' });
        reportStore.createIndex('date', 'date', { unique: false });
      }

      // Ledger store (immutable)
      if (!database.objectStoreNames.contains('ledger')) {
        const ledgerStore = database.createObjectStore('ledger', { keyPath: 'id' });
        ledgerStore.createIndex('type', 'type', { unique: false });
        ledgerStore.createIndex('timestamp', 'timestamp', { unique: false });
        ledgerStore.createIndex('target_id', 'target_id', { unique: false });
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tasks CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveTasks(tasks: StoredTask[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');

  for (const task of tasks) {
    store.put(task);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTasks(status?: string): Promise<StoredTask[]> {
  const database = await initDB();
  const tx = database.transaction('tasks', 'readonly');
  const store = tx.objectStore('tasks');

  return new Promise((resolve, reject) => {
    let request: IDBRequest;

    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateTaskStatus(id: string, status: StoredTask['status']): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const task = getRequest.result;
      if (task) {
        task.status = status;
        if (status === 'completed') {
          task.completed_at = new Date().toISOString();
        }
        store.put(task);
      }
      resolve();
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Decisions CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveDecisions(decisions: StoredDecision[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('decisions', 'readwrite');
  const store = tx.objectStore('decisions');

  for (const decision of decisions) {
    store.put(decision);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDecisions(status?: string): Promise<StoredDecision[]> {
  const database = await initDB();
  const tx = database.transaction('decisions', 'readonly');
  const store = tx.objectStore('decisions');

  return new Promise((resolve, reject) => {
    let request: IDBRequest;

    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reports CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveReport(report: StoredReport): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('reports', 'readwrite');
  const store = tx.objectStore('reports');
  store.put(report);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getReports(limit: number = 30): Promise<StoredReport[]> {
  const database = await initDB();
  const tx = database.transaction('reports', 'readonly');
  const store = tx.objectStore('reports');
  const index = store.index('date');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev');
    const results: StoredReport[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ledger (Immutable)
// ═══════════════════════════════════════════════════════════════════════════════

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function addLedgerBlock(
  type: LedgerBlock['type'],
  targetId: string,
  targetType: LedgerBlock['target_type']
): Promise<LedgerBlock> {
  const database = await initDB();
  
  // Get last block for prev_hash
  const blocks = await getLedgerBlocks(1);
  const prevHash = blocks.length > 0 ? blocks[0].hash : '0'.repeat(64);
  
  const timestamp = new Date().toISOString();
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  const blockData = `${id}|${type}|${targetId}|${targetType}|${prevHash}|${timestamp}`;
  const hash = await sha256(blockData);
  
  const block: LedgerBlock = {
    id,
    type,
    target_id: targetId,
    target_type: targetType,
    prev_hash: prevHash,
    hash,
    timestamp
  };
  
  const tx = database.transaction('ledger', 'readwrite');
  const store = tx.objectStore('ledger');
  store.add(block);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(block);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLedgerBlocks(limit: number = 100): Promise<LedgerBlock[]> {
  const database = await initDB();
  const tx = database.transaction('ledger', 'readonly');
  const store = tx.objectStore('ledger');
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev');
    const results: LedgerBlock[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getLedgerCount(): Promise<number> {
  const database = await initDB();
  const tx = database.transaction('ledger', 'readonly');
  const store = tx.objectStore('ledger');

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Statistics
// ═══════════════════════════════════════════════════════════════════════════════

export async function getStats(): Promise<{
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalDecisions: number;
  totalReports: number;
  ledgerBlocks: number;
}> {
  const [tasks, decisions, reports, ledgerCount] = await Promise.all([
    getTasks(),
    getDecisions(),
    getReports(),
    getLedgerCount()
  ]);

  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    totalDecisions: decisions.length,
    totalReports: reports.length,
    ledgerBlocks: ledgerCount
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export/Clear
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportAllData(): Promise<{
  tasks: StoredTask[];
  decisions: StoredDecision[];
  reports: StoredReport[];
  ledger: LedgerBlock[];
}> {
  const [tasks, decisions, reports, ledger] = await Promise.all([
    getTasks(),
    getDecisions(),
    getReports(),
    getLedgerBlocks(10000)
  ]);

  return { tasks, decisions, reports, ledger };
}

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  const stores = ['tasks', 'decisions', 'reports', 'ledger'];

  for (const storeName of stores) {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
  }
}
