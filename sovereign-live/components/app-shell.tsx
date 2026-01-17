"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏠 App Shell - 효율 최적화 버전
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopStatus } from "./top-status";
import { ShortcutHelp } from "./shortcut-help";
import { QuickActions } from "./quick-actions";
import { seedIfEmpty } from "@/lib/seed";
import { prefetchCriticalData } from "@/lib/performance";
import { registerServiceWorker, setupInstallPrompt, isOnline, onOnlineStatusChange } from "@/lib/pwa";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [online, setOnline] = useState(true);

  // 초기화
  useEffect(() => {
    (async () => {
      // 1. Seed 데이터
      const wasSeeded = await seedIfEmpty();
      setSeeded(wasSeeded);

      // 2. 핵심 데이터 프리페치
      await prefetchCriticalData();

      // 3. PWA 설정
      registerServiceWorker();
      setupInstallPrompt();

      // 4. 온라인 상태 모니터링
      setOnline(isOnline());
      const cleanup = onOnlineStatusChange(setOnline);

      setReady(true);

      return cleanup;
    })();
  }, []);

  // 네비게이션 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 숫자 키 네비게이션
      const routes: Record<string, string> = {
        "1": "/status",
        "2": "/console",
        "3": "/path",
        "4": "/action-log",
        "5": "/setup",
        "6": "/map",
        "7": "/proof",
        "8": "/logic",
      };

      if (routes[e.key]) {
        e.preventDefault();
        router.push(routes[e.key]);
      }

      // Ctrl+E: 내보내기
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[title*="내보내기"]')?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // 로딩 화면
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 animate-pulse mx-auto" />
          </div>
          <div className="mt-4 text-xl font-semibold text-slate-200">AUTUS</div>
          <div className="mt-2 text-sm text-slate-500">Initializing...</div>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-green-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {/* 오프라인 배너 */}
        {!online && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-2 text-center text-sm text-yellow-400">
            ⚠️ 오프라인 모드 - 데이터는 로컬에 저장됩니다
          </div>
        )}

        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-6 py-4">
          <TopStatus />
        </div>

        <div className="p-6 pb-24">
          {seeded && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-fade-in">
              ✓ Ledger 준비 완료. 숫자 키(1-8)로 빠른 이동 가능.
            </div>
          )}
          {children}
        </div>
      </main>

      {/* 글로벌 컴포넌트 */}
      <ShortcutHelp />
      <QuickActions />
    </div>
  );
}
