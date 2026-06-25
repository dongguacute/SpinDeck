import { useEffect, useState, useCallback } from "react";
import { THEMES, THEME_CONFIGS, type ThemeType, type AppearanceMode } from "@spindeck/ui";

const THEME_KEY = "spindeck_theme_family";
const MODE_KEY = "spindeck_appearance_mode";
const SETTINGS_KEY = "spindeck_visual_settings";

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

function loadTheme(): ThemeType {
  if (typeof window === "undefined") return THEMES.CAFE;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return (raw as ThemeType) || THEMES.CAFE;
  } catch {
    return THEMES.CAFE;
  }
}

function loadMode(): AppearanceMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return (raw as AppearanceMode) || "system";
  } catch {
    return "system";
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

function saveTheme(theme: ThemeType) {
  localStorage.setItem(THEME_KEY, theme);
}

function saveMode(mode: AppearanceMode) {
  localStorage.setItem(MODE_KEY, mode);
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
  const [theme, setThemeState] = useState<ThemeType>(THEMES.CAFE);
  const [mode, setModeState] = useState<AppearanceMode>("system");
  const [settings, setSettingsState] = useState<VisualSettings>(DEFAULT_SETTINGS);

  // 计算实际生效的 mode (解决 system 逻辑)
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const t = loadTheme();
    const m = loadMode();
    setThemeState(t);
    setModeState(m);
    setSettingsState(loadSettings());

    const updateResolved = () => {
      const currentMode = loadMode();
      if (currentMode === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedMode(isDark ? "dark" : "light");
      } else {
        setResolvedMode(currentMode as "light" | "dark");
      }
    };

    updateResolved();

    const listener = () => {
      setThemeState(loadTheme());
      setModeState(loadMode());
      setSettingsState(loadSettings());
      updateResolved();
    };

    listeners.add(listener);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const mediaListener = () => {
      if (loadMode() === "system") updateResolved();
    };
    mediaQuery.addEventListener("change", mediaListener);

    return () => {
      listeners.delete(listener);
      mediaQuery.removeEventListener("change", mediaListener);
    };
  }, []);

  // 同步 DOM 状态
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedMode);
    
    // 移除旧的主题类名
    Object.values(THEME_CONFIGS).forEach(cfg => {
      document.body.classList.remove(cfg.className);
    });
    // 添加当前主题类名
    const currentCfg = THEME_CONFIGS[theme];
    if (currentCfg) {
      document.body.classList.add(currentCfg.className);
    }
  }, [resolvedMode, theme]);

  const setTheme = useCallback((t: ThemeType) => {
    saveTheme(t);
    emit();
  }, []);

  const setMode = useCallback((m: AppearanceMode) => {
    saveMode(m);
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

  return { 
    theme, setTheme, 
    mode, setMode, 
    resolvedMode,
    settings, updateSettings, resetSettings 
  };
}
