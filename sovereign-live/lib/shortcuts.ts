/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⌨️ Keyboard Shortcuts
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 창업자 생산성 극대화:
 * - 빠른 네비게이션
 * - 결정 단축키
 * - 글로벌 액션
 */

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: ShortcutHandler;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shortcut Manager
// ═══════════════════════════════════════════════════════════════════════════════

class ShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
    }
  }

  /**
   * 단축키 등록
   */
  register(shortcut: Shortcut): void {
    const key = this.getKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * 단축키 해제
   */
  unregister(shortcut: Omit<Shortcut, "handler" | "description">): void {
    const key = this.getKey(shortcut as Shortcut);
    this.shortcuts.delete(key);
  }

  /**
   * 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 등록된 단축키 목록
   */
  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  private getKey(shortcut: Shortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push("ctrl");
    if (shortcut.shift) parts.push("shift");
    if (shortcut.alt) parts.push("alt");
    parts.push(shortcut.key.toLowerCase());
    return parts.join("+");
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // 입력 필드에서는 무시
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const key = this.getKey({
      key: e.key,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    } as Shortcut);

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler(e);
    }
  }
}

export const shortcuts = new ShortcutManager();

// ═══════════════════════════════════════════════════════════════════════════════
// Default Shortcuts
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_SHORTCUTS = {
  // 네비게이션
  goToStatus: { key: "1", description: "Status 페이지" },
  goToConsole: { key: "2", description: "Console 페이지" },
  goToPath: { key: "3", description: "Path 페이지" },
  goToActionLog: { key: "4", description: "Action Log 페이지" },
  goToSetup: { key: "5", description: "Setup 페이지" },
  goToMap: { key: "6", description: "Map 페이지" },
  goToProof: { key: "7", description: "Proof 페이지" },
  goToLogic: { key: "8", description: "Logic 페이지" },

  // 결정
  acceptDecision: { key: "y", description: "결정 실행 (Yes)" },
  delegateDecision: { key: "d", description: "결정 위임 (Delegate)" },
  stopDecision: { key: "n", description: "결정 중단 (No)" },

  // 네비게이션 (결정 카드)
  nextDecision: { key: "ArrowRight", description: "다음 결정" },
  prevDecision: { key: "ArrowLeft", description: "이전 결정" },

  // 글로벌
  search: { key: "k", ctrl: true, description: "검색" },
  help: { key: "?", shift: true, description: "단축키 도움말" },
  export: { key: "e", ctrl: true, description: "데이터 내보내기" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback } from "react";

/**
 * 단축키 훅
 */
export function useShortcut(
  key: string,
  handler: ShortcutHandler,
  options?: { ctrl?: boolean; shift?: boolean; alt?: boolean; description?: string }
): void {
  useEffect(() => {
    const shortcut: Shortcut = {
      key,
      ctrl: options?.ctrl,
      shift: options?.shift,
      alt: options?.alt,
      description: options?.description ?? "",
      handler,
    };

    shortcuts.register(shortcut);

    return () => {
      shortcuts.unregister(shortcut);
    };
  }, [key, handler, options?.ctrl, options?.shift, options?.alt]);
}

/**
 * 네비게이션 단축키 훅
 */
export function useNavigationShortcuts(router: { push: (path: string) => void }): void {
  const navigate = useCallback((path: string) => () => router.push(path), [router]);

  useShortcut("1", navigate("/status"), { description: "Status" });
  useShortcut("2", navigate("/console"), { description: "Console" });
  useShortcut("3", navigate("/path"), { description: "Path" });
  useShortcut("4", navigate("/action-log"), { description: "Action Log" });
  useShortcut("5", navigate("/setup"), { description: "Setup" });
  useShortcut("6", navigate("/map"), { description: "Map" });
  useShortcut("7", navigate("/proof"), { description: "Proof" });
  useShortcut("8", navigate("/logic"), { description: "Logic" });
}

/**
 * 결정 단축키 훅
 */
export function useDecisionShortcuts(handlers: {
  onAccept: () => void;
  onDelegate: () => void;
  onStop: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}): void {
  useShortcut("y", handlers.onAccept, { description: "실행" });
  useShortcut("d", handlers.onDelegate, { description: "위임" });
  useShortcut("n", handlers.onStop, { description: "중단" });
  
  if (handlers.onNext) {
    useShortcut("ArrowRight", handlers.onNext, { description: "다음" });
  }
  if (handlers.onPrev) {
    useShortcut("ArrowLeft", handlers.onPrev, { description: "이전" });
  }
}
