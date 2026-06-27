import type {
  ExecFileAsync,
  PlayMode,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "../../../types";
import {
  buildQQMusicSetPlayModeScript,
  PLAY_DETECT_INTERVAL_MS,
  PLAY_DETECT_TIMEOUT_MS,
  QQ_MUSIC_GET_INFO_SCRIPT,
  QQ_MUSIC_IS_PLAYING_SCRIPT,
  QQ_MUSIC_PAUSE_KEYBOARD_SCRIPT,
  QQ_MUSIC_PAUSE_SCRIPT,
  QQ_MUSIC_RESUME_SCRIPT,
} from "./control";
import { buildQQMusicMacPlayUrls } from "./urls";

export async function isQQMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  try {
    const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_IS_PLAYING_SCRIPT]);
    const result = String(stdout).trim();
    if (result.startsWith("error:")) {
      console.warn("[QQMusic] isPlaying AppleScript error:", result);
    }
    return result === "true";
  } catch (err) {
    console.warn("[QQMusic] isPlaying AppleScript failed:", err);
    return false;
  }
}

/**
 * 检测 osascript 是否拥有辅助功能权限。
 * 当 SpinDeck.app 缺少「辅助功能」权限时，AppleScript 控制其他应用 UI 会失败。
 * 这里通过一个最小化的菜单访问测试来检测权限。
 */
export async function checkAccessibility(exec: ExecFileAsync): Promise<boolean> {
  const probe = `
tell application "System Events"
  try
    tell process "Finder"
      set mb to menu bar items of menu bar 1
      return "ok"
    end tell
  on error err
    return "error:" & err
  end try
end tell
`;
  try {
    const { stdout } = await exec("osascript", ["-e", probe]);
    const result = String(stdout).trim();
    if (result.startsWith("error:")) {
      console.warn("[QQMusic] accessibility probe failed:", result);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[QQMusic] accessibility probe error:", err);
    return false;
  }
}

export async function waitForQQMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  if (await isQQMusicPlaying(exec)) return true;
  const polls = Math.ceil(PLAY_DETECT_TIMEOUT_MS / PLAY_DETECT_INTERVAL_MS);
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, PLAY_DETECT_INTERVAL_MS));
    if (await isQQMusicPlaying(exec)) return true;
  }
  return false;
}

export async function setPlayModeOnMac(
  mode: PlayMode,
  exec: ExecFileAsync,
): Promise<PlayResult> {
  try {
    const { stdout } = await exec("osascript", ["-e", buildQQMusicSetPlayModeScript(mode)]);
    const applied = String(stdout).trim() === "ok";
    return {
      ok: true,
      playing: false,
      method: "set-play-mode",
      confirmed: applied,
    };
  } catch (err) {
    console.warn("[QQMusic] setPlayMode AppleScript failed:", err);
    return {
      ok: true,
      playing: false,
      method: "set-play-mode",
      confirmed: false,
      error: err instanceof Error ? err.message : "set play mode failed",
    };
  }
}

export async function playSongOnMac(
  song: SongInfo,
  exec: ExecFileAsync,
): Promise<PlayResult> {
  if (song.platformNumericId == null) {
    return { ok: false, playing: false, error: "missing songid" };
  }

  const urls = buildQQMusicMacPlayUrls(song);
  if (!urls.length) {
    return { ok: false, playing: false, error: "无法构建播放链接" };
  }

  const url = urls[0];
  await exec("open", ["-g", url]);
  const confirmed = await waitForQQMusicPlaying(exec);

  return {
    ok: true,
    playing: true,
    confirmed,
    method: "playsong",
    url,
    songid: song.platformNumericId,
  };
}

export async function pauseOnMac(exec: ExecFileAsync, cancelOnly = false): Promise<PlayResult> {
  if (cancelOnly) {
    return { ok: true, playing: false, stopped: false, method: "cancel" };
  }

  // 暂停前先检查是否在播放：没播放时发暂停可能触发 toggle 变成播放
  const wasPlaying = await isQQMusicPlaying(exec);
  if (!wasPlaying) {
    return { ok: true, playing: false, stopped: false, method: "idle" };
  }

  let stopped = false;
  let pauseOutput = "";

  try {
    const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_PAUSE_SCRIPT]);
    pauseOutput = String(stdout).trim();
    stopped = pauseOutput === "paused";
  } catch (err) {
    console.warn("[QQMusic] pause AppleScript failed:", err);
  }

  const needsAccessibility =
    !stopped &&
    (pauseOutput.startsWith("error:") ||
      pauseOutput.toLowerCase().includes("assistive") ||
      pauseOutput.toLowerCase().includes("not allowed"));

  if (needsAccessibility) {
    return {
      ok: false,
      playing: false,
      stopped: false,
      method: "needs-accessibility",
      error: "macOS 辅助功能权限缺失，请在系统设置 > 隐私与安全性 > 辅助功能中授权 SpinDeck",
      needsAccessibility: true,
    };
  }

  // keyboard fallback 也只在确认在播放时才执行（空格键是 toggle，没播放时会触发播放）
  if (!stopped) {
    try {
      await exec("osascript", ["-e", QQ_MUSIC_PAUSE_KEYBOARD_SCRIPT]);
      const stillPlaying = await isQQMusicPlaying(exec);
      stopped = !stillPlaying;
    } catch (err) {
      console.warn("[QQMusic] pause keyboard fallback failed:", err);
    }
  }

  return { ok: true, playing: false, stopped, method: stopped ? "pause" : "idle" };
}

export async function resumeOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  let resumed = false;
  try {
    const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_RESUME_SCRIPT]);
    resumed = String(stdout).trim() === "resumed";
  } catch (err) {
    console.warn("[QQMusic] resume AppleScript failed:", err);
  }
  const alreadyPlaying = !resumed && (await waitForQQMusicPlaying(exec));
  const playing = resumed ? await waitForQQMusicPlaying(exec) : alreadyPlaying;

  return {
    ok: true,
    playing: playing || alreadyPlaying,
    confirmed: playing,
    resumed: true,
    method: "resume",
  };
}

export async function getStatusOnMac(exec: ExecFileAsync): Promise<SystemPlaybackStatus> {
  const playing = await isQQMusicPlaying(exec);
  let currentSongName: string | undefined;
  let currentArtistName: string | undefined;

  if (playing) {
    try {
      const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_GET_INFO_SCRIPT]);
      const info = String(stdout).trim();
      if (info !== "unknown" && info !== "idle" && info.includes(" - ")) {
        const parts = info.split(" - ");
        currentArtistName = parts[0].trim();
        currentSongName = parts[1].trim();
      } else if (info !== "unknown" && info !== "idle") {
        currentSongName = info;
      }
    } catch {
      // ignore
    }
  }

  return {
    playing,
    paused: !playing,
    idle: !playing,
    currentSongName,
    currentArtistName,
  };
}

export { buildQQMusicMacPlayUrls };
