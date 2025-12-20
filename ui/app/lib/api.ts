/**
 * AUTUS API Client
 * Backend 연결
 */

// API 베이스 URL
const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL || 'https://autus-production.up.railway.app';
  }
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://autus-production.up.railway.app';
};

// ═══════════════════════════════════════════════════════════════════════════════
// Physics API
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsData {
  risk: number;
  gate: string;
  status: string;
  entropy: number;
  pressure: number;
  flow: number;
  survival_time: number;
  float_pressure: number;
  planets: Array<{ name: string; value: number; angle: number }>;
  orbits: Array<{ radius: number; speed: number }>;
}

export async function fetchPhysics(): Promise<PhysicsData | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/physics/solar-binding`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Action API
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActionPayload {
  action: string;
  system_state: string;
  risk: number;
  entropy?: number;
  person_id?: string;
}

export interface ActionResult {
  audit_id: string;
  locked: boolean;
  action: string;
  timestamp: string;
}

export async function executeAction(payload: ActionPayload): Promise<ActionResult | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/action/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Audit API
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditData {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  snapshot: Record<string, any>;
  created_at: string;
  immutable: boolean;
}

export async function fetchLatestAudit(): Promise<AuditData | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/audit/latest`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAuditById(auditId: string): Promise<AuditData | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/audit/${auditId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function verifyAudit(auditId: string): Promise<{ verified: boolean; reason: string } | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/audit/verify/${auditId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
