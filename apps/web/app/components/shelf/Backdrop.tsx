import type { SongInfo } from "@spindeck/player";
import type { VisualSettings } from "../../lib/theme-store";

interface BackdropProps {
  showThemeBackdrop: boolean;
  settings: VisualSettings;
  selectedSong: SongInfo | null;
  glassBackground: string | null;
}

function proxiedCover(coverUrl: string) {
  return `/api/image?url=${encodeURIComponent(coverUrl)}`;
}

export function Backdrop({ showThemeBackdrop, settings, selectedSong, glassBackground }: BackdropProps) {
  return (
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
  );
}
