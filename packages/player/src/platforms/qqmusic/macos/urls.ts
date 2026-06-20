import type { SongInfo } from "../../../types";

/** Mac QQ 音乐：version==73270&&cmd_0==playsong&&id_0=={songid}（终端实测可播放） */
export function buildQQMusicMacPlayUrls(song: SongInfo): string[] {
  const songid = song.platformNumericId;
  if (songid == null) return [];

  return [
    `qqmusicmac://QQMusic/?version==73270&&cmd_count==1&&cmd_0==playsong&&id_0==${songid}`,
  ];
}
