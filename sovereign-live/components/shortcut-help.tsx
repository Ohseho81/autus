"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⌨️ Shortcut Help Modal
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { category: "네비게이션", items: [
    { keys: ["1"], description: "Status 페이지" },
    { keys: ["2"], description: "Console 페이지" },
    { keys: ["3"], description: "Path 페이지" },
    { keys: ["4"], description: "Action Log 페이지" },
    { keys: ["5"], description: "Setup 페이지" },
    { keys: ["6"], description: "Map 페이지" },
    { keys: ["7"], description: "Proof 페이지" },
    { keys: ["8"], description: "Logic 페이지" },
  ]},
  { category: "결정 (Console)", items: [
    { keys: ["Y"], description: "실행 (Yes)" },
    { keys: ["D"], description: "위임 (Delegate)" },
    { keys: ["N"], description: "중단 (No)" },
    { keys: ["←", "→"], description: "이전/다음 결정" },
  ]},
  { category: "글로벌", items: [
    { keys: ["⌘", "K"], description: "검색" },
    { keys: ["?"], description: "단축키 도움말" },
    { keys: ["⌘", "E"], description: "데이터 내보내기" },
  ]},
];

export function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold">키보드 단축키</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 단축키 목록 */}
        <div className="space-y-6">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-slate-400">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="min-w-[24px] px-2 py-1 text-xs font-mono bg-slate-800 rounded border border-slate-700 text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <span className="text-xs text-slate-500">
            Press <kbd className="px-1 bg-slate-800 rounded">?</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
