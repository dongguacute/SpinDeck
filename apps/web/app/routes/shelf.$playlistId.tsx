import { Link, useParams, useFetcher } from "react-router";
import { ArrowLeft, Disc3, LoaderCircle } from "lucide-react";
import { usePlaylistStore } from "../lib/playlist-store";
import PlaylistShelf from "../components/PlaylistShelf";
import type { SongInfo } from "../lib/types";
import { useEffect } from "react";

export default function ShelfPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { playlists } = usePlaylistStore();
  const playlist = playlists.find((p) => p.id === playlistId);

  // 每次进入书架都请求歌单数据
  const fetcher = useFetcher<{
    name?: string; cover?: string; songCount?: number;
    songs?: SongInfo[]; error?: string;
  }>();

  useEffect(() => {
    console.log(`[shelf] playlist.importUrl="${playlist?.importUrl}" platform="${playlist?.platform}" state=${fetcher.state}`);
    if (playlist?.importUrl && playlist?.platform && fetcher.state === "idle" && !fetcher.data) {
      console.log(`[shelf] 发起 fetch...`);
      fetcher.submit(
        { url: playlist.importUrl, platform: playlist.platform },
        { method: "POST", action: "/api/import" },
      );
    }
  }, [playlist?.importUrl, playlist?.platform]);

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const songs = fetcher.data?.songs || [];
  console.log(`[shelf] render: loading=${loading} songs=${songs.length} error=${error || 'none'}`);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none touch-none">
      {/* 返回 */}
      <Link to="/" className="absolute top-6 left-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.16] text-xs font-medium transition-all backdrop-blur-sm cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />返回歌单
      </Link>

      {/* 歌单标题 */}
      {playlist && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-white/60 text-sm font-medium tracking-wide flex items-center gap-2 backdrop-blur-sm">
          <Disc3 className="w-4 h-4 text-white/30" />
          {playlist.name}
          <span className="text-white/20 text-xs">
            {playlist.songCount > 0 ? `${playlist.songCount} 首` : ""}
          </span>
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white/60">
            <LoaderCircle className="w-5 h-5 animate-spin" />
            <span className="text-sm">加载歌单中…</span>
          </div>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={() => fetcher.submit(
                { url: playlist!.importUrl, platform: playlist!.platform },
                { method: "POST", action: "/api/import" },
              )}
              className="px-4 py-2 rounded-xl bg-white/[0.08] text-white/60 text-xs hover:bg-white/[0.12] transition-colors cursor-pointer"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* 手动创建的歌单无 importUrl */}
      {!loading && !error && !playlist?.importUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <p className="text-white/30 text-sm">该歌单为手动创建，暂无歌曲数据</p>
        </div>
      )}

      {/* 3D 书架 */}
      <PlaylistShelf songs={songs} />
    </div>
  );
}
