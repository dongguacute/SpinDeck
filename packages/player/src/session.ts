import type { PlaybackStatus, SongInfo } from "./types";

export function songSessionKey(song: SongInfo): string {
  return `${song.platformSongId ?? song.name}:${song.platformNumericId ?? ""}`;
}

interface ArmSession {
  songKey: string;
  startedInSession: boolean;
  pausedByArm: boolean;
}

let pageSessionId = "";
let armSession: ArmSession = {
  songKey: "",
  startedInSession: false,
  pausedByArm: false,
};

export function getPageSessionId(): string {
  return pageSessionId;
}

export function beginPageSession(): string {
  pageSessionId = `${Date.now()}`;
  resetArmSession();
  return pageSessionId;
}

export function resetArmSession(): void {
  armSession = { songKey: "", startedInSession: false, pausedByArm: false };
}

export function markSongStarted(song: SongInfo): void {
  armSession.songKey = songSessionKey(song);
  armSession.startedInSession = true;
  armSession.pausedByArm = false;
}

export function markSongPausedByArm(song: SongInfo): void {
  if (armSession.songKey !== songSessionKey(song)) return;
  if (!armSession.startedInSession) return;
  armSession.pausedByArm = true;
}

export function canResumeSong(song: SongInfo): boolean {
  return (
    armSession.songKey === songSessionKey(song) &&
    armSession.startedInSession &&
    armSession.pausedByArm
  );
}

export function isSameSongInSession(song: SongInfo): boolean {
  return armSession.songKey === songSessionKey(song) && armSession.startedInSession;
}

/** 唱臂落下且未抬起：本地认为正在播放 */
export function isArmActivelyPlaying(): boolean {
  return armSession.startedInSession && !armSession.pausedByArm;
}

/** 唱臂抬起暂停：本地认为已暂停，可继续同一首 */
export function isArmPausedByUser(): boolean {
  return armSession.startedInSession && armSession.pausedByArm;
}

/** 无法查询系统播放器时，由页面会话推导播放状态 */
export function buildSessionPlaybackStatus(song: SongInfo): PlaybackStatus {
  const sameSongInSession = isSameSongInSession(song);
  const canResume = canResumeSong(song);
  const activelyPlaying = isArmActivelyPlaying() && sameSongInSession;

  if (activelyPlaying) {
    return {
      playing: true,
      paused: false,
      idle: false,
      sameSongInSession,
      canResume,
      currentSongName: song.name,
      currentArtistName: song.artist,
    };
  }

  if (canResume) {
    return {
      playing: false,
      paused: true,
      idle: false,
      sameSongInSession,
      canResume,
    };
  }

  return {
    playing: false,
    paused: true,
    idle: true,
    sameSongInSession,
    canResume,
  };
}
