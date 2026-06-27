import type { MouseEvent } from "react";
import { setAppUrlOpener, setExternalUrlOpener } from "@spindeck/player";
import { isTauri } from "./is-tauri";

async function tauriShellOpen(url: string): Promise<void> {
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(url);
}

/** 桌面端注入 shell.open，供 player 包唤起 App / 打开外链 */
export async function bootstrapExternalOpeners(): Promise<void> {
  if (!isTauri()) return;

  try {
    const opener = async (url: string) => {
      await tauriShellOpen(url);
    };
    setAppUrlOpener(opener);
    setExternalUrlOpener(opener);
  } catch (err) {
    console.warn("[ExternalOpen] Tauri shell unavailable:", err);
  }
}

let bootstrapPromise: Promise<void> | null = null;

/** 确保 shell.open 已注入（预启动 / 外链打开前调用） */
export function ensureExternalOpenersReady(): Promise<void> {
  if (!isTauri()) return Promise.resolve();
  bootstrapPromise ??= bootstrapExternalOpeners();
  return bootstrapPromise;
}

/** 在系统浏览器或默认应用中打开 https / 自定义 scheme 链接 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await tauriShellOpen(url);
      return;
    } catch (err) {
      console.warn("[ExternalOpen] shell.open failed:", err);
      throw err;
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/** 拦截页内 <a href="https://...">，避免 Tauri WebView 内导航 */
export function isExternalHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export async function openExternalLink(
  event: MouseEvent<HTMLAnchorElement>,
  url: string,
): Promise<void> {
  event.preventDefault();
  await openExternalUrl(url);
}
