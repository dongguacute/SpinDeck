import type { PlatformType, SongInfo } from "./types";

export type DeviceOS = "macos" | "windows" | "linux" | "android" | "ios";

function qqMusicScheme(os: DeviceOS): string {
  if (os === "macos") return "qqmusicmac";
  return "qqmusic";
}

function buildQQMusicPlayPayload(song: SongInfo): string {
  const songmid = song.platformSongId?.trim() ?? "";
  const songtype = song.platformSongType ?? 0;
  const entry: Record<string, string | number> = {
    type: "0",
    songmid,
    songtype,
  };
  if (song.platformNumericId) {
    entry.songid = song.platformNumericId;
  }
  return JSON.stringify({
    song: [entry],
    action: "play",
  });
}

/** Mac QQ 音乐：version==73270&&cmd_0==playsong&&id_0=={songid}（终端实测可播放） */
export function buildQQMusicMacPlayUrls(song: SongInfo): string[] {
  const songid = song.platformNumericId;
  if (songid == null) return [];

  return [
    `qqmusicmac://QQMusic/?version==73270&&cmd_count==1&&cmd_0==playsong&&id_0==${songid}`,
  ];
}

function buildQQMusicPlayUrls(song: SongInfo, os: DeviceOS): string[] {
  if (os === "macos") {
    return buildQQMusicMacPlayUrls(song);
  }

  const songmid = song.platformSongId?.trim();
  if (!songmid && song.platformNumericId == null) return [];

  const scheme = qqMusicScheme(os);
  const encoded = encodeURIComponent(buildQQMusicPlayPayload(song));
  return [`${scheme}://qq.com/media/playSonglist?p=${encoded}`];
}

function buildNetEasePlayUrl(songId: string): string {
  return `orpheus://song/${songId}`;
}

function buildSpotifyPlayUrl(trackId: string): string {
  return `spotify:track:${trackId}`;
}

function buildAppleMusicSearchUrl(song: SongInfo): string {
  const term = encodeURIComponent(`${song.name} ${song.artist}`);
  return `music://itunes.apple.com/search?term=${term}`;
}

/** 构建单曲 deep link 列表（纯函数，可在服务端使用） */
export function buildSongPlayUrls(
  platform: PlatformType,
  song: SongInfo,
  os: DeviceOS = "linux",
): string[] {
  switch (platform) {
    case "QQMusic":
      return buildQQMusicPlayUrls(song, os);
    case "NetEaseMusic": {
      const id = song.platformSongId?.trim();
      return id ? [buildNetEasePlayUrl(id)] : [];
    }
    case "Spotify": {
      const id = song.platformSongId?.trim();
      return id ? [buildSpotifyPlayUrl(id)] : [];
    }
    case "AppleMusic":
      return [buildAppleMusicSearchUrl(song)];
    case "KugouMusic": {
      const id = song.platformSongId?.trim();
      return id ? [`kugoumusic://start?type=3&cmd=play&content_type=1&content_id=${id}`] : [];
    }
    default:
      return [];
  }
}
