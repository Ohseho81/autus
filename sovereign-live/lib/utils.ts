/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🛠️ Utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 클래스 병합
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 상대 시간 포맷
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return "방금 전";
}

/**
 * 날짜 포맷
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * 날짜+시간 포맷
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 우선순위 색상
 */
export function getPriorityColor(priority: "low" | "medium" | "high"): string {
  switch (priority) {
    case "high": return "text-red-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-slate-400";
    default: return "text-slate-400";
  }
}

/**
 * 상태 색상
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-green-400";
    case "delayed": return "text-red-400";
    case "needs_decision": return "text-yellow-400";
    case "in_progress": return "text-blue-400";
    case "active": return "text-blue-400";
    case "pending": return "text-slate-400";
    case "done": return "text-green-400";
    case "cancelled": return "text-slate-500";
    default: return "text-slate-400";
  }
}

/**
 * 결정 타입 라벨
 */
export function getDecisionLabel(decision: "do" | "delegate" | "stop"): string {
  switch (decision) {
    case "do": return "실행";
    case "delegate": return "위임";
    case "stop": return "중단";
    default: return decision;
  }
}

/**
 * 결정 타입 색상
 */
export function getDecisionColor(decision: "do" | "delegate" | "stop"): string {
  switch (decision) {
    case "do": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "delegate": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "stop": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default: return "bg-slate-500/20 text-slate-400";
  }
}
