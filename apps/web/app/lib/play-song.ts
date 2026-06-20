import type { PlatformType, SongInfo } from "./types";
import {
  buildSongPlayUrls as buildSongPlayUrlsForOs,
  type DeviceOS,
} from "./play-song-urls";
import {
  beginPageSession,
  canResumeSong,
  getPageSessionId,
  markSongPausedByArm,
  markSongStarted,
  resetArmSession,
} from "./playback-session";

export type { DeviceOS };

export function getDeviceOS(): DeviceOS {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Mac OS X/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  return "linux";
}

interface LaunchConfig {
  scheme: string;
  webFallback: string;
  appName: string;
}

const LAUNCH_CONFIG: Record<PlatformType, LaunchConfig> = {
  QQMusic: {
    scheme: "qqmusicmac://",
    webFallback: "https://y.qq.com",
    appName: "QQ音乐",
  },
  NetEaseMusic: {
    scheme: "neteasecloudmusic://",
    webFallback: "https://music.163.com",
    appName: "网易云音乐",
  },
  KugouMusic: {
    scheme: "kugoumusic://",
    webFallback: "https://www.kugou.com",
    appName: "酷狗音乐",
  },
  AppleMusic: {
    scheme: "music://",
    webFallback: "https://music.apple.com",
    appName: "Apple Music",
  },
  Spotify: {
    scheme: "spotify://",
    webFallback: "https://open.spotify.com",
    appName: "Spotify",
  },
  YTMusic: {
    scheme: "",
    webFallback: "https://music.youtube.com",
    appName: "YouTube Music",
  },
};

/** 浏览器内唤起（备用） */
export function openDeepLink(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "display:none;width:0;height:0;border:0";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 1500);
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

let lastPlayAt = 0;
let lastPlayKey = "";

export interface PlayResult {
  ok: boolean;
  playing: boolean;
  confirmed?: boolean;
  skipped?: boolean;
  resumed?: boolean;
  error?: string;
}

export interface PlaybackStatus {
  playing: boolean;
  paused: boolean;
  idle: boolean;
  sameSongInSession: boolean;
  canResume: boolean;
}

/** 进入书架页：中断系统播放并重置会话（再次落针从头播） */
export async function beginShelfSession(platform: PlatformType): Promise<string> {
  beginPageSession();
  await pauseSong(platform);
  return getPageSessionId();
}

export {
  getPageSessionId,
  canResumeSong,
  isSameSongInSession,
  markSongStarted,
  markSongPausedByArm,
} from "./playback-session";

function clientFallbackPlay(platform: PlatformType, song: SongInfo): PlayResult {
  const urls = buildSongPlayUrlsForOs(platform, song, getDeviceOS());
  if (urls.length > 0) {
    openDeepLink(urls[0]);
    return { ok: true, playing: false };
  }
  window.open(buildWebFallback(platform, song), "_blank", "noopener,noreferrer");
  return { ok: true, playing: false };
}

/** 查询系统播放状态 + 页面会话 */
export async function getPlaybackStatus(
  platform: PlatformType,
  song: SongInfo,
): Promise<PlaybackStatus> {
  if (getDeviceOS() !== "macos" || platform !== "QQMusic") {
    return {
      playing: false,
      paused: true,
      idle: true,
      sameSongInSession: false,
      canResume: canResumeSong(song),
    };
  }

  try {
    const res = await fetch("/api/playback-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, song }),
    });
    if (!res.ok) throw new Error("status failed");
    return (await res.json()) as PlaybackStatus;
  } catch {
    return {
      playing: false,
      paused: true,
      idle: true,
      sameSongInSession: false,
      canResume: canResumeSong(song),
    };
  }
}

/** 继续播放（抬臂后再落针，同一页面会话） */
export async function resumeSong(platform: PlatformType): Promise<PlayResult> {
  if (getDeviceOS() !== "macos" || platform !== "QQMusic") {
    return { ok: false, playing: false, error: "unsupported" };
  }

  try {
    const res = await fetch("/api/resume-song", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const data = (await res.json()) as PlayResult & { ok?: boolean };
    if (res.ok && data.ok) {
      console.log(`[Resume] playing=${data.playing} confirmed=${data.confirmed ?? "?"}`);
      return {
        ok: true,
        playing: Boolean(data.playing),
        confirmed: data.confirmed,
        resumed: true,
      };
    }
    return { ok: false, playing: false, error: "resume failed" };
  } catch {
    return { ok: false, playing: false, error: "network error" };
  }
}

/** 从头播放（发送 songid URL） */
export async function playSong(
  platform: PlatformType,
  song: SongInfo,
): Promise<PlayResult> {
  const key = `${platform}:${song.platformSongId ?? song.name}:${song.platformNumericId ?? ""}`;
  const now = Date.now();
  if (key === lastPlayKey && now - lastPlayAt < 2500) {
    console.log(`[Play] skipped duplicate within 2.5s — ${song.name}`);
    return { ok: true, playing: true, skipped: true };
  }
  lastPlayKey = key;
  lastPlayAt = now;

  const urls = buildSongPlayUrlsForOs(platform, song, getDeviceOS());
  console.log(
    `[Play] fresh ${song.name} — ${platform} (${getDeviceOS()})`,
    urls[0] ?? "(fallback web)",
    song.platformNumericId ? `id=${song.platformNumericId}` : "",
  );

  if (getDeviceOS() === "macos" && platform === "QQMusic") {
    if (song.platformNumericId == null) {
      console.warn(`[Play] 缺少 songid — ${song.name}`);
      return { ok: false, playing: false, error: "missing songid" };
    }
    try {
      const res = await fetch("/api/play-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, song, fresh: true }),
      });
      const data = (await res.json()) as PlayResult & { ok?: boolean; method?: string; url?: string };
      if (res.ok && data.ok) {
        console.log(
          `[Play] server ok — playing=${data.playing} confirmed=${data.confirmed ?? "?"} method=${data.method ?? "?"}`,
        );
        return {
          ok: true,
          playing: Boolean(data.playing),
          confirmed: data.confirmed,
        };
      }
      return { ok: false, playing: false, error: "play failed" };
    } catch {
      return { ok: false, playing: false, error: "network error" };
    }
  }

  if (getDeviceOS() === "macos" && urls.length > 0) {
    try {
      const res = await fetch("/api/play-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, song, fresh: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as { playing?: boolean };
        return { ok: true, playing: Boolean(data.playing) };
      }
    } catch {
      // fall through
    }
  }

  return clientFallbackPlay(platform, song);
}

/** 暂停（保留页面会话，供同页抬臂后再继续） */
export async function pauseSong(platform: PlatformType): Promise<void> {
  lastPlayKey = "";
  lastPlayAt = 0;

  if (getDeviceOS() !== "macos" || platform !== "QQMusic") return;

  try {
    await fetch("/api/stop-song", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
  } catch (err) {
    console.warn("[Pause] failed:", err);
  }
}

/** 离开页面：暂停并重置会话 */
export async function stopSong(platform: PlatformType): Promise<void> {
  resetArmSession();
  await pauseSong(platform);
}

/** 预启动本地音乐客户端 */
export function prelaunchApp(platform: PlatformType): void {
  const config = LAUNCH_CONFIG[platform];
  const deviceOS = getDeviceOS();
  console.log(`[Prelaunch] Platform: ${platform}, OS: ${deviceOS}`);

  if (!config.scheme) {
    window.open(config.webFallback, "_blank", "noopener,noreferrer");
    return;
  }

  let hasFallenBack = false;
  let appLaunched = false;

  const fallbackToWeb = (reason: string) => {
    if (hasFallenBack) return;
    hasFallenBack = true;
    clearTimeout(fallbackTimer);
    window.removeEventListener("blur", handleBlur);
    console.log(`[Prelaunch] Fallback to web (${reason})`);
    window.open(config.webFallback, "_blank", "noopener,noreferrer");
  };

  const handleBlur = () => {
    appLaunched = true;
  };

  window.addEventListener("blur", handleBlur);

  try {
    openDeepLink(config.scheme);
  } catch (e) {
    console.warn("[Prelaunch] Direct launch failed:", e);
    fallbackToWeb("exception thrown");
    return;
  }

  const fallbackTimer = setTimeout(() => {
    window.removeEventListener("blur", handleBlur);
    if (!appLaunched && !hasFallenBack) {
      fallbackToWeb("app not detected");
    }
  }, 700);
}

export function buildSongPlayUrls(
  platform: PlatformType,
  song: SongInfo,
  os: DeviceOS = getDeviceOS(),
): string[] {
  return buildSongPlayUrlsForOs(platform, song, os);
}
