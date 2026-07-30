import type { PlayResult, SystemPlaybackStatus } from "@spindeck/player";
import { setDesktopBridge } from "@spindeck/player";
import { isTauri } from "./is-tauri";

/** Wire @spindeck/player to Tauri invoke commands (desktop only). */
export async function bootstrapDesktopBridge(): Promise<void> {
  if (!isTauri()) {
    setDesktopBridge(null);
    return;
  }

  const { invoke } = await import("@tauri-apps/api/core");

  setDesktopBridge({
    playSong: (input) =>
      invoke<PlayResult>("play_song", {
        platform: input.platform,
        song: input.song,
        fresh: input.fresh ?? null,
      }),
    pauseSong: (input) =>
      invoke<PlayResult>("pause_song", {
        platform: input.platform,
        cancelOnly: input.cancelOnly ?? null,
      }),
    resumeSong: (input) =>
      invoke<PlayResult>("resume_song", {
        platform: input.platform,
      }),
    playbackStatus: (input) =>
      invoke<SystemPlaybackStatus>("playback_status", {
        platform: input.platform,
      }),
    setPlayMode: (input) =>
      invoke<PlayResult>("set_play_mode", {
        platform: input.platform,
        mode: input.mode,
      }),
  });
}
