export type PlatformType =
  | "QQMusic"
  | "NetEaseMusic"
  | "KugouMusic"
  | "AppleMusic"
  | "Spotify"
  | "YTMusic";

export type DeviceOS = "macos" | "windows" | "linux" | "android" | "ios";

/** 本地客户端播放模式（Mac QQ 音乐菜单项） */
export type PlayMode = "single" | "list" | "random" | "order";

/** 单首歌曲信息 */
export interface SongInfo {
  name: string;
  artist: string;
  cover: string;
  album: string;
  /** 平台内歌曲 ID（如 QQ 音乐 songmid），用于 deep link 播放 */
  platformSongId?: string;
  /** QQ 音乐 numeric songid */
  platformNumericId?: number;
  /** QQ 音乐 songtype，默认 0 */
  platformSongType?: number;
  /** 歌曲时长（秒） */
  duration?: number;
}

export interface PlayResult {
  ok: boolean;
  playing: boolean;
  confirmed?: boolean;
  skipped?: boolean;
  resumed?: boolean;
  error?: string;
  method?: string;
  url?: string;
  songid?: number;
  stopped?: boolean;
}

export interface SystemPlaybackStatus {
  playing: boolean;
  paused: boolean;
  idle: boolean;
  /** 当前播放的歌曲名（如果能获取到） */
  currentSongName?: string;
  /** 当前播放的歌手名（如果能获取到） */
  currentArtistName?: string;
}

export interface PlaybackStatus extends SystemPlaybackStatus {
  sameSongInSession: boolean;
  canResume: boolean;
}

export type ExecFileAsync = (
  file: string,
  args: string[],
) => Promise<{ stdout: string | Buffer }>;
