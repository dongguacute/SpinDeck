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
  const { t } = useTranslation("common");
  const isRefreshBusy = loading || refreshing;
  if (!playlist) return null;

  const platformCfg = PLATFORM_CONFIG[playlist.platform];
  const songCountLabel =
    songs.length > 0
      ? t("shelf.songs_count", { count: songs.length })
      : playlist.songCount > 0
        ? t("shelf.songs_count", { count: playlist.songCount })
        : "";

  const iconBtnStyle = {
    color: chrome.textMuted,
    opacity: showThemeBackdrop ? 0.65 : 0.25,
  };

  const onIconEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = chrome.textSecondary;
    e.currentTarget.style.opacity = showThemeBackdrop ? "0.95" : "0.5";
    e.currentTarget.style.background = chrome.surfaceHover;
  };

  const onIconLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = chrome.textMuted;
    e.currentTarget.style.opacity = showThemeBackdrop ? "0.65" : "0.25";
    e.currentTarget.style.background = "transparent";
  };

  if (inPlayback) {
    return (
      <div className="shelf-header-root">
        <div className="shelf-header-bar">
          <div
            className="shelf-header-cluster"
            style={{
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <button
              type="button"
              onClick={handleExitPlayback}
              className="shelf-header-seg shelf-header-seg--action"
              style={{
                backgroundColor: chrome.surface,
                color: chrome.text,
                opacity: chromeBtnIdleOpacity,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = chrome.surfaceHover;
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = chrome.surface;
                e.currentTarget.style.opacity = String(chromeBtnIdleOpacity);
              }}
              title={t("shelf.exit_playback_title")}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="shelf-header-seg-label">{t("shelf.exit_playback")}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shelf-header-root">
      <div className="shelf-header-bar">
        <div
          className="shelf-header-cluster"
          style={{
            backgroundColor: "var(--surface-color)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Link
            to="/"
            className="shelf-header-seg shelf-header-seg--action"
            style={{ color: chrome.text, opacity: chromeIdleOpacity }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = String(chromeHoverOpacity);
              e.currentTarget.style.backgroundColor = chrome.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = String(chromeIdleOpacity);
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title={t("shelf.back_to_shelf")}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="shelf-header-seg-label">{t("shelf.back_to_shelf")}</span>
          </Link>

          <span
            className="shelf-header-divider"
            style={{ backgroundColor: chrome.border }}
            aria-hidden
          />

          <div className="shelf-header-seg shelf-header-seg--meta">
            <div className="shelf-header-meta-main">
              {playlist.platform === "QQMusic" && <QQMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />}
              {playlist.platform === "NetEaseMusic" && <NetEaseMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />}
              {playlist.platform === "KugouMusic" && <KugouMusicIcon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />}
              <span
                className="shelf-header-title"
                style={{ color: chrome.textSecondary, opacity: showThemeBackdrop ? 0.95 : 0.7 }}
              >
                {playlist.name}
              </span>
            </div>

            {songCountLabel && (
              <span
                className="shelf-header-count"
                style={{
                  color: chrome.textMuted,
                  backgroundColor: chrome.surface,
                  borderColor: chrome.border,
                }}
              >
                {songCountLabel}
              </span>
            )}

            <div className="shelf-header-meta-tools">
              {playlist.importUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh?.();
                  }}
                  disabled={isRefreshBusy}
                  className="shelf-header-icon-btn"
                  style={iconBtnStyle}
                  onMouseEnter={(e) => {
                    if (isRefreshBusy) return;
                    onIconEnter(e);
                  }}
                  onMouseLeave={(e) => {
                    if (isRefreshBusy) return;
                    onIconLeave(e);
                  }}
                  title={t("shelf.refresh_list")}
                >
                  <RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isRefreshBusy ? "animate-spin" : ""}`} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowDetail(true)}
                className="shelf-header-icon-btn"
                style={iconBtnStyle}
                onMouseEnter={onIconEnter}
                onMouseLeave={onIconLeave}
                title={t("shelf.playlist_detail")}
              >
                <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </button>

              {refreshInterval > 0 && (
                <span
                  className={`shelf-header-live${showThemeBackdrop ? "" : " text-emerald-400/50"}`}
                  style={showThemeBackdrop && themePalette ? { color: themePalette.textSecondary } : undefined}
                >
                  <span
                    className={`shelf-header-live-dot${showThemeBackdrop ? "" : " bg-emerald-400/60"}`}
                    style={showThemeBackdrop && themePalette ? { backgroundColor: themePalette.pale200 } : undefined}
                  />
                  <span className="hidden md:inline">{t("shelf.auto_refreshing")}</span>
                </span>
              )}
            </div>
          </div>

          <span
            className="shelf-header-divider"
            style={{ backgroundColor: chrome.border }}
            aria-hidden
          />

          <button
            type="button"
            onClick={() => {
              void (async () => {
                await ensureExternalOpenersReady();
                await prelaunchApp(playlist.platform);
              })();
            }}
            className="shelf-header-seg shelf-header-seg--prelaunch"
            style={{
              backgroundColor: platformCfg?.bg || chrome.surface,
              color: platformCfg?.color || chrome.textSecondary,
            }}
            title={t("shelf.prelaunch_app_title", { platform: t(`platforms.${playlist.platform}`) })}
          >
            <Rocket className="w-3.5 h-3.5 shrink-0" />
            <span className="shelf-header-seg-label">{t("shelf.prelaunch_app")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
