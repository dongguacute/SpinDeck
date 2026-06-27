import type {
  ExecFileAsync,
  PlayMode,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "../../../types";

export async function isKugouMusicPlaying(_exec: ExecFileAsync): Promise<boolean> {
  return false;
}

export async function waitForKugouMusicPlaying(_exec: ExecFileAsync): Promise<boolean> {
  return false;
}

export async function setPlayModeOnMac(
  _mode: PlayMode,
  _exec: ExecFileAsync,
): Promise<PlayResult> {
  return { ok: false, playing: false, error: "酷狗音乐对接层已移除" };
}

export async function playSongOnMac(
  _song: SongInfo,
  _exec: ExecFileAsync,
): Promise<PlayResult> {
  return { ok: false, playing: false, error: "酷狗音乐对接层已移除" };
}

export async function pauseOnMac(
  _exec: ExecFileAsync,
  _cancelOnly = false,
): Promise<PlayResult> {
  return { ok: false, playing: false, error: "酷狗音乐对接层已移除" };
}

export async function resumeOnMac(_exec: ExecFileAsync): Promise<PlayResult> {
  return { ok: false, playing: false, error: "酷狗音乐对接层已移除" };
}

export async function getStatusOnMac(_exec: ExecFileAsync): Promise<SystemPlaybackStatus> {
  return { playing: false, paused: false, idle: true };
}
