export function hexToRgb(hex: string) {
  const raw = hex.trim().replace(/^#/, "");
  let n = raw;
  if (raw.length === 3) {
    n = raw.split("").map((c) => c + c).join("");
  }
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toByte = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
    case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
    default: h = ((rNorm - gNorm) / d + 4) / 6; break;
  }
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number) {
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

export function mixColors(hexA: string, hexB: string, amount: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.min(1, Math.max(0, amount));
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

export function derivePaleTint(baseHex: string, level: 50 | 100 | 200 | 300): string {
  const { h } = rgbToHsl(...Object.values(hexToRgb(baseHex)) as [number, number, number]);
  const lightnessMap = { 50: 0.968, 100: 0.928, 200: 0.862, 300: 0.768 };
  const whiteMixMap = { 50: 0.86, 100: 0.74, 200: 0.58, 300: 0.42 };
  
  const tinted = mixColors(baseHex, "#ffffff", whiteMixMap[level]);
  const tintedHsl = rgbToHsl(...Object.values(hexToRgb(tinted)) as [number, number, number]);
  
  const targetL = lightnessMap[level];
  const targetS = Math.min(0.68, Math.max(0.1, tintedHsl.s));
  
  const rgb = hslToRgb(tintedHsl.h || h, targetS, targetL);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function deriveVinylGlowColor(vinylHex: string, theme: "dark" | "light" = "dark"): string {
  const pale100 = derivePaleTint(vinylHex, 100);
  const pale200 = derivePaleTint(vinylHex, 200);
  const blended = mixColors(pale100, pale200, 0.42);
  const { r, g, b } = hexToRgb(blended);
  const target = theme === "light" ? 255 : 255; // Simplified
  const amount = theme === "light" ? 0.04 : 0.1;
  return rgbToHex(
    r + (target - r) * amount,
    g + (target - g) * amount,
    b + (target - b) * amount
  );
}
