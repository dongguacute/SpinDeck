import { Link, useParams, useFetcher } from "react-router";
import { ArrowLeft, Disc3, LoaderCircle, Info, X, ExternalLink, Clock, Music, Rocket } from "lucide-react";
import { usePlaylistStore } from "../lib/playlist-store";
import PlaylistShelf from "../components/PlaylistShelf";
import type { SongInfo } from "../lib/types";
import type { PlatformType } from "../lib/types";
import { PLATFORM_CONFIG } from "../lib/types";
import { useEffect, useState, useRef } from "react";

/**
 * 获取当前设备操作系统信息
 */
function getDeviceInfo(): "macos" | "windows" | "linux" | "android" | "ios" {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Mac OS X/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  return "linux";
}

/**
 * 桌面端各平台的启动配置
 * 包含：URL Scheme、Web 回退地址、应用名称
 */
interface LaunchConfig {
  scheme: string;        // 原生应用 URL Scheme
  webFallback: string;   // Web 回退地址
  appName: string;       // 应用名称（用于提示）
}

const DESKTOP_LAUNCH_CONFIG: Record<PlatformType, LaunchConfig> = {
  QQMusic: {
    scheme: "qqmusicmac://",  // macOS 桌面版的 URL Scheme（iOS 版为 qqmusic://）
    webFallback: "https://y.qq.com",
    appName: "QQ音乐",
  },
  NetEaseMusic: {
    scheme: "neteasecloudmusic://", // macOS 网易云音乐的 scheme
    webFallback: "https://music.163.com",
    appName: "网易云音乐",
  },
  KugouMusic: {
    scheme: "kugoumusic://",
    webFallback: "https://www.kugou.com",
    appName: "酷狗音乐",
  },
  AppleMusic: {
    scheme: "music://",
    webFallback: "https://music.apple.com",
    appName: "Apple Music",
  },
  Spotify: {
    scheme: "spotify://",
    webFallback: "https://open.spotify.com",
    appName: "Spotify",
  },
  YTMusic: {
    scheme: "",  // YouTube Music 无桌面原生应用
    webFallback: "https://music.youtube.com",
    appName: "YouTube Music",
  },
};

/**
 * 在桌面端预启动播放应用
 * 尝试通过 URL Scheme 打开原生应用，失败时回退到 Web 版本
 */
function prelaunchApp(platform: PlatformType): void {
  const deviceOS = getDeviceInfo();
  const config = DESKTOP_LAUNCH_CONFIG[platform];

  console.log(`[Prelaunch] Platform: ${platform}, OS: ${deviceOS}`);

  // 如果没有 URL Scheme（如 YouTube Music），直接打开 Web 版本
  if (!config.scheme) {
    console.log(`[Prelaunch] No native app for ${config.appName}, opening web`);
    window.open(config.webFallback, "_blank");
    return;
  }

  let hasFallenBack = false;
  let appLaunched = false;

  // 统一的回退函数
  const fallbackToWeb = (reason: string) => {
    if (hasFallenBack) return;
    hasFallenBack = true;
    clearTimeout(fallbackTimer);
    window.removeEventListener("blur", handleBlur);
    console.log(`[Prelaunch] Fallback to web (${reason})`);
    window.open(config.webFallback, "_blank");
  };

  const handleBlur = () => {
    appLaunched = true;
    console.log("[Prelaunch] Page blurred, app is launching!");
  };

  window.addEventListener("blur", handleBlur);

  // 先尝试启动原生应用
  try {
    window.location.href = config.scheme;
  } catch (e) {
    console.warn("[Prelaunch] Direct launch failed:", e);
    fallbackToWeb("exception thrown");
    return;
  }

  // 关键：使用较短的超时检测是否成功启动
  // 原理：如果 scheme 未注册/应用未安装，浏览器会几乎立刻返回（不触发 blur）
  //       如果应用成功启动，浏览器会失去焦点（触发 blur）
  const fallbackTimer = setTimeout(() => {
    window.removeEventListener("blur", handleBlur);
    if (!appLaunched && !hasFallenBack) {
      fallbackToWeb("app not detected (scheme may not be registered)");
    }
  }, 700);  // 700ms 内如果没有 blur 事件，认为应用未安装
}

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
    <div className="relative w-screen h-screen overflow-hidden select-none touch-none" style={{ background: "var(--bg-primary)" }}>
      {/* 返回 */}
      <Link to="/" className="absolute top-6 left-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
        style={{
          backgroundColor: "var(--surface-color)",
          borderColor: "var(--border-color)",
          color: "var(--text-secondary)",
          opacity: 0.5,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLAnchorElement).style.opacity = "0.5"; }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />返回歌单
      </Link>

      {/* 预启动播放应用按钮 */}
      {playlist && (
        <button
          onClick={() => prelaunchApp(playlist.platform)}
          className="absolute top-6 right-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
          style={{
            backgroundColor: PLATFORM_CONFIG[playlist.platform]?.bg || "var(--surface-color)",
            borderColor: "var(--border-color)",
            color: PLATFORM_CONFIG[playlist.platform]?.color || "var(--text-secondary)",
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)";
            e.currentTarget.style.opacity = "0.7";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title={`启动 ${PLATFORM_CONFIG[playlist.platform]?.label || playlist.platform}`}
        >
          <Rocket className="w-3.5 h-3.5" />预启动播放应用
        </button>
      )}

      {/* 歌单主信息 */}
      {playlist && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 backdrop-blur-sm">
          {/* 名字和信息 */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium tracking-wide max-w-[200px] truncate" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{playlist.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-md border" style={{
              color: "var(--text-muted)",
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
            }}>
              {songs.length > 0 ? `${songs.length} 首` : playlist.songCount > 0 ? `${playlist.songCount} 首` : ""}
            </span>

            {/* 详情图标 */}
            <button
              onClick={() => setShowDetail(true)}
              className="p-1 rounded-lg transition-all cursor-pointer"
              style={{ color: "var(--text-muted)", opacity: 0.25 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.background = "var(--surface-color)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.opacity = "0.25"; e.currentTarget.style.background = "transparent"; }}
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
        <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg-primary), transparent 50%)" }}>
          <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
            <LoaderCircle className="w-5 h-5 animate-spin" />
            <span className="text-sm">加载歌单中…</span>
          </div>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg-primary), transparent 50%)" }}>
          <div className="text-center">
            <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>
            <button
              onClick={() => fetcher.submit(
                { url: playlist!.importUrl, platform: playlist!.platform },
                { method: "POST", action: "/api/import" },
              )}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--surface-hover), black 20%))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* 手动创建的歌单无 importUrl */}
      {!loading && !error && !playlist?.importUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg-primary), transparent 50%)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)", opacity: 0.3 }}>该歌单为手动创建，暂无歌曲数据</p>
        </div>
      )}

      {/* 歌单详情弹窗 */}
      {showDetail && playlist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg-primary), transparent 40%)" }} />
          <div className="relative w-full max-w-sm border rounded-2xl p-6 shadow-2xl" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-color)" }} onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)", opacity: 0.9 }}>
                <Disc3 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />歌单信息
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)", opacity: 0.3 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-color)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.3"; }}
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
                  className="w-36 h-36 rounded-xl object-cover shadow-lg border"
                  style={{ borderColor: "var(--border-color)" }}
                />
              </div>
            )}

            {/* 信息列表 */}
            <div className="space-y-4">
              {/* 歌单名称 */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>歌单名称</label>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{playlist.name}</p>
              </div>

              {/* 音乐平台 */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>音乐平台</label>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md"
                  style={{
                    color: PLATFORM_CONFIG[playlist.platform]?.color || '#fff',
                    backgroundColor: PLATFORM_CONFIG[playlist.platform]?.bg || 'var(--surface-color)',
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
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>原始链接</label>
                  <a
                    href={playlist.importUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs transition-colors break-all group cursor-pointer"
                    style={{ color: "#60a5fa", opacity: 0.7 }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#93c5fd", (e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#60a5fa", (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")}
                  >
                    <span className="truncate flex-1 min-w-0">{playlist.importUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                  </a>
                </div>
              )}

              {/* 歌曲数量 */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>歌曲数量</label>
                <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
                  <Music className="w-3.5 h-3.5" />
                  {songs.length > 0 ? `${songs.length} 首` : playlist.songCount > 0 ? `${playlist.songCount} 首` : "暂无"}
                </p>
              </div>

              {/* 创建时间 */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>创建时间</label>
                <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
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
