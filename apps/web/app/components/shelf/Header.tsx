import { Link } from "react-router";
import { ArrowLeft, Info, LogOut, Rocket, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChromeStyle, ThemePalette } from "../../lib/theme-color";
import { PLATFORM_CONFIG } from "../../lib/types";
import { prelaunchApp } from "@spindeck/player";
import { ensureExternalOpenersReady } from "../../lib/open-external";
import type { Playlist } from "../../lib/types";
import type { SongInfo } from "@spindeck/player";
import QQMusicIcon from "../../assets/icons/QQMusicIcon.svg?react";
import NetEaseMusicIcon from "../../assets/icons/NetEaseMusicIcon.svg?react";
import KugouMusicIcon from "../../assets/icons/KugouMusicIcon.svg?react";

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
  onRefresh?: () => void;
  loading?: boolean;
  refreshing?: boolean;
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
  onRefresh,
  loading = false,
  refreshing = false,
}: HeaderProps) {
  const { t } = useTranslation('common');
  const isRefreshBusy = loading || refreshing;
  if (!playlist) return null;

  const chromeButtonHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.borderColor = chrome.borderHover;
      e.currentTarget.style.backgroundColor = chrome.surfaceHover;
      (e.currentTarget as HTMLElement).style.opacity = String(chromeHoverOpacity);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.borderColor = chrome.border;
      e.currentTarget.style.backgroundColor = chrome.surface;
      (e.currentTarget as HTMLElement).style.opacity = String(chromeIdleOpacity);
    },
  };

  return (
    <div className="shelf-header-root">
      <div className="shelf-header-bar">
        {inPlayback ? (
          <button
            onClick={handleExitPlayback}
            className="shelf-header-action shelf-header-exit flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl border text-[10px] md:text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
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
            title={t('shelf.exit_playback_title')}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('shelf.exit_playback')}</span>
          </button>
        ) : (
          <>
            <Link
              to="/"
              className="shelf-header-back flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl border text-[10px] md:text-xs font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: chrome.surface,
                borderColor: chrome.border,
                color: chrome.text,
                opacity: chromeIdleOpacity,
              }}
              {...chromeButtonHandlers}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('shelf.back_to_shelf')}</span>
            </Link>

            <div
              className="shelf-header-center flex items-center gap-1.5 md:gap-2.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl border"
              style={{
                backgroundColor: "var(--surface-color)",
                borderColor: "var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-1.5 md:gap-2.5">
                <div className="flex items-center gap-1.5 md:gap-2">
                  {playlist.platform === "QQMusic" && <QQMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  {playlist.platform === "NetEaseMusic" && <NetEaseMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  {playlist.platform === "KugouMusic" && <KugouMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  <span
                    className="text-xs md:text-sm font-medium tracking-wide max-w-[120px] md:max-w-[200px] truncate transition-colors duration-700"
                    style={{ color: chrome.textSecondary, opacity: showThemeBackdrop ? 0.95 : 0.7 }}
                  >
                    {playlist.name}
                  </span>
                </div>
                <span
                  className="text-[10px] md:text-xs px-1.5 py-0.5 rounded-md border transition-colors duration-700"
                  style={{
                    color: chrome.textMuted,
                    backgroundColor: chrome.surface,
                    borderColor: chrome.border,
                  }}
                >
                  {songs.length > 0 ? t('shelf.songs_count', { count: songs.length }) : playlist.songCount > 0 ? t('shelf.songs_count', { count: playlist.songCount }) : ""}
                </span>

                {playlist.importUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh?.();
                    }}
                    disabled={isRefreshBusy}
                    className="p-1 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                    style={{ color: chrome.textMuted, opacity: showThemeBackdrop ? 0.65 : 0.25 }}
                    onMouseEnter={(e) => {
                      if (isRefreshBusy) return;
                      e.currentTarget.style.color = chrome.textSecondary;
                      e.currentTarget.style.opacity = showThemeBackdrop ? "0.95" : "0.5";
                      e.currentTarget.style.background = chrome.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      if (isRefreshBusy) return;
                      e.currentTarget.style.color = chrome.textMuted;
                      e.currentTarget.style.opacity = showThemeBackdrop ? "0.65" : "0.25";
                      e.currentTarget.style.background = "transparent";
                    }}
                    title={t('shelf.refresh_list')}
                  >
                    <RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isRefreshBusy ? "animate-spin" : ""}`} />
                  </button>
                )}

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
                  title={t('shelf.playlist_detail')}
                >
                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>

                {refreshInterval > 0 && (
                  <span
                    className={`text-[9px] md:text-[10px] flex items-center gap-1 transition-colors duration-700${showThemeBackdrop ? "" : " text-emerald-400/50"}`}
                    style={showThemeBackdrop && themePalette ? { color: themePalette.textSecondary } : undefined}
                  >
                    <span
                      className={`inline-block w-1 md:w-1.5 h-1 md:h-1.5 rounded-full${showThemeBackdrop ? "" : " bg-emerald-400/60"}`}
                      style={showThemeBackdrop && themePalette ? { backgroundColor: themePalette.pale200 } : undefined}
                    />
                    <span className="hidden md:inline">{t('shelf.auto_refreshing')}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                void (async () => {
                  await ensureExternalOpenersReady();
                  await prelaunchApp(playlist.platform);
                })();
              }}
              className="shelf-header-action flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl border text-[10px] md:text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
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
              title={t('shelf.prelaunch_app_title', { platform: t(`platforms.${playlist.platform}`) })}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('shelf.prelaunch_app')}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
