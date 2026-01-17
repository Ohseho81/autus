"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Top Status Bar
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useLiveQuery } from "dexie-react-hooks";
import { ledger, getLedgerStats } from "@/lib/ledger";
import { Database, Wifi, WifiOff, Shield } from "lucide-react";

export function TopStatus() {
  const stats = useLiveQuery(() => getLedgerStats(), []);
  
  // P2P 상태는 스텁 (다음 루프에서 WebRTC 구현)
  const p2pConnected = false;

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sovereign Live</h1>
        <p className="text-xs text-slate-500">Decision → Action → Proof Loop</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Ledger 상태 */}
        <div className="flex items-center gap-2 text-xs">
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-400">Ledger:</span>
          <span className="text-slate-200">
            {stats ? `${stats.decisions}D / ${stats.tasks}T / ${stats.proofs}P` : "..."}
          </span>
        </div>

        {/* P2P 상태 */}
        <div className="flex items-center gap-2 text-xs">
          {p2pConnected ? (
            <Wifi className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span className="text-slate-400">P2P:</span>
          <span className={p2pConnected ? "text-green-400" : "text-slate-500"}>
            {p2pConnected ? "Connected" : "Offline"}
          </span>
        </div>

        {/* 보안 상태 */}
        <div className="flex items-center gap-2 text-xs">
          <Shield className="h-3.5 w-3.5 text-green-400" />
          <span className="text-green-400">Local Only</span>
        </div>
      </div>
    </header>
  );
}
