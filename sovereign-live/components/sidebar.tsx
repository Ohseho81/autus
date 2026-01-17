"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 Sidebar Navigation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Terminal, 
  TrendingUp, 
  ClipboardList,
  Settings,
  Network,
  FileCheck,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/status", label: "1. Status", icon: LayoutDashboard, description: "현재 상태" },
  { href: "/console", label: "2. Console", icon: Terminal, description: "결정 입력" },
  { href: "/path", label: "3. Path", icon: TrendingUp, description: "미래 경로" },
  { href: "/action-log", label: "4. Action Log", icon: ClipboardList, description: "실행 기록" },
  { href: "/setup", label: "5. Setup", icon: Settings, description: "연결 설정" },
  { href: "/map", label: "6. Map", icon: Network, description: "관계 맵" },
  { href: "/proof", label: "7. Proof", icon: FileCheck, description: "증빙 보관" },
  { href: "/logic", label: "8. Logic", icon: Sliders, description: "규칙 편집" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/50">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-cyan-400" />
          <div>
            <div className="text-sm font-semibold">AUTUS</div>
            <div className="text-xs text-slate-500">v15.1 Sovereign</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <div className={cn(active ? "font-medium" : "")}>{item.label}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 w-64 border-t border-slate-800 p-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-xs text-slate-500">Local Storage</div>
          <div className="mt-1 text-sm text-slate-300">서버 저장 0</div>
          <div className="mt-2 text-xs text-slate-600">
            모든 데이터는 이 기기에만 저장됩니다
          </div>
        </div>
      </div>
    </aside>
  );
}
