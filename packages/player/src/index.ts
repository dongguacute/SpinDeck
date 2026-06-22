export type {
  DeviceOS,
  ExecFileAsync,
  PlatformType,
  PlayMode,
  PlaybackStatus,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "./types";

export { getDeviceOS } from "./device";
export {
  beginPageSession,
  canResumeSong,
  getPageSessionId,
  isSameSongInSession,
  markSongPausedByArm,
  markSongStarted,
  resetArmSession,
  songSessionKey,
} from "./session";
export { buildSongPlayUrls } from "./urls";

export {
  beginShelfSession,
  getPlaybackStatus,
  pauseSong,
  playSong,
  prelaunchApp,
  resumeSong,
  stopSong,
} from "./client/index";

export type { BeginShelfSessionOptions, PlayerApiConfig } from "./client/index";

export * as platforms from "./platforms/index";
