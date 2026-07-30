import { getDeviceOS } from "../device";
import {
  beginPageSession,
  buildSessionPlaybackStatus,
  canResumeSong,
  getPageSessionId,
  isArmActivelyPlaying,
  isSameSongInSession,
  markSongPausedByArm,
  markSongStarted,
  resetArmSession,
} from "../session";
import type { DeviceOS, PlatformType, PlayMode, PlayResult, PlaybackStatus, SongInfo } from "../types";
import { buildSongPlayUrls } from "../urls";
import {
  buildQQMusicAndroidPauseUrls,
  buildQQMusicAndroidResumeUrls,
  buildQQMusicClientPauseUrls,
  buildQQMusicClientResumeUrls,
} from "../platforms/qqmusic/urls";
import { pickQQMusicMobilePauseUrl } from "../platforms/qqmusic/client/urls";
import {
  clientFallbackPlay,
  openDeepLink,
  openQQMusicControlBurst,
  openQQMusicDeepLink,
} from "./deep-link";
import { prelaunchApp } from "./prelaunch";
import { dispatchAccessibilityMissing } from "./accessibility";
import { getDesktopBridge } from "./desktop-bridge";

export type { DesktopBridge } from "./desktop-bridge";
export { setDesktopBridge, getDesktopBridge } from "./desktop-bridge";

/** @deprecated Prefer setDesktopBridge — kept for call-site compatibility. */
export interface PlayerApiConfig {
  playUrl?: string;
  pauseUrl?: string;
  resumeUrl?: string;
  statusUrl?: string;
  setPlayModeUrl?: string;
}

/** QQ 固定单曲循环，列表循环由 SpinDeck 计时到点后切歌 */
const SHELF_QQ_PLAY_MODE: PlayMode = "single";

let lastPlayAt = 0;
let lastPlayKey = "";

function usesMacServer(platform: PlatformType): boolean {
  return (
    getDeviceOS() === "macos" &&
    (platform === "QQMusic" || platform === "NetEaseMusic" || platform === "KugouMusic")
  );
}

function isMobileOS(os: DeviceOS = getDeviceOS()): boolean {
  return os === "ios" || os === "android";
}

function isDesktopClientOS(os: DeviceOS = getDeviceOS()): boolean {
  return os === "windows" || os === "linux";
}

/** QQ 音乐：通过 deep link 唤起的非 Mac 客户端（iOS / Android / Windows / Linux） */
function usesQQMusicClientDeepLink(platform: PlatformType, os: DeviceOS = getDeviceOS()): boolean {
  return platform === "QQMusic" && (isMobileOS(os) || isDesktopClientOS(os));
}

function hasQQMusicPlayId(song: SongInfo): boolean {
  return Boolean(song.platformSongId?.trim()) || song.platformNumericId != null;
}

export interface PauseSongOptions {
  /** 抬臂/点击等用户手势触发，Android 同步发首条 pause 提高命中率 */
  fromUserGesture?: boolean;
}

/** 暂停 QQ 音乐：Android 多轮 burst，手势内同步首条 */
function pauseQQMusicRemote(options?: PauseSongOptions): void {
  if (!isArmActivelyPlaying()) return;

  const os = getDeviceOS();
  if (os === "android") {
    openQQMusicControlBurst(buildQQMusicAndroidPauseUrls(), {
      syncFirst: options?.fromUserGesture ?? false,
      rounds: options?.fromUserGesture ? 3 : 2,
      roundDelayMs: 480,
    });
    return;
  }

  const url = isMobileOS(os) ? pickQQMusicMobilePauseUrl() : buildQQMusicClientPauseUrls()[0];
  if (!url) return;
  void openQQMusicDeepLink(url);
}

export interface BeginShelfSessionOptions {
  api?: PlayerApiConfig;
}

async function syncQQPlayMode(platform: PlatformType, mode: PlayMode): Promise<void> {
  if (!usesMacServer(platform)) return;
  const bridge = getDesktopBridge();
  if (!bridge) return;
  try {
    await bridge.setPlayMode({ platform, mode });
  } catch {
    // 非关键路径
  }
}

/** 进入书架页：暂停、设为单曲循环并重置页面会话 */
export async function beginShelfSession(
  platform: PlatformType,
  _options?: BeginShelfSessionOptions,
): Promise<string> {
  beginPageSession();
  await pauseSong(platform);
  await syncQQPlayMode(platform, SHELF_QQ_PLAY_MODE);
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
  _api?: PlayerApiConfig,
): Promise<PlaybackStatus> {
  if (!usesMacServer(platform)) {
    return buildSessionPlaybackStatus(song);
  }

  const sessionFallback: PlaybackStatus = buildSessionPlaybackStatus(song);
  const bridge = getDesktopBridge();
  if (!bridge) return sessionFallback;

  try {
    const system = await bridge.playbackStatus({ platform });
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
  _api?: PlayerApiConfig,
): Promise<PlayResult> {
  if (usesQQMusicClientDeepLink(platform)) {
    const os = getDeviceOS();
    const urls =
      os === "android"
        ? buildQQMusicAndroidResumeUrls()
        : buildQQMusicClientResumeUrls(os);

    if (urls[0]) {
      if (isMobileOS(os)) {
        if (os === "android") {
          openQQMusicControlBurst(urls, { rounds: 2, syncFirst: false });
        } else {
          await openQQMusicDeepLink(urls[0]);
        }
      } else {
        await openDeepLink(urls[0]);
      }
    }
    return { ok: true, playing: true, resumed: true };
  }

  if (!usesMacServer(platform)) {
    return { ok: false, playing: false, error: "unsupported" };
  }

  const bridge = getDesktopBridge();
  if (!bridge) {
    return { ok: false, playing: false, error: "desktop bridge unavailable" };
  }

  try {
    const data = await bridge.resumeSong({ platform });
    if (data.ok) {
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
    return { ok: false, playing: false, error: "invoke error" };
  }
}

/** 从头播放（发送 songid URL） */
export async function playSong(
  platform: PlatformType,
  song: SongInfo,
  _api?: PlayerApiConfig,
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
    const hasRequiredId =
      platform === "KugouMusic" ? song.platformSongId != null : song.platformNumericId != null;

    if (!hasRequiredId) {
      console.warn(`[Play] 缺少必要的 ID — ${song.name} (platform: ${platform})`);
      return { ok: false, playing: false, error: "missing required id" };
    }

    const bridge = getDesktopBridge();
    if (!bridge) {
      return { ok: false, playing: false, error: "desktop bridge unavailable" };
    }

    try {
      const data = await bridge.playSong({ platform, song, fresh: true });
      if (data.ok) {
        console.log(
          `[Play] desktop ok — playing=${data.playing} confirmed=${data.confirmed ?? "?"} method=${data.method ?? "?"}`,
        );
        return {
          ok: true,
          playing: Boolean(data.playing),
          confirmed: data.confirmed,
        };
      }
      return { ok: false, playing: false, error: "play failed" };
    } catch {
      return { ok: false, playing: false, error: "invoke error" };
    }
  }

  if (usesQQMusicClientDeepLink(platform, os)) {
    if (!hasQQMusicPlayId(song)) {
      console.warn(`[Play] 缺少 songmid/songid — ${song.name}`);
      return { ok: false, playing: false, error: "missing required id" };
    }
    return await clientFallbackPlay(platform, song, urls);
  }

  if (os === "macos") {
    const bridge = getDesktopBridge();
    if (bridge) {
      try {
        const data = await bridge.playSong({ platform, song, fresh: true });
        if (data.ok) {
          return { ok: true, playing: Boolean(data.playing) };
        }
      } catch {
        // fall through
      }
    }
  }

  return await clientFallbackPlay(platform, song, urls);
}

/** 切歌前：取消进行中的播放；仅在本地认为「正在播」时才 toggle 暂停 */
export async function prepareSongSwitch(
  platform: PlatformType,
  _api?: PlayerApiConfig,
): Promise<void> {
  lastPlayKey = "";
  lastPlayAt = 0;
  const wasActivelyPlaying = isArmActivelyPlaying();
  const cancelOnly = !wasActivelyPlaying;
  resetArmSession();

  if (usesQQMusicClientDeepLink(platform) && wasActivelyPlaying) {
    pauseQQMusicRemote();
    return;
  }

  if (!usesMacServer(platform)) return;

  const bridge = getDesktopBridge();
  if (!bridge) return;

  try {
    await bridge.pauseSong({ platform, cancelOnly });
  } catch (err) {
    console.warn("[PrepareSwitch] failed:", err);
  }
}

/** 暂停（保留页面会话，供同页抬臂后再继续） */
export async function pauseSong(
  platform: PlatformType,
  _api?: PlayerApiConfig,
  options?: PauseSongOptions,
): Promise<void> {
  lastPlayKey = "";
  lastPlayAt = 0;

  if (usesQQMusicClientDeepLink(platform)) {
    pauseQQMusicRemote(options);
    return;
  }

  if (!usesMacServer(platform)) return;

  const bridge = getDesktopBridge();
  if (!bridge) return;

  try {
    const data = await bridge.pauseSong({ platform });
    if (data.needsAccessibility) {
      console.warn("[Pause] macOS accessibility permission missing");
      void dispatchAccessibilityMissing();
    }
  } catch (err) {
    console.warn("[Pause] failed:", err);
  }
}

/** 离开页面：暂停并重置会话 */
export async function stopSong(
  platform: PlatformType,
  api?: PlayerApiConfig,
): Promise<void> {
  const wasActivelyPlaying = isArmActivelyPlaying();
  resetArmSession();
  if (usesQQMusicClientDeepLink(platform)) {
    if (wasActivelyPlaying) pauseQQMusicRemote();
    return;
  }
  if (!usesMacServer(platform)) return;
  // 已抬臂暂停时勿再发暂停，避免 QQ 音乐等客户端 toggle 成播放
  if (wasActivelyPlaying) {
    await pauseSong(platform, api);
  }
}

export { prelaunchApp, getDeviceOS, buildSongPlayUrls };
