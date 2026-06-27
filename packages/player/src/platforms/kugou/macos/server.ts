import type {
  ExecFileAsync,
  PlayMode,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "../../../types";
import {
  buildKugouMusicSetPlayModeScript,
  PLAY_DETECT_INTERVAL_MS,
  PLAY_DETECT_TIMEOUT_MS,
  KUGOU_MUSIC_GET_INFO_SCRIPT,
  KUGOU_MUSIC_IS_PLAYING_SCRIPT,
  KUGOU_MUSIC_PAUSE_SCRIPT,
  KUGOU_MUSIC_RESUME_SCRIPT,
} from "./control";
import { buildKugouPlayUrls } from "../urls";

export async function isKugouMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  const { stdout } = await exec("osascript", ["-e", KUGOU_MUSIC_IS_PLAYING_SCRIPT]);
  return String(stdout).trim() === "true";
}

export async function waitForKugouMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  if (await isKugouMusicPlaying(exec)) return true;
  const polls = Math.ceil(PLAY_DETECT_TIMEOUT_MS / PLAY_DETECT_INTERVAL_MS);
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, PLAY_DETECT_INTERVAL_MS));
    if (await isKugouMusicPlaying(exec)) return true;
  }
  return false;
}

export async function setPlayModeOnMac(
  mode: PlayMode,
  exec: ExecFileAsync,
): Promise<PlayResult> {
  try {
    const { stdout } = await exec("osascript", ["-e", buildKugouMusicSetPlayModeScript(mode)]);
    const applied = String(stdout).trim() === "ok";
    return {
      ok: true,
      playing: false,
      method: "set-play-mode",
      confirmed: applied,
    };
  } catch (err) {
    console.warn("[KugouMusic] setPlayMode AppleScript failed:", err);
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
  if (song.platformSongId == null) {
    return { ok: false, playing: false, error: "missing songid" };
  }

  const urls = buildKugouPlayUrls(song, "macos");
  if (!urls.length) {
    return { ok: false, playing: false, error: "无法构建播放链接" };
  }

  const url = urls[0];
  
  // 使用 open 直接打开 URL，显式指定 bundle id 以确保唤起
  await exec("open", ["-g", "-b", "com.kugou.mac.Music", url]);
  
  await new Promise((r) => setTimeout(r, 1000));
  
  const confirmed = await waitForKugouMusicPlaying(exec);

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
  const { stdout } = await exec("osascript", ["-e", KUGOU_MUSIC_PAUSE_SCRIPT]);
  const stopped = String(stdout).trim() === "paused";
  return { ok: true, playing: false, stopped };
}

export async function resumeOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  const { stdout } = await exec("osascript", ["-e", KUGOU_MUSIC_RESUME_SCRIPT]);
  const resumed = String(stdout).trim() === "resumed";
  const alreadyPlaying = !resumed && (await waitForKugouMusicPlaying(exec));
  const playing = resumed ? await waitForKugouMusicPlaying(exec) : alreadyPlaying;

  return {
    ok: true,
    playing: playing || alreadyPlaying,
    confirmed: playing,
    resumed: true,
    method: "resume",
  };
}

export async function getStatusOnMac(exec: ExecFileAsync): Promise<SystemPlaybackStatus> {
  const playing = await isKugouMusicPlaying(exec);
  let currentSongName: string | undefined;
  let currentArtistName: string | undefined;

  if (playing) {
    try {
      const { stdout } = await exec("osascript", ["-e", KUGOU_MUSIC_GET_INFO_SCRIPT]);
      const info = String(stdout).trim();
      if (info !== "unknown" && info !== "idle" && info.includes(" - ")) {
        const parts = info.split(" - ");
        // 酷狗 Mac 版窗口标题通常是 "歌曲名 - 歌手名"
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
