import type { Route } from "./+types/api.import";
import {
  getPlaylistPage,
  getPlaylistMeta,
  getQQMusicPlaylistSongs,
  getKugouMusicPlaylistSongs,
} from "@spindeck/core";
import type { PlatformType, SongInfo } from "../lib/types";

const DEFAULT_PAGE_SIZE = 30;
const FULL_LOAD_MAX = 300;

function mapSongs(songs: SongInfo[]): SongInfo[] {
  return songs.slice(0, FULL_LOAD_MAX).map((s) => ({
    name: s.name,
    artist: s.artist,
    cover: s.cover || "",
    album: s.album || "",
    platformSongId: s.platformSongId || "",
    platformNumericId: s.platformNumericId,
    platformSongType: s.platformSongType,
  }));
}

async function importFullPlaylist(platform: PlatformType, url: string, metaOnly: boolean) {
  if (metaOnly) {
    const meta = await getPlaylistMeta(platform, url);
    return {
      url,
      name: meta.name,
      cover: meta.cover,
      songCount: meta.songCount,
      songs: [] as SongInfo[],
      offset: 0,
      limit: 0,
      hasMore: false,
      paginated: false,
    };
  }

  const result = platform === "QQMusic"
    ? await getQQMusicPlaylistSongs(url)
    : await getKugouMusicPlaylistSongs(url);
  const songs = mapSongs(result.songs);

  return {
    url,
    name: result.name,
    cover: result.cover,
    songCount: songs.length,
    songs,
    offset: 0,
    limit: songs.length,
    hasMore: false,
    paginated: false,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = (formData.get("url") as string)?.trim();
  const platform = (formData.get("platform") as PlatformType)?.trim();
  const metaOnly = formData.get("metaOnly") === "true";
  const offsetRaw = formData.get("offset");
  const limitRaw = formData.get("limit");
  const platformPlaylistId = (formData.get("platformPlaylistId") as string)?.trim() || undefined;

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

  const offset = offsetRaw != null ? Math.max(0, Number.parseInt(String(offsetRaw), 10) || 0) : 0;
  const limit = limitRaw != null
    ? Math.max(1, Number.parseInt(String(limitRaw), 10) || DEFAULT_PAGE_SIZE)
    : (metaOnly ? 0 : DEFAULT_PAGE_SIZE);

  try {
    const results = await Promise.all(urls.map(async (u) => {
      try {
        if (platform === "QQMusic" || platform === "KugouMusic") {
          return await importFullPlaylist(platform, u, metaOnly);
        }
        if (platform === "NetEaseMusic") {
          const result = await getPlaylistPage(platform, u, offset, limit, {
            metaOnly,
            platformPlaylistId: urls.length === 1 ? platformPlaylistId : undefined,
          });
          return {
            url: u,
            name: result.name,
            cover: result.cover,
            songCount: result.songCount,
            songs: result.songs,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
            paginated: result.paginated,
            platformPlaylistId: result.platformPlaylistId,
          };
        }
        return {
          url: u,
          name: `来自平台的歌单`,
          cover: "",
          songCount: 0,
          songs: [],
          offset: 0,
          limit,
          hasMore: false,
          paginated: false,
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
