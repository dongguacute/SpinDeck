/**
 * 从主题色推导匹配的淡色系与播放页 UI 色板。
 * 基于 HSL：保留色相，按层级调整饱和度与明度，生成和谐的淡色变体。
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** 完整主题色板 */
export interface ThemePalette {
  /** 原始主题色 */
  base: string;
  /** 沉浸背景渐变 */
  backdropTop: string;
  backdropMid: string;
  backdropBottom: string;
  backdropGradient: string;
  /** 淡色系层级（50 最淡 → 300 相对深） */
  pale50: string;
  pale100: string;
  pale200: string;
  pale300: string;
  /** UI 半透明表面 */
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;
  /** 深色背景上的文字 */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface ChromeStyle {
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;
  text: string;
  textMuted: string;
  textSecondary: string;
}

const DEFAULT_CHROME: ChromeStyle = {
  surface: "var(--surface-color)",
  surfaceHover: "var(--surface-hover)",
  border: "var(--border-color)",
  borderHover: "var(--border-hover)",
  text: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  textSecondary: "var(--text-secondary)",
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function normalizeHex(hex: string): string {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")}`;
  }
  if (raw.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return `#${raw.toLowerCase()}`;
}

export function rgbToHex(rgb: Rgb): string {
  const toByte = (v: number) =>
    Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${toByte(rgb.r)}${toByte(rgb.g)}${toByte(rgb.b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex).slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) {
    return { h: 0, s: 0, l };
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h, s, l };
}

export function hslToRgb(hsl: Hsl): Rgb {
  const h = hsl.h;
  const s = clamp(hsl.s, 0, 1);
  const l = clamp(hsl.l, 0, 1);

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb({ h, s, l }));
}

/** 线性混合两个 hex 颜色（目标为黑/白） */
export function mixHex(hex: string, target: "#000" | "#fff", amount: number): string {
  const targetRgb = target === "#000" ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  return mixRgb(hexToRgb(hex), targetRgb, amount);
}

/** 线性混合两个任意 hex 颜色 */
export function mixColors(hexA: string, hexB: string, amount: number): string {
  return mixRgb(hexToRgb(hexA), hexToRgb(hexB), amount);
}

function mixRgb(a: Rgb, b: Rgb, amount: number): string {
  const t = clamp(amount, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

type PaleLevel = 50 | 100 | 200 | 300;

/** 各级淡色的目标明度（偏高，营造通透感） */
const PALE_LIGHTNESS: Record<PaleLevel, number> = {
  50: 0.968,
  100: 0.928,
  200: 0.862,
  300: 0.768,
};

/** 各级淡色掺白比例（越高越淡） */
const PALE_WHITE_MIX: Record<PaleLevel, number> = {
  50: 0.86,
  100: 0.74,
  200: 0.58,
  300: 0.42,
};

/** 各级淡色饱和度上限（保证有色彩，又不艳俗） */
const PALE_SAT_CAP: Record<PaleLevel, number> = {
  50: 0.38,
  100: 0.48,
  200: 0.58,
  300: 0.68,
};

/**
 * 高明度下允许的饱和度下限（避免发灰）。
 */
function minPleasingSaturation(lightness: number, level: PaleLevel): number {
  const l = clamp(lightness, 0, 1);
  const floor = PALE_SAT_CAP[level] * 0.38;
  return clamp(floor + (1 - l) * 0.08, 0.1, PALE_SAT_CAP[level] * 0.55);
}

/**
 * 压缩过艳原色，但保留足够色相信息。
 */
function compressVividness(saturation: number): number {
  return Math.pow(clamp(saturation, 0, 1), 0.48);
}

/**
 * 淡色微调色相：暖色略偏暖、冷色略偏冷，更自然。
 */
function adjustHueForPastel(hue: number): number {
  const deg = hue * 360;
  if (deg >= 20 && deg <= 200) return hue - 0.012;
  if (deg >= 200 && deg <= 320) return hue + 0.01;
  return hue + 0.008;
}

/** 最后一步：微量掺白，增加奶油感 */
function softenWithWhite(hex: string, whiteAmount: number): string {
  return mixHex(hex, "#fff", clamp(whiteAmount, 0, 0.12));
}

/**
 * 从主题色推导好看的淡色变体（pastel）。
 * 先掺白得到柔和底色，再在 HSL 中校准明度与饱和度。
 */
export function derivePaleTint(baseHex: string, level: PaleLevel): string {
  const base = normalizeHex(baseHex);
  const { h, s } = rgbToHsl(hexToRgb(base));
  const lightness = PALE_LIGHTNESS[level];

  // 1. 掺白：最自然的 pastel 基底
  const tinted = mixColors(base, "#ffffff", PALE_WHITE_MIX[level]);
  const tintedHsl = rgbToHsl(hexToRgb(tinted));

  // 2. 在原色鲜艳度基础上校准饱和度，避免发灰或过艳
  const vivid = compressVividness(s);
  const targetSat = clamp(
    Math.max(tintedHsl.s, vivid * PALE_SAT_CAP[level] * 0.72),
    minPleasingSaturation(lightness, level),
    PALE_SAT_CAP[level],
  );

  const pastel = hslToHex(
    adjustHueForPastel(tintedHsl.h || h),
    targetSat,
    lightness,
  );

  if (level === 50) return softenWithWhite(pastel, 0.06);
  return pastel;
}

/**
 * 封面主色 → 播放页磨砂玻璃背景（pastel 底色 + 柔和高光层次）。
 */
export function derivePlaybackGlassBackground(
  accentHex: string,
  theme: "dark" | "light" = "dark",
): string {
  const base = normalizeHex(accentHex);
  const pastel = toPlaybackPastel(base, theme);
  const pale100 = derivePaleTint(base, 100);
  const pale200 = derivePaleTint(base, 200);
  const frost = theme === "light" ? 0.68 : 0.58;
  const frostSoft = theme === "light" ? 0.76 : 0.66;

  return [
    `radial-gradient(ellipse 130% 90% at 50% -12%, ${hexToRgba("#ffffff", frost)} 0%, transparent 62%)`,
    `radial-gradient(ellipse 85% 65% at 88% 105%, ${hexToRgba(pale200, 0.34)} 0%, transparent 55%)`,
    `radial-gradient(ellipse 75% 58% at 12% 82%, ${hexToRgba(pale100, 0.28)} 0%, transparent 50%)`,
    `linear-gradient(165deg, ${hexToRgba(pastel, frostSoft)} 0%, ${hexToRgba(mixColors(pastel, pale100, 0.28), frostSoft - 0.06)} 100%)`,
  ].join(", ");
}

/**
 * 封面主色 → 播放页背景色（明显但柔和的 pastel，非近白）。
 */
export function toPlaybackPastel(accentHex: string, theme: "dark" | "light" = "dark"): string {
  const base = normalizeHex(accentHex);
  const { h, s } = rgbToHsl(hexToRgb(base));
  const vivid = compressVividness(s);
  const targetL = theme === "light" ? 0.84 : 0.88;
  const targetS = clamp(
    Math.max(vivid * (theme === "light" ? 0.62 : 0.55), theme === "light" ? 0.3 : 0.24),
    theme === "light" ? 0.3 : 0.24,
    theme === "light" ? 0.58 : 0.55,
  );
  return hslToHex(adjustHueForPastel(h), targetS, targetL);
}

/**
 * 推导有质感的深色背景（宝石色调，非纯灰黑）。
 */
export function deriveBackdropShade(
  baseHex: string,
  lightness: number,
  satBoost = 1,
): string {
  const { h, s } = rgbToHsl(hexToRgb(normalizeHex(baseHex)));
  const vivid = compressVividness(s);
  const richSat = clamp(vivid * satBoost * 0.85 + 0.28, 0.36, 0.72);
  const richHue = h + (lightness < 0.14 ? 0.006 : 0);
  return hslToHex(richHue, richSat, clamp(lightness, 0, 1));
}

/**
 * 从主题色生成完整色板（淡色系 + 背景 + UI + 文字）。
 */
export function deriveThemePalette(baseHex: string): ThemePalette {
  const base = normalizeHex(baseHex);

  const pale50 = derivePaleTint(base, 50);
  const pale100 = derivePaleTint(base, 100);
  const pale200 = derivePaleTint(base, 200);
  const pale300 = derivePaleTint(base, 300);

  const backdropTop = deriveBackdropShade(base, 0.3, 1.02);
  const backdropMid = deriveBackdropShade(base, 0.17, 1.06);
  const backdropBottom = deriveBackdropShade(base, 0.1, 1.1);

  const backdropGradient = [
    `radial-gradient(ellipse 110% 75% at 50% -15%, ${hexToRgba(pale200, 0.14)} 0%, transparent 58%)`,
    `radial-gradient(ellipse 90% 60% at 80% 100%, ${hexToRgba(pale300, 0.08)} 0%, transparent 55%)`,
    `linear-gradient(168deg, ${backdropTop} 0%, ${backdropMid} 50%, ${backdropBottom} 100%)`,
  ].join(", ");

  return {
    base,
    backdropTop,
    backdropMid,
    backdropBottom,
    backdropGradient,
    pale50,
    pale100,
    pale200,
    pale300,
    surface: hexToRgba(pale50, 0.32),
    surfaceHover: hexToRgba(pale100, 0.48),
    border: hexToRgba(mixColors(pale200, pale300, 0.35), 0.42),
    borderHover: hexToRgba(pale200, 0.62),
    textPrimary: softenWithWhite(pale50, 0.18),
    textSecondary: mixColors(pale50, pale100, 0.38),
    textMuted: mixColors(pale100, pale200, 0.55),
  };
}

/**
 * 播放页浅色氛围色板（参考：封面主色 → 极淡纯色背景 + 深色可读文字）。
 */
export function derivePlaybackPalette(
  accentHex: string,
  theme: "dark" | "light" = "dark",
): ThemePalette {
  const base = normalizeHex(accentHex);
  const pale50 = toPlaybackPastel(base, theme);
  const pale100 = derivePaleTint(base, 100);
  const pale200 = derivePaleTint(base, 200);
  const pale300 = derivePaleTint(base, 300);
  const glassBackground = derivePlaybackGlassBackground(base, theme);

  return {
    base,
    backdropTop: pale50,
    backdropMid: pale50,
    backdropBottom: pale50,
    backdropGradient: glassBackground,
    pale50,
    pale100,
    pale200,
    pale300,
    surface: hexToRgba("#ffffff", 0.55),
    surfaceHover: hexToRgba(pale100, 0.82),
    border: hexToRgba(pale300, 0.38),
    borderHover: hexToRgba(pale300, 0.58),
    textPrimary: mixColors(pale300, "#111111", 0.82),
    textSecondary: mixColors(pale300, "#444444", 0.68),
    textMuted: mixColors(pale200, "#888888", 0.62),
  };
}

/** 将主题色板映射为顶部 chrome 控件样式 */
export function themePaletteToChrome(palette: ThemePalette): ChromeStyle {
  return {
    surface: palette.surface,
    surfaceHover: palette.surfaceHover,
    border: palette.border,
    borderHover: palette.borderHover,
    text: palette.textPrimary,
    textMuted: palette.textMuted,
    textSecondary: palette.textSecondary,
  };
}

export function getDefaultChrome(): ChromeStyle {
  return DEFAULT_CHROME;
}
