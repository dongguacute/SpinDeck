import { useParams } from "react-router";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../lib/theme-store";
import PlaylistShelf from "../components/PlaylistShelf";
import { SongVinylOverlay } from "@spindeck/vinyl-ui";
import { beginShelfSession, stopSong, pauseSong } from "@spindeck/player";
import type { SongInfo } from "@spindeck/player";
import {
  getDefaultChrome,
  themePaletteToChrome,
} from "../lib/theme-color";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";

// Extracted Hooks and Components
import { usePlaylistFetch } from "../components/shelf/use-playlist-fetch";
import { usePlaybackTheme } from "../components/shelf/use-playback-theme";
import { useSwipeNavigation } from "../components/shelf/use-swipe-navigation";
import { Backdrop } from "../components/shelf/Backdrop";
import { Header } from "../components/shelf/Header";
import { DetailModal } from "../components/shelf/DetailModal";
import { PlaybackControls } from "../components/shelf/PlaybackControls";
import { SettingsModal } from "../components/shelf/SettingsModal";

export default function ShelfPage() {
  const { t } = useTranslation('common');
  const { playlistId } = useParams<{ playlistId: string }>();
  const { resolvedMode, settings, updateSettings, resetSettings } = useThemeStore();
  
  // Data fetching hook
  const { playlist, loading, error, songs, retry } = usePlaylistFetch(playlistId);

  const [showSettings, setShowSettings] = useState(false);
  const tonearmPortalRef = useRef<HTMLDivElement>(null);
  const [tonearmPortalReady, setTonearmPortalReady] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongInfo | null>(null);
  const [showVinyl, setShowVinyl] = useState(false);
  const [coverOverlay, setCoverOverlay] = useState(false);
  const [pageSessionId, setPageSessionId] = useState("");
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [autoPlayToken, setAutoPlayToken] = useState(0);
  const [coversLoading, setCoversLoading] = useState(true); // 默认开启，直到 PlaylistShelf 报告完成
  const playbackWrapperRef = useRef<HTMLDivElement>(null);

  // 滚动位置持久化
  const initialScrollX = useMemo(() => {
    if (typeof window === "undefined" || !playlistId) return 0;
    const saved = localStorage.getItem(`spindeck_shelf_scroll_${playlistId}`);
    return saved ? parseFloat(saved) : 0;
  }, [playlistId]);

  const handleScrollXChange = useCallback((x: number) => {
    if (!playlistId) return;
    localStorage.setItem(`spindeck_shelf_scroll_${playlistId}`, x.toString());
  }, [playlistId]);

  const inPlayback = selectedIndex !== null;

  // 当 playlistId 改变时，确保重新进入加载状态
  useEffect(() => {
    setCoversLoading(true);
  }, [playlistId]);

  // 当 loading 状态改变时同步 coversLoading
  useEffect(() => {
    if (loading) {
      setCoversLoading(true);
    }
  }, [loading]);

  // 如果发生错误，也要关闭 coversLoading 以便显示错误信息
  useEffect(() => {
    if (error) {
      setCoversLoading(false);
    }
  }, [error]);

  // Theme and color hook
  const { 
    bookThemeColor, 
    setBookThemeColor, 
    themePalette, 
    glassBackground 
  } = usePlaybackTheme(selectedSong, resolvedMode, inPlayback);

  const handleSongSelect = useCallback((song: SongInfo | null, index: number | null, autoPlay = false) => {
    const wasInPlayback = selectedIndex !== null;
    
    if (wasInPlayback && playlist?.platform) {
      void pauseSong(playlist.platform);
    }

    setSelectedIndex(index);
    
    if (wasInPlayback && song) {
      setShowVinyl(true);
    } else if (!song) {
      setShowVinyl(false);
    }
    
    setCoverOverlay(false);
    setAutoPlayNext(autoPlay);
    if (autoPlay) setAutoPlayToken((t) => t + 1);
    
    if (song) {
      setSelectedSong(song);
    } else {
      setSelectedSong(null);
      setBookThemeColor(null);
    }
  }, [selectedIndex, playlist?.platform, setBookThemeColor]);

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

  // Swipe navigation hook
  const swipeHandlers = useSwipeNavigation(
    inPlayback,
    playbackWrapperRef,
    playNextSong,
    playPrevSong
  );

  // Session management
  useEffect(() => {
    if (!playlist?.platform) return;
    void beginShelfSession(playlist.platform).then(setPageSessionId);
  }, [playlistId, playlist?.platform]);

  useEffect(() => {
    const platform = playlist?.platform;
    return () => {
      if (platform) void stopSong(platform);
    };
  }, [playlist?.platform]);

  const handleExitPlayback = () => {
    if (playlist?.platform) void stopSong(playlist.platform);
    setShowVinyl(false);
    setCoverOverlay(false);
    setSelectedIndex(null);
    setSelectedSong(null);
    setBookThemeColor(null);
  };

  const showThemeBackdrop = inPlayback && !!glassBackground;

  const chrome = useMemo(
    () => (showThemeBackdrop && themePalette ? themePaletteToChrome(themePalette) : getDefaultChrome()),
    [showThemeBackdrop, themePalette],
  );

  const chromeIdleOpacity = showThemeBackdrop ? 1 : 0.5;
  const chromeHoverOpacity = 1;
  const chromeBtnIdleOpacity = 1;

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden select-none touch-none" 
      style={{ background: "var(--bg-primary)" }}
      {...swipeHandlers}
    >
      <Backdrop 
        showThemeBackdrop={showThemeBackdrop}
        settings={settings}
        selectedSong={selectedSong}
        glassBackground={glassBackground}
      />

      <Header 
        inPlayback={inPlayback}
        playlist={playlist}
        chrome={chrome}
        chromeIdleOpacity={chromeIdleOpacity}
        chromeHoverOpacity={chromeHoverOpacity}
        chromeBtnIdleOpacity={chromeBtnIdleOpacity}
        showThemeBackdrop={showThemeBackdrop}
        themePalette={themePalette}
        songs={songs}
        refreshInterval={playlist?.refreshInterval ?? 0}
        handleExitPlayback={handleExitPlayback}
        setShowDetail={setShowDetail}
      />

      {/* 加载中 */}
      {(loading || coversLoading) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border"
            style={{
              backgroundColor: "var(--surface-color)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <LoaderCircle className="w-8 h-8 animate-spin" style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t('shelf.loading')}</span>
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
              onClick={retry}
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
              {t('common.retry')}
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
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{t('shelf.error_manual')}</p>
          </div>
        </div>
      )}

      <DetailModal 
        showDetail={showDetail}
        setShowDetail={setShowDetail}
        playlist={playlist}
        songs={songs}
        coverUrl={playlist?.coverUrl}
      />

      {/* 播放核心区域（含动画容器） */}
      <div ref={playbackWrapperRef} className="absolute inset-0 w-full h-full">
        {selectedSong && playlist && (
          <SongVinylOverlay
            song={selectedSong}
            platform={playlist.platform}
            visible={showVinyl}
            pageSessionId={pageSessionId}
            theme={resolvedMode}
            styleName={settings.vinylStyle}
            vinylColor={bookThemeColor || undefined}
            tonearmPortalRef={tonearmPortalRef}
            tonearmPortalReady={tonearmPortalReady}
            autoPlay={autoPlayNext}
            autoPlayToken={autoPlayToken}
            tonearmTitle={t('vinyl.tonearm_title')}
            playLabel={t('vinyl.play')}
            pauseLabel={t('vinyl.pause')}
          />
        )}

        <PlaylistShelf
          songs={songs}
          onSongSelect={handleSongSelect}
          onSelectionAnimationComplete={handleBookAnimationComplete}
          onCoverToggle={() => setCoverOverlay((v) => !v)}
          onBookThemeColor={setBookThemeColor}
          onAllLoaded={() => setCoversLoading(false)}
          selectedIndex={selectedIndex}
          coverOverlay={coverOverlay}
          lockDeselect={inPlayback}
          initialScrollX={initialScrollX}
          onScrollXChange={handleScrollXChange}
        />
      </div>

      {/* 唱臂 portal */}
      <div
        ref={(el) => {
          tonearmPortalRef.current = el;
          setTonearmPortalReady(!!el);
        }}
        className="sd-vinyl-portal"
        aria-hidden
      />

      <PlaybackControls 
        inPlayback={inPlayback}
        showVinyl={showVinyl}
        chrome={chrome}
        playPrevSong={playPrevSong}
        playNextSong={playNextSong}
        setShowSettings={setShowSettings}
      />

      <SettingsModal 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        chrome={chrome}
        settings={settings}
        updateSettings={updateSettings}
        resetSettings={resetSettings}
        bookThemeColor={bookThemeColor}
      />
    </div>
  );
}
