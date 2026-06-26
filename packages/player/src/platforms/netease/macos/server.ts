import type {
  ExecFileAsync,
  PlayMode,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "../../../types";
import {
  buildNeteaseMusicSetPlayModeScript,
  PLAY_DETECT_INTERVAL_MS,
  PLAY_DETECT_TIMEOUT_MS,
  NETEASE_MUSIC_GET_INFO_SCRIPT,
  NETEASE_MUSIC_IS_PLAYING_SCRIPT,
  NETEASE_MUSIC_PAUSE_SCRIPT,
  NETEASE_MUSIC_RESUME_SCRIPT,
} from "./control";
import { buildNetEasePlayUrls } from "../urls";

export async function isNeteaseMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  const { stdout } = await exec("osascript", ["-e", NETEASE_MUSIC_IS_PLAYING_SCRIPT]);
  return String(stdout).trim() === "true";
}

export async function waitForNeteaseMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  if (await isNeteaseMusicPlaying(exec)) return true;
  const polls = Math.ceil(PLAY_DETECT_TIMEOUT_MS / PLAY_DETECT_INTERVAL_MS);
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, PLAY_DETECT_INTERVAL_MS));
    if (await isNeteaseMusicPlaying(exec)) return true;
  }
  return false;
}

export async function setPlayModeOnMac(
  mode: PlayMode,
  exec: ExecFileAsync,
): Promise<PlayResult> {
  try {
    const { stdout } = await exec("osascript", ["-e", buildNeteaseMusicSetPlayModeScript(mode)]);
    const applied = String(stdout).trim() === "ok";
    return {
      ok: true,
      playing: false,
      method: "set-play-mode",
      confirmed: applied,
    };
  } catch (err) {
    console.warn("[NeteaseMusic] setPlayMode AppleScript failed:", err);
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
  // 统一使用 platformNumericId 校验，与 QQ 音乐保持一致
  if (song.platformNumericId == null) {
    return { ok: false, playing: false, error: "missing songid" };
  }

  const urls = buildNetEasePlayUrls(song, "macos");
  if (!urls.length) {
    return { ok: false, playing: false, error: "无法构建播放链接" };
  }

  const url = urls[0];
  
  // 1. 使用 open 直接打开 URL，显式指定 bundle id 以确保唤起
  // 增加 -g 参数，确保在后台打开，不抢占前台焦点
  await exec("open", ["-g", "-b", "com.netease.163music", url]);
  
  // 2. 移除所有模拟按键操作，仅等待应用响应
  await new Promise((r) => setTimeout(r, 1000));
  
  const confirmed = await waitForNeteaseMusicPlaying(exec);

  return {
    ok: true,
    playing: confirmed,
    confirmed,
    method: "playsong",
    url,
    songid: song.platformNumericId,
  };
}

export async function pauseOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  const { stdout } = await exec("osascript", ["-e", NETEASE_MUSIC_PAUSE_SCRIPT]);
  const stopped = String(stdout).trim() === "paused";
  return { ok: true, playing: false, stopped };
}

export async function resumeOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  const { stdout } = await exec("osascript", ["-e", NETEASE_MUSIC_RESUME_SCRIPT]);
  const resumed = String(stdout).trim() === "resumed";
  const alreadyPlaying = !resumed && (await waitForNeteaseMusicPlaying(exec));
  const playing = resumed ? await waitForNeteaseMusicPlaying(exec) : alreadyPlaying;

  return {
    ok: true,
    playing: playing || alreadyPlaying,
    confirmed: playing,
    resumed: true,
    method: "resume",
  };
}

export async function getStatusOnMac(exec: ExecFileAsync): Promise<SystemPlaybackStatus> {
  const playing = await isNeteaseMusicPlaying(exec);
  let currentSongName: string | undefined;
  let currentArtistName: string | undefined;

  if (playing) {
    try {
      const { stdout } = await exec("osascript", ["-e", NETEASE_MUSIC_GET_INFO_SCRIPT]);
      const info = String(stdout).trim();
      if (info !== "unknown" && info !== "idle" && info.includes(" - ")) {
        const parts = info.split(" - ");
        // 网易云通常是 "歌曲 - 歌手" 或者 "歌手 - 歌曲"
        // 这里假设是 "歌曲 - 歌手" (与 QQ 音乐相反？需要确认)
        // 实际上网易云 Mac 版窗口标题通常是 "歌曲名 - 歌手名"
        currentSongName = parts[0].trim();
        currentArtistName = parts[1].trim();
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
