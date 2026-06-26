import { SkipBack, SkipForward, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChromeStyle } from "../../lib/theme-color";

interface PlaybackControlsProps {
  inPlayback: boolean;
  showVinyl: boolean;
  chrome: ChromeStyle;
  playPrevSong: () => void;
  playNextSong: () => void;
  setShowSettings: (show: boolean) => void;
}

export function PlaybackControls({
  inPlayback,
  showVinyl,
  chrome,
  playPrevSong,
  playNextSong,
  setShowSettings,
}: PlaybackControlsProps) {
  const { t } = useTranslation('common');
  if (!inPlayback) return null;

  return (
    <>
      <div 
        className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-60 flex items-center gap-4 md:gap-6 px-6 py-2.5 md:px-8 md:py-3 rounded-full border backdrop-blur-md transition-all duration-500"
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
          className="px-10 py-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-transparent hover:border-current/20 hover:bg-current/10 hover:shadow-sm"
          style={{ color: chrome.textSecondary }}
          title={t('shelf.prev_song')}
        >
          <SkipBack className="w-5 h-5 md:w-6 md:h-6 fill-current" />
        </button>

        <button
          onClick={playNextSong}
          className="px-10 py-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-transparent hover:border-current/20 hover:bg-current/10 hover:shadow-sm"
          style={{ color: chrome.textSecondary }}
          title={t('shelf.next_song')}
        >
          <SkipForward className="w-5 h-5 md:w-6 md:h-6 fill-current" />
        </button>
      </div>

      <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 z-70">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2.5 md:p-3.5 rounded-full border backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer hover:shadow-lg"
          style={{
            backgroundColor: chrome.surface,
            borderColor: chrome.border,
            color: chrome.text,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            opacity: showVinyl ? 1 : 0,
            transform: `translateY(${showVinyl ? 0 : 20}px)`,
          }}
          title={t('shelf.adjust_visual')}
        >
          <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </>
  );
}
