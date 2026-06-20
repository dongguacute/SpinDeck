/**
 * 从封面提取主色，生成播放页极淡纯色背景（参考示例图效果）。
 */
import type { RGBAColor } from "@spindeck/picker";
import {
  derivePlaybackPalette,
  hexToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
  toPlaybackPastel,
  type ThemePalette,
} from "./theme-color";

function rgbaToHex(c: RGBAColor): string {
  return rgbToHex({ r: c.r, g: c.g, b: c.b });
}

function averageColors(colors: RGBAColor[]): RGBAColor | null {
  const visible = colors.filter((c) => c.a > 0.45);
  if (!visible.length) return null;
  const sum = visible.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b, a: acc.a + c.a }),
    { r: 0, g: 0, b: 0, a: 0 },
  );
  const n = visible.length;
  return {
    r: Math.round(sum.r / n),
    g: Math.round(sum.g / n),
    b: Math.round(sum.b / n),
    a: sum.a / n,
  };
}

function downsampleColumn(column: RGBAColor[], count: number): string[] {
  const n = column.length;
  if (!n) return [];
  const target = Math.max(4, Math.min(count, 12));
  const out: string[] = [];

  for (let i = 0; i < target; i++) {
    const start = Math.floor((i / target) * n);
    const end = Math.floor(((i + 1) / target) * n);
    const avg = averageColors(column.slice(start, Math.max(start + 1, end)));
    if (avg) out.push(rgbaToHex(avg));
  }
  return out;
}

/**
 * 从候选色中选出最适合作为「封面主色」的 accent：
 * 偏好中等明度、饱和度较高的色（如天空蓝），避免过暗/过白。
 */
export function pickCoverAccentColor(hexes: string[]): string {
  let best = normalizeHex(hexes[0]);
  let bestScore = -1;

  for (const raw of hexes) {
    const hex = normalizeHex(raw);
    const { s, l } = rgbToHsl(hexToRgb(hex));
    const lightnessFit = 1 - Math.min(1, Math.abs(l - 0.48) * 2.2);
    const score = s * lightnessFit * (0.55 + s * 0.45);
    if (score > bestScore) {
      bestScore = score;
      best = hex;
    }
  }
  return best;
}

function proxiedCoverUrl(coverUrl: string): string {
  return `/api/image?url=${encodeURIComponent(coverUrl)}`;
}

/** 从封面采样代表色 */
export async function extractCoverSamples(coverUrl: string): Promise<string[]> {
  const proxied = proxiedCoverUrl(coverUrl);
  const { pickLeftColumnColors, pickEdgeColors } = await import("@spindeck/picker");

  const [leftColumn, edges] = await Promise.all([
    pickLeftColumnColors({ content: proxied }, 0),
    pickEdgeColors({ content: proxied }),
  ]);

  const columnHexes = downsampleColumn(leftColumn, 8);
  const edgeHexes = [edges.top, edges.left, edges.right, edges.bottom].map(rgbaToHex);

  return [...columnHexes, ...edgeHexes];
}

/** 极淡纯色背景 */
export function buildCoverPastelBackground(accentHex: string): string {
  return toPlaybackPastel(accentHex);
}

export interface PlaybackCoverTheme {
  /** 纯色背景（极淡 pastel） */
  background: string;
  /** 封面主色 / 光碟标签等 accent */
  accentHex: string;
  palette: ThemePalette;
}

/** 提取封面主色 → 极淡背景 + 浅色 UI 色板 */
export async function buildPlaybackCoverTheme(
  coverUrl: string,
  theme: "dark" | "light" = "dark",
): Promise<PlaybackCoverTheme> {
  const samples = await extractCoverSamples(coverUrl);
  const accentHex = pickCoverAccentColor(samples);
  const background = toPlaybackPastel(accentHex, theme);
  const palette = derivePlaybackPalette(accentHex, theme);

  return { background, accentHex, palette };
}
