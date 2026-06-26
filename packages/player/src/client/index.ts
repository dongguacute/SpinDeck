import { getDeviceOS } from "../device";
import {
  beginPageSession,
  canResumeSong,
  getPageSessionId,
  isSameSongInSession,
  markSongPausedByArm,
  markSongStarted,
  resetArmSession,
} from "../session";
import type { PlatformType, PlayMode, PlayResult, PlaybackStatus, SongInfo } from "../types";
import { buildSongPlayUrls } from "../urls";
import { clientFallbackPlay } from "./deep-link";
import { prelaunchApp } from "./prelaunch";

export interface PlayerApiConfig {
  playUrl?: string;
  pauseUrl?: string;
  resumeUrl?: string;
  statusUrl?: string;
  setPlayModeUrl?: string;
}

const DEFAULT_API: Required<PlayerApiConfig> = {
  playUrl: "/api/play-song",
  pauseUrl: "/api/stop-song",
  resumeUrl: "/api/resume-song",
  statusUrl: "/api/playback-status",
  setPlayModeUrl: "/api/set-play-mode",
};

/** QQ 固定单曲循环，列表循环由 SpinDeck 计时到点后切歌 */
const SHELF_QQ_PLAY_MODE: PlayMode = "single";

let lastPlayAt = 0;
let lastPlayKey = "";

function usesMacServer(platform: PlatformType): boolean {
  return (
    getDeviceOS() === "macos" &&
    (platform === "QQMusic" || platform === "NetEaseMusic")
  );
}

export interface BeginShelfSessionOptions {
  api?: PlayerApiConfig;
}

async function syncQQPlayMode(
  platform: PlatformType,
  mode: PlayMode,
  api: PlayerApiConfig,
): Promise<void> {
  if (!usesMacServer(platform)) return;
  try {
    await fetch(api.setPlayModeUrl ?? DEFAULT_API.setPlayModeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, mode }),
    });
  } catch {
    // 非关键路径
  }
}

/** 进入书架页：暂停、设为单曲循环并重置页面会话 */
export async function beginShelfSession(
  platform: PlatformType,
  options?: BeginShelfSessionOptions,
): Promise<string> {
  const api = { ...DEFAULT_API, ...options?.api };
  beginPageSession();
  await pauseSong(platform, api);
  await syncQQPlayMode(platform, SHELF_QQ_PLAY_MODE, api);
  return getPageSessionId();
}

export {
  getPageSessionId,
  canResumeSong,
  isSameSongInSession,
  markSongStarted,
  markSongPausedByArm,
};

/** 查询系统播放状态 + 页面会话 */
export async function getPlaybackStatus(
  platform: PlatformType,
  song: SongInfo,
  api: PlayerApiConfig = DEFAULT_API,
): Promise<PlaybackStatus> {
  const sessionFallback: PlaybackStatus = {
    playing: false,
    paused: true,
    idle: true,
    sameSongInSession: isSameSongInSession(song),
    canResume: canResumeSong(song),
  };

  if (!usesMacServer(platform)) {
    return sessionFallback;
  }

  try {
    const res = await fetch(api.statusUrl ?? DEFAULT_API.statusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, song }),
    });
    if (!res.ok) throw new Error("status failed");
    const system = (await res.json()) as Omit<PlaybackStatus, "sameSongInSession" | "canResume">;
    return {
      ...system,
      sameSongInSession: isSameSongInSession(song),
      canResume: canResumeSong(song),
    };
  } catch {
    return sessionFallback;
  }
}

/** 继续播放（抬臂后再落针，同一页面会话） */
export async function resumeSong(
  platform: PlatformType,
  api: PlayerApiConfig = DEFAULT_API,
): Promise<PlayResult> {
  if (!usesMacServer(platform)) {
    return { ok: false, playing: false, error: "unsupported" };
  }

  try {
    const res = await fetch(api.resumeUrl ?? DEFAULT_API.resumeUrl, {
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
  api: PlayerApiConfig = DEFAULT_API,
): Promise<PlayResult> {
  const key = `${platform}:${song.platformSongId ?? song.name}:${song.platformNumericId ?? ""}`;
  const now = Date.now();
  if (key === lastPlayKey && now - lastPlayAt < 2500) {
    console.log(`[Play] skipped duplicate within 2.5s — ${song.name}`);
    return { ok: true, playing: true, skipped: true };
  }
  lastPlayKey = key;
  lastPlayAt = now;

  const os = getDeviceOS();
  const urls = buildSongPlayUrls(platform, song, os);
  console.log(
    `[Play] fresh ${song.name} — ${platform} (${os})`,
    urls[0] ?? "(fallback web)",
    song.platformNumericId ? `id=${song.platformNumericId}` : "",
  );

  if (usesMacServer(platform)) {
    if (song.platformNumericId == null) {
      console.warn(`[Play] 缺少 songid — ${song.name}`);
      return { ok: false, playing: false, error: "missing songid" };
    }
    try {
      const res = await fetch(api.playUrl ?? DEFAULT_API.playUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, song, fresh: true }),
      });
      const data = (await res.json()) as PlayResult & { ok?: boolean };
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

  if (os === "macos" && urls.length > 0) {
    try {
      const res = await fetch(api.playUrl ?? DEFAULT_API.playUrl, {
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

  return clientFallbackPlay(platform, song, urls);
}

/** 暂停（保留页面会话，供同页抬臂后再继续） */
export async function pauseSong(
  platform: PlatformType,
  api: PlayerApiConfig = DEFAULT_API,
): Promise<void> {
  lastPlayKey = "";
  lastPlayAt = 0;

  if (!usesMacServer(platform)) return;

  try {
    await fetch(api.pauseUrl ?? DEFAULT_API.pauseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
  } catch (err) {
    console.warn("[Pause] failed:", err);
  }
}

/** 离开页面：暂停并重置会话 */
export async function stopSong(
  platform: PlatformType,
  api: PlayerApiConfig = DEFAULT_API,
): Promise<void> {
  resetArmSession();
  await pauseSong(platform, api);
}

export { prelaunchApp, getDeviceOS, buildSongPlayUrls };
