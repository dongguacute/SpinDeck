import type { PlayResult, SongInfo, SystemPlaybackStatus } from "../types";

/** Desktop (Tauri) bridge for macOS local playback control. */
export type DesktopBridge = {
  playSong: (input: {
    platform: string;
    song: SongInfo;
    fresh?: boolean;
  }) => Promise<PlayResult>;
  pauseSong: (input: {
    platform: string;
    cancelOnly?: boolean;
  }) => Promise<PlayResult>;
  resumeSong: (input: { platform: string }) => Promise<PlayResult>;
  playbackStatus: (input: {
    platform: string;
  }) => Promise<SystemPlaybackStatus>;
  setPlayMode: (input: {
    platform: string;
    mode: string;
  }) => Promise<PlayResult>;
};

let bridge: DesktopBridge | null = null;

export function setDesktopBridge(next: DesktopBridge | null): void {
  bridge = next;
}

export function getDesktopBridge(): DesktopBridge | null {
  return bridge;
}
