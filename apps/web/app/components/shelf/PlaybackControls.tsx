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
          title={t('shelf.prev_song')}
        >
          <SkipBack className="w-6 h-6 fill-current" />
        </button>

        <button
          onClick={playNextSong}
          className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
          style={{ color: chrome.textSecondary }}
          title={t('shelf.next_song')}
        >
          <SkipForward className="w-6 h-6 fill-current" />
        </button>
      </div>

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
          title={t('shelf.adjust_visual')}
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
