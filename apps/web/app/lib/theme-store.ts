import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "spindeck_theme";
export type Theme = "dark" | "light";

function load(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw as Theme) || "dark";
  } catch {
    return "dark";
  }
}

function save(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

/* ---------- 全局事件总线 ---------- */
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

/* ---------- Hook ---------- */
export function useThemeStore() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(load());
    const listener = () => setThemeState(load());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    save(t);
    emit();
  }, []);

  const toggleTheme = useCallback(() => {
    const next = load() === "dark" ? "light" : "dark";
    save(next);
    emit();
  }, []);

  return { theme, setTheme, toggleTheme };
}
