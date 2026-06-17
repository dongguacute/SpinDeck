import { Link, useParams, useFetcher } from "react-router";
import { ArrowLeft, Disc3, LoaderCircle, Info, X, ExternalLink, Clock, Music } from "lucide-react";
import { usePlaylistStore } from "../lib/playlist-store";
import PlaylistShelf from "../components/PlaylistShelf";
import type { SongInfo } from "../lib/types";
import { PLATFORM_CONFIG } from "../lib/types";
import { useEffect, useState, useRef } from "react";

export default function ShelfPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { playlists } = usePlaylistStore();
  const playlist = playlists.find((p) => p.id === playlistId);

  // 每次进入书架都请求歌单数据
  const fetcher = useFetcher<{
    name?: string; cover?: string; songCount?: number;
    songs?: SongInfo[]; error?: string;
  }>();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  // 从 playlist 数据中读取刷新间隔，默认为 0（关闭）
  const refreshInterval = playlist?.refreshInterval ?? 0;

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

  // 自动刷新逻辑（从 playlist.refreshInterval 读取）
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const interval = playlist?.refreshInterval ?? 0;
    if (interval > 0 && playlist?.importUrl && playlist?.platform) {
      timerRef.current = setInterval(() => {
        fetcher.submit(
          { url: playlist.importUrl, platform: playlist.platform },
          { method: "POST", action: "/api/import" },
        );
      }, interval);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playlist?.refreshInterval, playlist?.importUrl, playlist?.platform]);

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

      {/* 歌单主信息 */}
      {playlist && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 backdrop-blur-sm">
          {/* 名字和信息 */}
          <div className="flex items-center gap-2.5">
            <span className="text-white/70 text-sm font-medium tracking-wide max-w-[200px] truncate">{playlist.name}</span>
            <span className="text-white/30 text-xs px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
              {songs.length > 0 ? `${songs.length} 首` : playlist.songCount > 0 ? `${playlist.songCount} 首` : ""}
            </span>
            
            {/* 详情图标 */}
            <button
              onClick={() => setShowDetail(true)}
              className="p-1 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all cursor-pointer"
              title="歌单详情"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* 自动刷新状态指示（只读） */}
            {refreshInterval > 0 && (
              <span className="text-emerald-400/50 text-[10px] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                自动刷新中
              </span>
            )}
          </div>
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

      {/* 歌单详情弹窗 */}
      {showDetail && playlist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#141414] border border-white/[0.08] rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white/90 text-base font-semibold flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-white/40" />歌单信息
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 封面 */}
            {(fetcher.data?.cover || playlist.coverUrl) && (
              <div className="mb-5 flex justify-center">
                <img
                  src={fetcher.data?.cover || playlist.coverUrl}
                  alt={playlist.name}
                  className="w-36 h-36 rounded-xl object-cover shadow-lg border border-white/[0.08]"
                />
              </div>
            )}

            {/* 信息列表 */}
            <div className="space-y-4">
              {/* 歌单名称 */}
              <div>
                <label className="text-white/25 text-xs font-medium block mb-1">歌单名称</label>
                <p className="text-white/70 text-sm font-medium">{playlist.name}</p>
              </div>

              {/* 音乐平台 */}
              <div>
                <label className="text-white/25 text-xs font-medium block mb-1">音乐平台</label>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md"
                  style={{
                    color: PLATFORM_CONFIG[playlist.platform]?.color || '#fff',
                    backgroundColor: PLATFORM_CONFIG[playlist.platform]?.bg || 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_CONFIG[playlist.platform]?.color || '#fff' }}
                  />
                  {PLATFORM_CONFIG[playlist.platform]?.label || playlist.platform}
                </span>
              </div>

              {/* 原始链接 */}
              {playlist.importUrl && (
                <div>
                  <label className="text-white/25 text-xs font-medium block mb-1">原始链接</label>
                  <a
                    href={playlist.importUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors break-all group cursor-pointer"
                  >
                    <span className="truncate flex-1 min-w-0">{playlist.importUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                  </a>
                </div>
              )}

              {/* 歌曲数量 */}
              <div>
                <label className="text-white/25 text-xs font-medium block mb-1">歌曲数量</label>
                <p className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Music className="w-3.5 h-3.5" />
                  {songs.length > 0 ? `${songs.length} 首` : playlist.songCount > 0 ? `${playlist.songCount} 首` : "暂无"}
                </p>
              </div>

              {/* 创建时间 */}
              <div>
                <label className="text-white/25 text-xs font-medium block mb-1">创建时间</label>
                <p className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(playlist.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D 书架 */}
      <PlaylistShelf songs={songs} />
    </div>
  );
}
