import type { Route } from "./+types/api.import";
import { getQQMusicPlaylistSongs } from "@spindeck/core";
import type { PlatformType, SongInfo } from "../lib/types";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = (formData.get("url") as string)?.trim();
  const platform = (formData.get("platform") as PlatformType)?.trim();

  if (!url || !platform) {
    return Response.json(
      { error: "缺少 url 或 platform 参数" },
      { status: 400 },
    );
  }

  try {
    if (platform === "QQMusic") {
      const result = await getQQMusicPlaylistSongs(url);
      const songs: SongInfo[] = result.songs.map((s) => ({
        name: s.name,
        artist: s.artist,
        cover: s.cover || "",
        album: s.album || "",
        platformSongId: s.platformSongId || "",
        platformNumericId: s.platformNumericId,
        platformSongType: s.platformSongType,
      }));
      return Response.json({
        name: result.name || "QQ音乐歌单",
        cover: result.cover || "",
        songCount: songs.length,
        songs,
      });
    }

    return Response.json({
      name: `来自平台的歌单`,
      cover: "",
      songCount: 0,
      songs: [],
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "获取歌单失败，请检查链接是否正确" },
      { status: 502 },
    );
  }
}
