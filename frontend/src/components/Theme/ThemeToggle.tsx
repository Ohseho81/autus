/**
 * AUTUS 테마 토글 버튼
 * 다크/라이트 모드 전환 + 애니메이션
 */

import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSize = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        relative flex items-center justify-center
        rounded-xl
        bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30
        border border-white/20 dark:border-white/10
        backdrop-blur-sm
        transition-all duration-300
        group
        ${className}
      `}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {/* 태양 아이콘 (라이트 모드) */}
      <svg
        className={`
          ${iconSize[size]}
          absolute transition-all duration-500
          ${isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"}
          text-amber-500
        `}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* 달 아이콘 (다크 모드) */}
      <svg
        className={`
          ${iconSize[size]}
          absolute transition-all duration-500
          ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"}
          text-indigo-300
        `}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      {/* 호버 글로우 효과 */}
      <div
        className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          ${isDark ? "bg-indigo-500/20" : "bg-amber-500/20"}
        `}
      />
    </button>
  );
}

export default ThemeToggle;
