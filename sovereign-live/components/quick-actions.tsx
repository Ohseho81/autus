"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ Quick Actions - 빠른 액션 바
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Zap, 
  Plus, 
  FileCheck, 
  Download, 
  Keyboard,
  Wifi,
  WifiOff,
} from "lucide-react";
import { exportLedger } from "@/lib/ledger";
import { isOnline } from "@/lib/pwa";

export function QuickActions() {
  const pathname = usePathname();
  const [online, setOnline] = useState(isOnline());

  // 빠른 내보내기
  async function handleExport() {
    try {
      const data = await exportLedger();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autus-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  // 단축키 도움말 열기
  function openShortcuts() {
    dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true }));
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* 상태 표시 */}
      <div className="absolute -top-8 right-0 flex items-center gap-2 text-xs">
        {online ? (
          <span className="flex items-center gap-1 text-green-400">
            <Wifi className="h-3 w-3" /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-yellow-400">
            <WifiOff className="h-3 w-3" /> Offline
          </span>
        )}
      </div>

      {/* 액션 버튼 그룹 */}
      <div className="flex items-center gap-2 rounded-full bg-slate-800/90 backdrop-blur border border-slate-700 p-1.5 shadow-lg">
        {/* 빠른 결정 */}
        {pathname !== "/console" && (
          <Link
            href="/console"
            className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-green-400 transition-colors"
          >
            <Zap className="h-4 w-4" />
            결정
          </Link>
        )}

        {/* 빠른 증빙 */}
        {pathname !== "/proof" && (
          <Link
            href="/proof"
            className="rounded-full p-2 hover:bg-slate-700 transition-colors"
            title="증빙 추가"
          >
            <FileCheck className="h-4 w-4 text-slate-400" />
          </Link>
        )}

        {/* 내보내기 */}
        <button
          onClick={handleExport}
          className="rounded-full p-2 hover:bg-slate-700 transition-colors"
          title="데이터 내보내기 (⌘E)"
        >
          <Download className="h-4 w-4 text-slate-400" />
        </button>

        {/* 단축키 */}
        <button
          onClick={openShortcuts}
          className="rounded-full p-2 hover:bg-slate-700 transition-colors"
          title="단축키 (?)"
        >
          <Keyboard className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
