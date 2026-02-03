/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Persistence Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Supabase 연동 (온라인)
 * - LocalStorage 폴백 (오프라인)
 * - 불변 로그 해시 생성
 * - 자동 동기화
 */

import { EventBus, EventTypes } from './EventBus.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const STORAGE_PREFIX = 'autus_';
const SYNC_INTERVAL = 30000; // 30초

// ═══════════════════════════════════════════════════════════════════════════════
// Hash Generation (불변 로그용)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateHash(data) {
  const str = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Persistence Class
// ═══════════════════════════════════════════════════════════════════════════════

class PersistenceClass {
  constructor() {
    this.supabase = null;
    this.isOnline = navigator.onLine;
    this.pendingSync = [];
    this.syncTimer = null;
    this.initialized = false;

    // 온라인/오프라인 감지
    window.addEventListener('online', () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────────

  async init() {
    if (this.initialized) return this;

    // Supabase 동적 import
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[Persistence] Supabase connected');
      } catch (error) {
        console.warn('[Persistence] Supabase not available, using local storage only');
      }
    }

    // 동기화 타이머 시작
    this._startSyncTimer();

    // 대기 중인 동기화 로드
    this._loadPendingSync();

    this.initialized = true;
    EventBus.emit(EventTypes.SYSTEM_READY, { module: 'persistence' });

    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 데이터 저장
   */
  async save(collection, data, options = {}) {
    const record = {
      ...data,
      _id: data._id || data.id || `${collection}_${Date.now()}`,
      _collection: collection,
      _timestamp: Date.now(),
      _hash: null,
    };

    // 해시 생성 (불변 로그)
    if (options.immutable !== false) {
      record._hash = await generateHash({
        ...record,
        _prevHash: await this._getLastHash(collection),
      });
    }

    // 로컬 저장
    this._saveLocal(collection, record);

    // 온라인이면 Supabase 저장
    if (this.isOnline && this.supabase) {
      try {
        await this._saveRemote(collection, record);
      } catch (error) {
        console.warn('[Persistence] Remote save failed, queued for sync');
        this._queueForSync('save', collection, record);
      }
    } else {
      this._queueForSync('save', collection, record);
    }

    EventBus.emit(EventTypes.DATA_SAVED, { collection, record });
    return record;
  }

  /**
   * 데이터 로드
   */
  async load(collection, query = {}) {
    // 먼저 로컬에서 로드
    let localData = this._loadLocal(collection);

    // 온라인이면 원격에서도 로드
    if (this.isOnline && this.supabase) {
      try {
        const remoteData = await this._loadRemote(collection, query);
        // 로컬과 병합 (원격 우선)
        localData = this._mergeData(localData, remoteData);
        // 로컬 업데이트
        this._saveLocalBulk(collection, localData);
      } catch (error) {
        console.warn('[Persistence] Remote load failed, using local');
      }
    }

    // 쿼리 필터 적용
    if (query.filter) {
      localData = localData.filter(query.filter);
    }
    if (query.sort) {
      localData.sort(query.sort);
    }
    if (query.limit) {
      localData = localData.slice(0, query.limit);
    }

    EventBus.emit(EventTypes.DATA_LOADED, { collection, count: localData.length });
    return localData;
  }

  /**
   * 단일 레코드 로드
   */
  async loadOne(collection, id) {
    const data = await this.load(collection);
    return data.find(d => d._id === id || d.id === id) || null;
  }

  /**
   * 데이터 삭제
   */
  async delete(collection, id) {
    // 로컬 삭제
    this._deleteLocal(collection, id);

    // 온라인이면 원격 삭제
    if (this.isOnline && this.supabase) {
      try {
        await this._deleteRemote(collection, id);
      } catch (error) {
        this._queueForSync('delete', collection, { id });
      }
    } else {
      this._queueForSync('delete', collection, { id });
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Immutable Log (불변 로그)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 불변 로그 추가 (체이닝된 해시)
   */
  async appendLog(logType, entry) {
    const collection = `log_${logType}`;
    return this.save(collection, {
      ...entry,
      logType,
    }, { immutable: true });
  }

  /**
   * 로그 무결성 검증
   */
  async verifyLogIntegrity(logType) {
    const collection = `log_${logType}`;
    const logs = await this.load(collection, { sort: (a, b) => a._timestamp - b._timestamp });

    let prevHash = null;
    for (const log of logs) {
      const expectedHash = await generateHash({
        ...log,
        _hash: null,
        _prevHash: prevHash,
      });

      if (log._hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: log._id,
          expected: expectedHash,
          actual: log._hash,
        };
      }
      prevHash = log._hash;
    }

    return { valid: true, count: logs.length };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Local Storage
  // ─────────────────────────────────────────────────────────────────────────────

  _saveLocal(collection, record) {
    const key = `${STORAGE_PREFIX}${collection}`;
    const data = this._loadLocal(collection);

    const index = data.findIndex(d => d._id === record._id);
    if (index >= 0) {
      data[index] = record;
    } else {
      data.push(record);
    }

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('[Persistence] LocalStorage full, clearing old data');
      this._clearOldData(collection);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  _saveLocalBulk(collection, records) {
    const key = `${STORAGE_PREFIX}${collection}`;
    localStorage.setItem(key, JSON.stringify(records));
  }

  _loadLocal(collection) {
    const key = `${STORAGE_PREFIX}${collection}`;
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  _deleteLocal(collection, id) {
    const key = `${STORAGE_PREFIX}${collection}`;
    const data = this._loadLocal(collection);
    const filtered = data.filter(d => d._id !== id && d.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  _clearOldData(collection) {
    const key = `${STORAGE_PREFIX}${collection}`;
    const data = this._loadLocal(collection);
    // 가장 오래된 50% 삭제
    const halfLength = Math.floor(data.length / 2);
    const newData = data.slice(halfLength);
    localStorage.setItem(key, JSON.stringify(newData));
  }

  async _getLastHash(collection) {
    const data = this._loadLocal(collection);
    if (data.length === 0) return null;
    return data[data.length - 1]._hash || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Supabase Remote
  // ─────────────────────────────────────────────────────────────────────────────

  async _saveRemote(collection, record) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from(collection)
      .upsert(record, { onConflict: '_id' });

    if (error) throw error;
  }

  async _loadRemote(collection, query = {}) {
    if (!this.supabase) return [];

    let q = this.supabase.from(collection).select('*');

    if (query.since) {
      q = q.gte('_timestamp', query.since);
    }

    const { data, error } = await q;
    if (error) throw error;

    return data || [];
  }

  async _deleteRemote(collection, id) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from(collection)
      .delete()
      .eq('_id', id);

    if (error) throw error;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sync Management
  // ─────────────────────────────────────────────────────────────────────────────

  _queueForSync(operation, collection, data) {
    this.pendingSync.push({
      operation,
      collection,
      data,
      timestamp: Date.now(),
    });
    this._savePendingSync();
  }

  _savePendingSync() {
    localStorage.setItem(`${STORAGE_PREFIX}_pending_sync`, JSON.stringify(this.pendingSync));
  }

  _loadPendingSync() {
    try {
      this.pendingSync = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}_pending_sync`) || '[]');
    } catch {
      this.pendingSync = [];
    }
  }

  async _processPendingSync() {
    if (!this.isOnline || !this.supabase || this.pendingSync.length === 0) return;

    const toProcess = [...this.pendingSync];
    this.pendingSync = [];

    for (const item of toProcess) {
      try {
        if (item.operation === 'save') {
          await this._saveRemote(item.collection, item.data);
        } else if (item.operation === 'delete') {
          await this._deleteRemote(item.collection, item.data.id);
        }
      } catch (error) {
        console.warn('[Persistence] Sync failed for item:', item);
        this.pendingSync.push(item);
      }
    }

    this._savePendingSync();

    if (toProcess.length > this.pendingSync.length) {
      EventBus.emit(EventTypes.DATA_SYNC, {
        synced: toProcess.length - this.pendingSync.length,
        pending: this.pendingSync.length,
      });
    }
  }

  _startSyncTimer() {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => this._processPendingSync(), SYNC_INTERVAL);
  }

  _handleOnline() {
    this.isOnline = true;
    console.log('[Persistence] Online - syncing...');
    this._processPendingSync();
  }

  _handleOffline() {
    this.isOnline = false;
    console.log('[Persistence] Offline - using local storage');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────────────────────

  _mergeData(local, remote) {
    const merged = new Map();

    // 로컬 먼저
    local.forEach(item => merged.set(item._id, item));

    // 원격으로 덮어쓰기 (더 최신이면)
    remote.forEach(item => {
      const existing = merged.get(item._id);
      if (!existing || item._timestamp > existing._timestamp) {
        merged.set(item._id, item);
      }
    });

    return Array.from(merged.values());
  }

  getStats() {
    return {
      isOnline: this.isOnline,
      hasSupabase: !!this.supabase,
      pendingSyncCount: this.pendingSync.length,
      initialized: this.initialized,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const Persistence = new PersistenceClass();
export default Persistence;
