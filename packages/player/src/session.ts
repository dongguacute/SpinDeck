import type { SongInfo } from "./types";

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
