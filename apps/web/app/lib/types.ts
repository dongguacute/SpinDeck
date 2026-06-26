import type { PlatformType, SongInfo } from "@spindeck/player";

/** 播放相关基础类型，定义于 @spindeck/player */
export type { PlatformType, SongInfo };

export interface Playlist {
  id: string;
  name: string;
  platform: PlatformType;
  coverUrl: string;
  songCount: number;
  importUrl: string;
  refreshInterval?: number; // 自动刷新间隔（毫秒）
  createdAt: number;
}

export const PLATFORM_CONFIG: Record<
  PlatformType,
  { color: string; bg: string }
> = {
  QQMusic:     { color: "#31C27C", bg: "rgba(49,194,124,0.15)" },
  NetEaseMusic:{ color: "#EC4141", bg: "rgba(236,65,65,0.15)" },
  KugouMusic:  { color: "#2D8CF0", bg: "rgba(45,140,240,0.15)" },
  AppleMusic:  { color: "#FA586A", bg: "rgba(250,88,106,0.15)" },
  Spotify:     { color: "#1DB954", bg: "rgba(29,185,84,0.15)" },
  YTMusic:     { color: "#FF0000", bg: "rgba(255,0,0,0.15)" },
};
