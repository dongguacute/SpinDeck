import { Link } from "react-router";
import { ArrowLeft, Info, LogOut, Rocket } from "lucide-react";
import type { ChromeStyle, ThemePalette } from "../../lib/theme-color";
import { PLATFORM_CONFIG } from "../../lib/types";
import { prelaunchApp } from "@spindeck/player";
import type { Playlist } from "../../../lib/playlist-store";
import type { SongInfo } from "@spindeck/player";

interface HeaderProps {
  inPlayback: boolean;
  playlist: Playlist | undefined;
  chrome: ChromeStyle;
  chromeIdleOpacity: number;
  chromeHoverOpacity: number;
  chromeBtnIdleOpacity: number;
  showThemeBackdrop: boolean;
  themePalette: ThemePalette | null;
  songs: SongInfo[];
  refreshInterval: number;
  handleExitPlayback: () => void;
  setShowDetail: (show: boolean) => void;
}

export function Header({
  inPlayback,
  playlist,
  chrome,
  chromeIdleOpacity,
  chromeHoverOpacity,
  chromeBtnIdleOpacity,
  showThemeBackdrop,
  themePalette,
  songs,
  refreshInterval,
  handleExitPlayback,
  setShowDetail,
}: HeaderProps) {
  if (!playlist) return null;

  return (
    <>
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

      {inPlayback ? (
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
      )}

      {/* 歌单主信息（播放态隐藏） */}
      {!inPlayback && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-4 py-2 rounded-2xl border"
          style={{
            backgroundColor: "var(--surface-color)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
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
    </>
  );
}
