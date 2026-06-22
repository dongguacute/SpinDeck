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
  QQ_MUSIC_PAUSE_SCRIPT,
  QQ_MUSIC_RESUME_SCRIPT,
} from "./control";
import { buildQQMusicMacPlayUrls } from "./urls";

export async function isQQMusicPlaying(exec: ExecFileAsync): Promise<boolean> {
  const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_IS_PLAYING_SCRIPT]);
  return String(stdout).trim() === "true";
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
  const { stdout } = await exec("osascript", ["-e", buildQQMusicSetPlayModeScript(mode)]);
  const applied = String(stdout).trim() === "ok";
  return {
    ok: true,
    playing: false,
    method: "set-play-mode",
    confirmed: applied,
  };
}

export async function playSongOnMac(
  song: SongInfo,
  exec: ExecFileAsync,
  playMode?: PlayMode,
): Promise<PlayResult> {
  if (song.platformNumericId == null) {
    return { ok: false, playing: false, error: "missing songid" };
  }

  if (playMode) {
    await setPlayModeOnMac(playMode, exec);
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

export async function pauseOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_PAUSE_SCRIPT]);
  const stopped = String(stdout).trim() === "paused";
  return { ok: true, playing: false, stopped };
}

export async function resumeOnMac(exec: ExecFileAsync): Promise<PlayResult> {
  const { stdout } = await exec("osascript", ["-e", QQ_MUSIC_RESUME_SCRIPT]);
  const resumed = String(stdout).trim() === "resumed";
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
