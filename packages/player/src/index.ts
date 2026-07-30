export type {
  DeviceOS,
  PlatformType,
  PlayMode,
  PlaybackStatus,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "./types";

export { getDeviceOS, setNativeDeviceOS } from "./device";
export { setAppUrlOpener, setExternalUrlOpener } from "./client/url-open";
export { setAccessibilityMissingHandler } from "./client/accessibility";
export {
  beginPageSession,
  canResumeSong,
  getPageSessionId,
  isArmActivelyPlaying,
  isArmPausedByUser,
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
  prepareSongSwitch,
  resumeSong,
  stopSong,
  setDesktopBridge,
  getDesktopBridge,
} from "./client/index";

export type {
  PauseSongOptions,
  BeginShelfSessionOptions,
  PlayerApiConfig,
  DesktopBridge,
} from "./client/index";

export * as platforms from "./platforms/index";
