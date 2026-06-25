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

  const urls = url.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    return Response.json(
      { error: "请输入有效的歌单链接" },
      { status: 400 },
    );
  }

  try {
    const results = await Promise.all(urls.map(async (u) => {
      try {
        if (platform === "QQMusic") {
          const result = await getQQMusicPlaylistSongs(u);
          const songs: SongInfo[] = result.songs.map((s) => ({
            name: s.name,
            artist: s.artist,
            cover: s.cover || "",
            album: s.album || "",
            platformSongId: s.platformSongId || "",
            platformNumericId: s.platformNumericId,
            platformSongType: s.platformSongType,
          }));
          return {
            url: u,
            name: result.name || "QQ音乐歌单",
            cover: result.cover || "",
            songCount: songs.length,
            songs,
          };
        }
        return {
          url: u,
          name: `来自平台的歌单`,
          cover: "",
          songCount: 0,
          songs: [],
        };
      } catch (err) {
        return {
          url: u,
          error: err instanceof Error ? err.message : "获取歌单失败",
        };
      }
    }));

    return Response.json({ results });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "批量获取歌单失败" },
      { status: 502 },
    );
  }
}
