import { Link, useParams, useFetcher } from "react-router";
import { ArrowLeft, Disc3, LoaderCircle, Info, X, ExternalLink, Clock, Music, Rocket, LogOut, SkipBack, SkipForward, Settings2, Image as ImageIcon, Sliders, Check, RotateCcw } from "lucide-react";
import { usePlaylistStore } from "../lib/playlist-store";
import { useThemeStore } from "../lib/theme-store";
import PlaylistShelf from "../components/PlaylistShelf";
import { SongVinylOverlay, VinylStylePreview } from "@spindeck/vinyl-ui";
import { beginShelfSession, prelaunchApp, stopSong, pauseSong } from "@spindeck/player";
import type { PlatformType, SongInfo } from "@spindeck/player";
import { PLATFORM_CONFIG } from "../lib/types";
import {
  derivePlaybackGlassBackground,
  derivePlaybackPalette,
  getDefaultChrome,
  themePaletteToChrome,
  type ThemePalette,
} from "../lib/theme-color";
import { buildPlaybackCoverTheme } from "../lib/cover-background";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import gsap from "gsap";

function proxiedCover(coverUrl: string) {
  return `/api/image?url=${encodeURIComponent(coverUrl)}`;
}

export default function ShelfPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { playlists, updatePlaylist } = usePlaylistStore();
  const { theme, settings, updateSettings, resetSettings } = useThemeStore();
  const playlist = playlists.find((p) => p.id === playlistId);

  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 每次进入书架都请求歌单数据
  const fetcher = useFetcher<{
    name?: string; cover?: string; songCount?: number;
    songs?: SongInfo[]; error?: string;
  }>();

  // 当 fetcher 数据返回时，同步更新 store 中的歌单基础信息
  useEffect(() => {
    if (fetcher.data && !fetcher.data.error && playlist) {
      const { name, cover, songCount } = fetcher.data;
      const hasChanged =
        (name && name !== playlist.name) ||
        (cover && cover !== playlist.coverUrl) ||
        (songCount !== undefined && songCount !== playlist.songCount);

      if (hasChanged) {
        console.log(`[shelf] 同步更新 store 信息: ${name}`);
        updatePlaylist(playlist.id, {
          name: name || playlist.name,
          coverUrl: cover || playlist.coverUrl,
          songCount: songCount ?? playlist.songCount,
        });
      }
    }
  }, [fetcher.data, playlist, updatePlaylist]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tonearmPortalRef = useRef<HTMLDivElement>(null);
  const [tonearmPortalReady, setTonearmPortalReady] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongInfo | null>(null);
  const [showVinyl, setShowVinyl] = useState(false);
  const [coverOverlay, setCoverOverlay] = useState(false);
  const [pageSessionId, setPageSessionId] = useState("");
  const [bookThemeColor, setBookThemeColor] = useState<string | null>(null);
  const [coverThemePalette, setCoverThemePalette] = useState<ThemePalette | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [autoPlayToken, setAutoPlayToken] = useState(0);
  const swipeRef = useRef<{ x: number; time: number; startX: number } | null>(null);
  const playbackWrapperRef = useRef<HTMLDivElement>(null);

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const songs = fetcher.data?.songs || [];

  const handleSongSelect = useCallback((song: SongInfo | null, index: number | null, autoPlay = false) => {
    const wasInPlayback = selectedIndex !== null;
    
    // 切换时第一时间暂停当前播放
    if (wasInPlayback && playlist?.platform) {
      void pauseSong(playlist.platform);
    }

    setSelectedIndex(index);
    
    // 如果已经在播放中，保持 showVinyl 为 true，实现无缝切换
    // 如果是第一次播放，则由 handleBookAnimationComplete 负责显示
    if (wasInPlayback && song) {
      setShowVinyl(true);
    } else if (!song) {
      setShowVinyl(false);
    }
    
    setCoverOverlay(false);
    setAutoPlayNext(autoPlay);
    if (autoPlay) setAutoPlayToken((t) => t + 1);
    
    if (song) {
      console.log(`[shelf] 切换歌曲: ${song.name} (index: ${index}) autoPlay: ${autoPlay}`);
      setSelectedSong(song);
    } else {
      setSelectedSong(null);
      setBookThemeColor(null);
      setCoverThemePalette(null);
    }
  }, [selectedIndex, playlist?.platform]);

  const playNextSong = useCallback(() => {
    if (songs.length === 0 || selectedIndex === null) return;
    const nextIndex = (selectedIndex + 1) % songs.length;
    handleSongSelect(songs[nextIndex], nextIndex, true);
  }, [songs, selectedIndex, handleSongSelect]);

  const playPrevSong = useCallback(() => {
    if (songs.length === 0 || selectedIndex === null) return;
    const prevIndex = (selectedIndex - 1 + songs.length) % songs.length;
    handleSongSelect(songs[prevIndex], prevIndex, true);
  }, [songs, selectedIndex, handleSongSelect]);

  const handleBookAnimationComplete = useCallback((_index: number) => {
    setShowVinyl(true);
  }, []);

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
  }, [playlist?.importUrl, playlist?.platform, fetcher]);

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
  }, [playlist?.refreshInterval, playlist?.importUrl, playlist?.platform, fetcher]);

  // @spindeck/player：进入书架 → 暂停并重置会话
  useEffect(() => {
    if (!playlist?.platform) return;
    void beginShelfSession(playlist.platform).then(setPageSessionId);
  }, [playlistId, playlist?.platform]);

  // @spindeck/player：离开书架 → stopSong（暂停 + 清会话）
  useEffect(() => {
    const platform = playlist?.platform;
    return () => {
      if (platform) void stopSong(platform);
    };
  }, [playlist?.platform]);

  // 当 fetcher 数据返回时，同步更新 store 中的歌单基础信息
  useEffect(() => {
    if (fetcher.data && !fetcher.data.error && playlist) {
      const { name, cover, songCount } = fetcher.data;
      const hasChanged =
        (name && name !== playlist.name) ||
        (cover && cover !== playlist.coverUrl) ||
        (songCount !== undefined && songCount !== playlist.songCount);

      if (hasChanged) {
        console.log(`[shelf] 同步更新 store 信息: ${name}`);
        updatePlaylist(playlist.id, {
          name: name || playlist.name,
          coverUrl: cover || playlist.coverUrl,
          songCount: songCount ?? playlist.songCount,
        });
      }
    }
  }, [fetcher.data, playlist, updatePlaylist]);

  const inPlayback = selectedIndex !== null;

  const handleExitPlayback = () => {
    if (playlist?.platform) void stopSong(playlist.platform);
    setShowVinyl(false);
    setCoverOverlay(false);
    setSelectedIndex(null);
    setSelectedSong(null);
    setBookThemeColor(null);
    setCoverThemePalette(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ customBackground: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // 从封面提取主色 → 极淡纯色背景
  useEffect(() => {
    if (!selectedSong?.cover) {
      setCoverThemePalette(null);
      return;
    }

    let cancelled = false;
    void buildPlaybackCoverTheme(selectedSong.cover, theme).then((themeResult) => {
      if (cancelled) return;
      setCoverThemePalette(themeResult.palette);
      setBookThemeColor(themeResult.accentHex);
    }).catch(() => {
      if (!cancelled) {
        setCoverThemePalette(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSong?.cover, theme]);

  const themePalette = useMemo(() => {
    if (!inPlayback) return null;
    if (coverThemePalette) return coverThemePalette;
    if (bookThemeColor) return derivePlaybackPalette(bookThemeColor, theme);
    return null;
  }, [inPlayback, coverThemePalette, bookThemeColor, theme]);

  const glassBackground = useMemo(() => {
    if (!inPlayback) return null;
    if (themePalette) return themePalette.backdropGradient;
    if (bookThemeColor) return derivePlaybackGlassBackground(bookThemeColor, theme);
    return null;
  }, [inPlayback, themePalette, bookThemeColor, theme]);

  const showThemeBackdrop = inPlayback && !!glassBackground;

  const chrome = useMemo(
    () => (showThemeBackdrop && themePalette ? themePaletteToChrome(themePalette) : getDefaultChrome()),
    [showThemeBackdrop, themePalette],
  );

  const chromeIdleOpacity = showThemeBackdrop ? 1 : 0.5;
  const chromeHoverOpacity = 1;
  const chromeBtnIdleOpacity = 1;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!inPlayback) return;
    swipeRef.current = { x: e.clientX, time: Date.now(), startX: e.clientX };
    
    // 停止任何正在进行的动画
    if (playbackWrapperRef.current) {
      gsap.killTweensOf(playbackWrapperRef.current);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || !playbackWrapperRef.current) return;
    
    const deltaX = e.clientX - swipeRef.current.startX;
    // 实时跟随手指移动，增加一点阻尼感
    gsap.set(playbackWrapperRef.current, { x: deltaX });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current || !inPlayback || !playbackWrapperRef.current) return;
    
    const deltaX = e.clientX - swipeRef.current.startX;
    const deltaTime = Date.now() - swipeRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;
    swipeRef.current = null;

    // 触发切换的阈值：滑动距离超过屏幕宽度的 20% 或者 速度极快
    const threshold = window.innerWidth * 0.2;
    const isQuickSwipe = velocity > 0.5 && Math.abs(deltaX) > 30;

    if (Math.abs(deltaX) > threshold || isQuickSwipe) {
      const direction = deltaX > 0 ? "prev" : "next";
      const targetX = direction === "prev" ? window.innerWidth : -window.innerWidth;
      
      // 1. 滑出屏幕
      gsap.to(playbackWrapperRef.current, {
        x: targetX,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          // 2. 切换歌曲
          if (direction === "prev") playPrevSong();
          else playNextSong();
          
          // 3. 从另一侧滑入
          gsap.fromTo(playbackWrapperRef.current!, 
            { x: -targetX, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)" }
          );
        }
      });
    } else {
      // 距离不足，弹回原位
      gsap.to(playbackWrapperRef.current, {
        x: 0,
        duration: 0.4,
        ease: "elastic.out(1, 0.75)"
      });
    }
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden select-none touch-none" 
      style={{ background: "var(--bg-primary)" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 播放页磨砂玻璃背景（封面模糊 + pastel 叠层 + 高光） */}
      <div
        className={`playback-backdrop${showThemeBackdrop ? " playback-backdrop--visible" : ""}`}
        aria-hidden
      >
        {(settings.customBackground || selectedSong?.cover) && (
          <div
            className="playback-backdrop__cover"
            style={{ 
              backgroundImage: `url(${settings.customBackground || (selectedSong?.cover ? proxiedCover(selectedSong.cover) : '')})`,
              filter: `blur(${settings.backgroundBlur}px) saturate(1.4)`,
              opacity: settings.customBackground ? 0.8 : 0.62
            }}
          />
        )}
        {glassBackground && !settings.customBackground && (
          <div className="playback-backdrop__glass" style={{ background: glassBackground }} />
        )}
        <div className="playback-backdrop__sheen" />
      </div>

      {/* 返回（播放态隐藏） */}
      {!inPlayback && (
        <Link
          to="/"
          className="absolute top-6 left-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer"
          style={{
            backgroundColor: chrome.surface,
            borderColor: chrome.border,
            color: chrome.text,
            opacity: chromeIdleOpacity,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = chrome.borderHover;
            e.currentTarget.style.backgroundColor = chrome.surfaceHover;
            (e.currentTarget as HTMLAnchorElement).style.opacity = String(chromeHoverOpacity);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = chrome.border;
            e.currentTarget.style.backgroundColor = chrome.surface;
            (e.currentTarget as HTMLAnchorElement).style.opacity = String(chromeIdleOpacity);
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />返回歌单
        </Link>
      )}

      {playlist && (
        inPlayback ? (
          <button
            onClick={handleExitPlayback}
            className="absolute top-6 right-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
            style={{
              backgroundColor: chrome.surface,
              borderColor: chrome.border,
              color: chrome.text,
              opacity: chromeBtnIdleOpacity,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = chrome.borderHover;
              e.currentTarget.style.backgroundColor = chrome.surfaceHover;
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = chrome.border;
              e.currentTarget.style.backgroundColor = chrome.surface;
              e.currentTarget.style.opacity = String(chromeBtnIdleOpacity);
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="退出播放并停止音乐"
          >
            <LogOut className="w-3.5 h-3.5" />退出播放
          </button>
        ) : (
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
        )
      )}

      {/* 歌单主信息（播放态隐藏） */}
      {playlist && !inPlayback && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-4 py-2 rounded-2xl border"
          style={{
            backgroundColor: "var(--surface-color)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* 名字和信息 */}
          <div className="flex items-center gap-2.5">
            <span
              className="text-sm font-medium tracking-wide max-w-[200px] truncate transition-colors duration-700"
              style={{ color: chrome.textSecondary, opacity: showThemeBackdrop ? 0.95 : 0.7 }}
            >
              {playlist.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-md border transition-colors duration-700"
              style={{
                color: chrome.textMuted,
                backgroundColor: chrome.surface,
                borderColor: chrome.border,
              }}
            >
              {songs.length > 0 ? `${songs.length} 首` : playlist.songCount > 0 ? `${playlist.songCount} 首` : ""}
            </span>

            {/* 详情图标 */}
            <button
              onClick={() => setShowDetail(true)}
              className="p-1 rounded-lg transition-all cursor-pointer"
              style={{ color: chrome.textMuted, opacity: showThemeBackdrop ? 0.65 : 0.25 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = chrome.textSecondary;
                e.currentTarget.style.opacity = showThemeBackdrop ? "0.95" : "0.5";
                e.currentTarget.style.background = chrome.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = chrome.textMuted;
                e.currentTarget.style.opacity = showThemeBackdrop ? "0.65" : "0.25";
                e.currentTarget.style.background = "transparent";
              }}
              title="歌单详情"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* 自动刷新状态指示（只读） */}
            {refreshInterval > 0 && (
              <span
                className={`text-[10px] flex items-center gap-1 transition-colors duration-700${showThemeBackdrop ? "" : " text-emerald-400/50"}`}
                style={showThemeBackdrop && themePalette ? { color: themePalette.textSecondary } : undefined}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full${showThemeBackdrop ? "" : " bg-emerald-400/60"}`}
                  style={showThemeBackdrop && themePalette ? { backgroundColor: themePalette.pale200 } : undefined}
                />
                自动刷新中
              </span>
            )}
          </div>
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border"
            style={{
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <LoaderCircle className="w-8 h-8 animate-spin" style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>正在加载歌单…</span>
          </div>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="text-center p-8 rounded-3xl border"
            style={{
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-sm mb-5 font-medium" style={{ color: "#f87171" }}>{error}</p>
            <button
              onClick={() => fetcher.submit(
                { url: playlist!.importUrl, platform: playlist!.platform },
                { method: "POST", action: "/api/import" },
              )}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{ 
                backgroundColor: "var(--bg-tertiary)", 
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-raised)",
                border: "1px solid var(--border-highlight)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.backgroundColor = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-pressed)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* 手动创建的歌单无 importUrl */}
      {!loading && !error && !playlist?.importUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="p-8 rounded-3xl border"
            style={{
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-pressed)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>该歌单为手动创建，暂无歌曲数据</p>
          </div>
        </div>
      )}

      {/* 歌单详情弹窗 */}
      {showDetail && playlist && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative w-full max-w-sm border rounded-3xl p-6 shadow-2xl" 
            style={{ 
              background: "var(--bg-tertiary)", 
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }} 
            onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Disc3 className="w-5 h-5" style={{ color: "var(--text-muted)" }} />歌单信息
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-xl transition-all cursor-pointer"
                style={{ 
                  color: "var(--text-muted)",
                  boxShadow: "var(--shadow-raised)",
                  border: "1px solid var(--border-highlight)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                onMouseDown={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-pressed)"; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 封面 */}
            {(fetcher.data?.cover || playlist.coverUrl) && (
              <div className="mb-6 flex justify-center">
                <div className="p-2 rounded-2xl border" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
                  <img
                    src={fetcher.data?.cover || playlist.coverUrl}
                    alt={playlist.name}
                    className="w-40 h-40 rounded-xl object-cover"
                  />
                </div>
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
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
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

      {/* 播放核心区域（含动画容器） */}
      <div ref={playbackWrapperRef} className="absolute inset-0 w-full h-full">
        {/* 光碟（z-2，封面遮盖时在书下方） */}
        {selectedSong && playlist && (
          <SongVinylOverlay
            song={selectedSong}
            platform={playlist.platform}
            visible={showVinyl}
            pageSessionId={pageSessionId}
            theme={theme}
            styleName={settings.vinylStyle}
            vinylColor={bookThemeColor || undefined}
            tonearmPortalRef={tonearmPortalRef}
            tonearmPortalReady={tonearmPortalReady}
            autoPlay={autoPlayNext}
            autoPlayToken={autoPlayToken}
          />
        )}

        {/* 3D 书架（遮盖态 z-3，叠在光碟上） */}
        <PlaylistShelf
          songs={songs}
          onSongSelect={handleSongSelect}
          onSelectionAnimationComplete={handleBookAnimationComplete}
          onCoverToggle={() => setCoverOverlay((v) => !v)}
          onBookThemeColor={setBookThemeColor}
          selectedIndex={selectedIndex}
          coverOverlay={coverOverlay}
          lockDeselect={inPlayback}
        />
      </div>

      {/* 唱臂 portal（z-5，遮盖态叠在书上方可交互） */}
      <div
        ref={(el) => {
          tonearmPortalRef.current = el;
          setTonearmPortalReady(!!el);
        }}
        className="sd-vinyl-portal"
        aria-hidden
      />

      {/* 播放控制栏（仅播放态显示） */}
      {inPlayback && (
        <div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-60 flex items-center gap-6 px-8 py-3 rounded-2xl border backdrop-blur-md transition-all duration-500"
          style={{
            backgroundColor: chrome.surface,
            borderColor: chrome.border,
            color: chrome.text,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            opacity: showVinyl ? 1 : 0,
            transform: `translateX(-50%) translateY(${showVinyl ? 0 : 20}px)`,
          }}
        >
          <button
            onClick={playPrevSong}
            className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
            style={{ color: chrome.textSecondary }}
            title="上一首"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* 下一首 */}
          <button
            onClick={playNextSong}
            className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
            style={{ color: chrome.textSecondary }}
            title="下一首"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>
      )}

      {/* 调节按钮（左下角，仅播放态显示） */}
      {inPlayback && (
        <div className="absolute bottom-10 left-10 z-70">
          <button
            onClick={() => setShowSettings(true)}
            className="p-3.5 rounded-2xl border backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: chrome.surface,
              borderColor: chrome.border,
              color: chrome.text,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              opacity: showVinyl ? 1 : 0,
              transform: `translateY(${showVinyl ? 0 : 20}px)`,
            }}
            title="调节视觉样式"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 调节弹窗 */}
      {inPlayback && showSettings && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
          <div 
            className="relative w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 backdrop-blur-2xl"
            style={{ 
              backgroundColor: chrome.surface,
              borderColor: chrome.border,
              borderWidth: "1px",
              color: chrome.text
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2.5">
                <Settings2 className="w-5 h-5 opacity-60" /> 视觉调节
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-2xl transition-all hover:scale-110 active:scale-90 cursor-pointer"
                style={{ backgroundColor: chrome.surfaceHover, color: chrome.textSecondary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-10">
              {/* 光碟样式 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Disc3 className="w-4 h-4 opacity-40" />
                  <label className="text-xs font-bold uppercase tracking-widest opacity-40">光碟样式</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {["classic", "modern"].map((styleId) => (
                    <button 
                      key={styleId}
                      onClick={() => updateSettings({ vinylStyle: styleId })}
                      className="relative group transition-all"
                    >
                      <div className={`p-4 rounded-3xl border-2 transition-all ${settings.vinylStyle === styleId ? 'scale-100' : 'scale-[0.98] opacity-60 hover:opacity-100 hover:scale-100'}`}
                        style={{ 
                          backgroundColor: chrome.surfaceHover,
                          borderColor: settings.vinylStyle === styleId ? bookThemeColor || chrome.borderHover : 'transparent'
                        }}
                      >
                        <VinylStylePreview
                          styleName={styleId}
                          active={settings.vinylStyle === styleId}
                          onClick={() => {}} // 已经在父级 handle 了
                          color={bookThemeColor || undefined}
                        />
                      </div>
                      {settings.vinylStyle === styleId && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: bookThemeColor || chrome.text, color: '#fff' }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* 背景图片 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 opacity-40" />
                  <label className="text-xs font-bold uppercase tracking-widest opacity-40">自定义背景</label>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl border-2 border-dashed transition-all hover:border-solid cursor-pointer active:scale-[0.98]"
                    style={{ 
                      borderColor: chrome.border,
                      backgroundColor: chrome.surfaceHover,
                      color: chrome.textSecondary
                    }}
                  >
                    <div className="p-2 rounded-xl" style={{ backgroundColor: chrome.surface }}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold">上传背景图</span>
                  </button>
                  {settings.customBackground && (
                    <button
                      onClick={() => updateSettings({ customBackground: null })}
                      className="p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                      title="清除自定义背景"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </section>

              {/* 模糊度 */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 opacity-40" />
                    <label className="text-xs font-bold uppercase tracking-widest opacity-40">背景模糊度</label>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: chrome.surfaceHover }}>
                    {settings.backgroundBlur}<span className="opacity-40 ml-0.5">PX</span>
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.backgroundBlur}
                    onChange={(e) => updateSettings({ backgroundBlur: parseInt(e.target.value) })}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-current"
                    style={{ 
                      background: chrome.border,
                      color: bookThemeColor || chrome.text
                    }}
                  />
                </div>
              </section>

              {/* 重置所有 */}
              <div className="pt-6 border-t" style={{ borderColor: chrome.border }}>
                <button
                  onClick={() => {
                    if (confirm("确定要重置所有视觉配置吗？")) {
                      resetSettings();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
                  style={{ 
                    backgroundColor: chrome.surfaceHover,
                    color: chrome.textMuted
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  重置所有视觉配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
