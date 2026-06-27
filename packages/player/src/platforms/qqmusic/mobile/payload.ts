import type { SongInfo } from "../../../types";

/** QQ 音乐移动端 playSonglist 协议 payload */
export function buildQQMusicPlaySonglistPayload(song: SongInfo): string {
  const songmid = song.platformSongId?.trim();
  const entry: Record<string, string | number> = {
    type: "0",
    songmid: songmid ?? "",
  };
  if (song.platformSongType != null) {
    entry.songtype = song.platformSongType;
  }
  if (song.platformNumericId != null) {
    entry.songid = song.platformNumericId;
  }
  return JSON.stringify({ song: [entry], action: "play", index: 0 });
}

/** 精简 payload：仅 songmid，部分客户端版本兼容性更好 */
export function buildQQMusicMinimalPlayPayload(song: SongInfo): string {
  const songmid = song.platformSongId?.trim();
  if (!songmid) return "";
  return JSON.stringify({ action: "play", song: [{ songmid }] });
}
