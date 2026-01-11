/**
 * AUTUS Local Storage Service
 * ===========================
 * 
 * 브라우저 로컬 스토리지를 사용한 데이터 저장
 * Supabase 연결이 없을 때 폴백으로 사용
 */

const PREFIX = 'autus_';

// ============================================
// Core Functions
// ============================================

export function setItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(`${PREFIX}${key}`, serialized);
  } catch (error) {
    console.error('[LocalStorage] Failed to set item:', key, error);
  }
}

export function getItem<T>(key: string, defaultValue: T | null = null): T | null {
  try {
    const item = localStorage.getItem(`${PREFIX}${key}`);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('[LocalStorage] Failed to get item:', key, error);
    return defaultValue;
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch (error) {
    console.error('[LocalStorage] Failed to remove item:', key, error);
  }
}

export function clear(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (error) {
    console.error('[LocalStorage] Failed to clear:', error);
  }
}

export function getAllKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.slice(PREFIX.length));
  } catch (error) {
    console.error('[LocalStorage] Failed to get keys:', error);
    return [];
  }
}

// ============================================
// Entity Storage (Supabase 대체)
// ============================================

export interface StoredEntity {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function saveEntity(entity: StoredEntity): void {
  const entities = getItem<StoredEntity[]>('entities', []) || [];
  const index = entities.findIndex(e => e.id === entity.id);
  
  if (index >= 0) {
    entities[index] = { ...entity, updated_at: new Date().toISOString() };
  } else {
    entities.push({
      ...entity,
      id: entity.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  
  setItem('entities', entities);
}

export function getEntity(id: string): StoredEntity | null {
  const entities = getItem<StoredEntity[]>('entities', []) || [];
  return entities.find(e => e.id === id) || null;
}

export function listEntities(type?: string): StoredEntity[] {
  const entities = getItem<StoredEntity[]>('entities', []) || [];
  if (type) return entities.filter(e => e.type === type);
  return entities;
}

export function deleteEntity(id: string): boolean {
  const entities = getItem<StoredEntity[]>('entities', []) || [];
  const filtered = entities.filter(e => e.id !== id);
  
  if (filtered.length === entities.length) return false;
  
  setItem('entities', filtered);
  return true;
}

// ============================================
// Snapshot Storage
// ============================================

export interface StoredSnapshot {
  id: string;
  entity_id: string;
  period: string;
  values: Record<string, number>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function saveSnapshot(snapshot: Omit<StoredSnapshot, 'id' | 'created_at'>): StoredSnapshot {
  const snapshots = getItem<StoredSnapshot[]>('snapshots', []) || [];
  
  // Upsert by entity_id + period
  const index = snapshots.findIndex(
    s => s.entity_id === snapshot.entity_id && s.period === snapshot.period
  );
  
  const newSnapshot: StoredSnapshot = {
    ...snapshot,
    id: index >= 0 ? snapshots[index].id : crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  
  if (index >= 0) {
    snapshots[index] = newSnapshot;
  } else {
    snapshots.push(newSnapshot);
  }
  
  setItem('snapshots', snapshots);
  return newSnapshot;
}

export function getSnapshots(entityId: string, limit = 12): StoredSnapshot[] {
  const snapshots = getItem<StoredSnapshot[]>('snapshots', []) || [];
  return snapshots
    .filter(s => s.entity_id === entityId)
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, limit);
}

// ============================================
// Export Default
// ============================================

export default {
  setItem,
  getItem,
  removeItem,
  clear,
  getAllKeys,
  saveEntity,
  getEntity,
  listEntities,
  deleteEntity,
  saveSnapshot,
  getSnapshots,
};
