// =============================================================================
// AUTUS v1.0 - Sync All ERPs API
// Trigger sync for all active integrations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { ERPSyncManager } from '@/lib/erp-sync-manager';
import { captureError } from '../../../../lib/monitoring';

// -----------------------------------------------------------------------------
// POST: Sync all active integrations
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { academy_id } = body;
    
    if (!academy_id) {
      return NextResponse.json(
        { ok: false, error: 'academy_id is required' },
        { status: 400 }
      );
    }
    
    const manager = new ERPSyncManager(academy_id);
    const results = await manager.syncAll();
    
    // Summary
    const summary = {
      total_providers: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      total_synced: results.reduce((a, b) => a + b.synced_records, 0),
      total_created: results.reduce((a, b) => a + b.created_records, 0),
      total_updated: results.reduce((a, b) => a + b.updated_records, 0),
    };
    
    return NextResponse.json({
      ok: true,
      data: {
        results,
        summary,
      },
      message: `Synced ${summary.total_synced} records from ${summary.successful} providers`,
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'sync-all.post' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// GET: Get sync status for all integrations
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const academyId = req.nextUrl.searchParams.get('academy_id');
    
    if (!academyId) {
      return NextResponse.json(
        { ok: false, error: 'academy_id is required' },
        { status: 400 }
      );
    }
    
    const manager = new ERPSyncManager(academyId);
    
    const [integrations, history, riskSummary] = await Promise.all([
      manager.getIntegrations(),
      manager.getSyncHistory(10),
      manager.getRiskSummary(),
    ]);
    
    return NextResponse.json({
      ok: true,
      data: {
        integrations,
        recent_syncs: history,
        risk_summary: riskSummary,
      },
    });
    
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'sync-all.get' });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
