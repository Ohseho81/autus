/**
 * AUTUS 테마 Hook
 * 다크/라이트 모드 토글 + localStorage 영속성
 * 
 * 기능:
 * - 다크/라이트 테마 토글
 * - 시스템 테마 감지
 * - localStorage 저장
 * - Tailwind darkMode 클래스 자동 적용
 */

import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = "autus-theme";

// 시스템 테마 감지
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 테마 해결 (system → 실제 테마)
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // 초기화: localStorage에서 테마 로드
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setThemeState(savedTheme);
      setResolvedTheme(resolveTheme(savedTheme));
    } else {
      // 기본값: 다크 모드 (AUTUS 기본)
      setThemeState("dark");
      setResolvedTheme("dark");
    }
  }, []);

  // 테마 변경 시 DOM 및 localStorage 업데이트
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    // HTML 클래스 업데이트 (Tailwind darkMode)
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // 메타 테마 색상 업데이트
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", resolved === "dark" ? "#030712" : "#ffffff");
    }

    // localStorage 저장
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      setResolvedTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 테마 설정
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // 테마 토글 (dark ↔ light)
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "system") {
        return getSystemTheme() === "dark" ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
  };
}

export default useTheme;
