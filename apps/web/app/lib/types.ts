export type PlatformType =
  | "QQMusic"
  | "NetEaseMusic"
  | "KugouMusic"
  | "AppleMusic"
  | "Spotify"
  | "YTMusic";

/** 单首歌曲信息 */
export interface SongInfo {
  name: string;
  artist: string;
  cover: string;
  album: string;
}

export interface Playlist {
  id: string;
  name: string;
  platform: PlatformType;
  coverUrl: string;
  songCount: number;
  importUrl: string;
  createdAt: number;
}

export const PLATFORM_CONFIG: Record<
  PlatformType,
  { label: string; color: string; bg: string }
> = {
  QQMusic:     { label: "QQ音乐",   color: "#31C27C", bg: "rgba(49,194,124,0.15)" },
  NetEaseMusic:{ label: "网易云音乐", color: "#EC4141", bg: "rgba(236,65,65,0.15)" },
  KugouMusic:  { label: "酷狗音乐",  color: "#2D8CF0", bg: "rgba(45,140,240,0.15)" },
  AppleMusic:  { label: "Apple Music", color: "#FA586A", bg: "rgba(250,88,106,0.15)" },
  Spotify:     { label: "Spotify",  color: "#1DB954", bg: "rgba(29,185,84,0.15)" },
  YTMusic:     { label: "YouTube Music", color: "#FF0000", bg: "rgba(255,0,0,0.15)" },
};
