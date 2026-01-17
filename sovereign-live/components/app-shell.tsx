"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏠 App Shell
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopStatus } from "./top-status";
import { seedIfEmpty } from "@/lib/seed";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    (async () => {
      const wasSeeded = await seedIfEmpty();
      setSeeded(wasSeeded);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-200">AUTUS</div>
          <div className="mt-2 text-sm text-slate-500">Loading ledger…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-6 py-4">
          <TopStatus />
        </div>
        <div className="p-6">
          {seeded && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              초기 데이터가 주입되었습니다. Ledger가 준비되었습니다.
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
