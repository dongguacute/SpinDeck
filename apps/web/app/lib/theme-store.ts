import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "spindeck_theme";
const SETTINGS_KEY = "spindeck_visual_settings";

export type Theme = "dark" | "light";

export interface VisualSettings {
  vinylStyle: string;
  customBackground: string | null;
  backgroundBlur: number;
}

const DEFAULT_SETTINGS: VisualSettings = {
  vinylStyle: "classic",
  customBackground: null,
  backgroundBlur: 20,
};

function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw as Theme) || "dark";
  } catch {
    return "dark";
  }
}

function loadSettings(): VisualSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

function saveSettings(settings: VisualSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------- 全局事件总线 ---------- */
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

/* ---------- Hook ---------- */
export function useThemeStore() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [settings, setSettingsState] = useState<VisualSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setThemeState(loadTheme());
    setSettingsState(loadSettings());
    const listener = () => {
      setThemeState(loadTheme());
      setSettingsState(loadSettings());
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    saveTheme(t);
    emit();
  }, []);

  const toggleTheme = useCallback(() => {
    const next = loadTheme() === "dark" ? "light" : "dark";
    saveTheme(next);
    emit();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<VisualSettings>) => {
    const current = loadSettings();
    const next = { ...current, ...newSettings };
    saveSettings(next);
    emit();
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    emit();
  }, []);

  return { theme, setTheme, toggleTheme, settings, updateSettings, resetSettings };
}
