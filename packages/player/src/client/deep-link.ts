import { getDeviceOS } from "../device";
import type { PlatformType, SongInfo } from "../types";
import { isMobileQQMusicTarget } from "./qqmusic-background";

export interface OpenDeepLinkOptions {
  /** 移动端 QQ 音乐：仅用隐藏 iframe，避免切到 App 前台 */
  background?: boolean;
}

export interface QQMusicControlBurstOptions {
  /** 首条在用户手势栈内同步发出（抬臂暂停时提高命中率） */
  syncFirst?: boolean;
  /** 额外重试轮次（含首轮） */
  rounds?: number;
  /** 每轮间隔 ms */
  roundDelayMs?: number;
  /** 同轮内每条 URL 间隔 ms */
  staggerMs?: number;
}

const DEFAULT_BURST: Required<Omit<QQMusicControlBurstOptions, "syncFirst">> & {
  syncFirst: boolean;
} = {
  syncFirst: false,
  rounds: 3,
  roundDelayMs: 500,
  staggerMs: 90,
};

function isMobileOS(): boolean {
  const os = getDeviceOS();
  return os === "ios" || os === "android";
}

function isAndroid(): boolean {
  return getDeviceOS() === "android";
}

function openViaIframe(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "display:none;width:0;height:0;border:0";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 1500);
}

/** Android intent / scheme：程序化 <a> 点击，比纯 iframe 更稳 */
function openViaAnchorClick(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.cssText = "display:none";
  anchor.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 100);
}

function dispatchDeepLink(url: string, preferAnchor: boolean): void {
  if (preferAnchor && isAndroid()) {
    openViaAnchorClick(url);
    window.setTimeout(() => openViaIframe(url), 40);
    return;
  }
  openViaIframe(url);
}

/** 浏览器内唤起本地 App（桌面端默认 iframe） */
export function openDeepLink(url: string, options: OpenDeepLinkOptions = {}): void {
  const mobile = isMobileOS();
  const preferBackground = options.background ?? mobile;

  if (preferBackground) {
    openViaIframe(url);
    return;
  }

  openViaIframe(url);
}

/**
 * 移动端 QQ 音乐：始终通过隐藏 iframe 发指令，避免反复跳转 App。
 * iOS/Android 不支持从网页可靠地后台控制第三方 App，这是目前最优折中。
 */
export function openQQMusicDeepLink(url: string): void {
  if (isMobileQQMusicTarget()) {
    openViaIframe(url);
    return;
  }
  openViaIframe(url);
}

/**
 * Android QQ 音乐控制：多轮 burst + 双通道（anchor + iframe）。
 * 仅用于 pause / resume 等明确指令，避免 toggle 类 URL 互相打架。
 */
export function openQQMusicControlBurst(
  urls: string[],
  options: QQMusicControlBurstOptions = {},
): void {
  if (urls.length === 0) return;

  const config = { ...DEFAULT_BURST, ...options };
  let syncUsed = false;

  if (config.syncFirst) {
    dispatchDeepLink(urls[0], true);
    syncUsed = true;
  }

  for (let round = 0; round < config.rounds; round += 1) {
    const roundStart = round * config.roundDelayMs;
    urls.forEach((url, index) => {
      if (syncUsed && round === 0 && index === 0) return;

      const delay = roundStart + index * config.staggerMs;
      window.setTimeout(() => {
        dispatchDeepLink(url, round === 0 && index === 0 && config.syncFirst);
      }, delay);
    });
  }
}

/** @deprecated 使用 openQQMusicControlBurst */
export function openQQMusicStaggeredDeepLinks(urls: string[]): void {
  openQQMusicControlBurst(urls, { rounds: 1, syncFirst: false });
}

export function openDeepLinks(urls: string[], options: OpenDeepLinkOptions = {}): boolean {
  if (urls.length === 0) return false;
  openDeepLink(urls[0], options);
  return true;
}

function buildWebFallback(platform: PlatformType, song: SongInfo): string {
  const query = encodeURIComponent(`${song.name} ${song.artist}`);
  switch (platform) {
    case "QQMusic":
      if (song.platformSongId) {
        return `https://y.qq.com/n/yqq/song/${song.platformSongId}.html`;
      }
      return `https://y.qq.com/n/yqq/song/search?w=${query}`;
    case "NetEaseMusic":
      if (song.platformSongId) {
        return `https://music.163.com/song?id=${song.platformSongId}`;
      }
      return `https://music.163.com/#/search/m/?s=${query}`;
    case "Spotify":
      if (song.platformSongId) {
        return `https://open.spotify.com/track/${song.platformSongId}`;
      }
      return `https://open.spotify.com/search/${query}`;
    case "AppleMusic":
      return `https://music.apple.com/search?term=${query}`;
    case "KugouMusic":
      return `https://www.kugou.com/yy/html/search.html#searchType=song&searchKeyWord=${query}`;
    case "YTMusic":
      return `https://music.youtube.com/search?q=${query}`;
  }
}

export function clientFallbackPlay(
  platform: PlatformType,
  song: SongInfo,
  urls: string[],
): { ok: boolean; playing: boolean } {
  if (urls.length > 0) {
    if (platform === "QQMusic" && isMobileQQMusicTarget()) {
      openQQMusicDeepLink(urls[0]);
    } else {
      openDeepLinks(urls);
    }
    return { ok: true, playing: true };
  }
  window.open(buildWebFallback(platform, song), "_blank", "noopener,noreferrer");
  return { ok: true, playing: false };
}
