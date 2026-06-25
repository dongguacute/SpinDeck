import { useState, useEffect, useMemo } from "react";
import { buildPlaybackCoverTheme } from "../../lib/cover-background";
import { derivePlaybackPalette, derivePlaybackGlassBackground, type ThemePalette } from "../../lib/theme-color";
import type { SongInfo } from "@spindeck/player";

export function usePlaybackTheme(
  selectedSong: SongInfo | null,
  resolvedMode: "light" | "dark",
  inPlayback: boolean
) {
  const [bookThemeColor, setBookThemeColor] = useState<string | null>(null);
  const [coverThemePalette, setCoverThemePalette] = useState<ThemePalette | null>(null);

  useEffect(() => {
    if (!selectedSong?.cover) {
      setCoverThemePalette(null);
      return;
    }

    let cancelled = false;
    void buildPlaybackCoverTheme(selectedSong.cover, resolvedMode)
      .then((themeResult) => {
        if (cancelled) return;
        setCoverThemePalette(themeResult.palette);
        setBookThemeColor(themeResult.accentHex);
      })
      .catch(() => {
        if (!cancelled) {
          setCoverThemePalette(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSong?.cover, resolvedMode]);

  const themePalette = useMemo(() => {
    if (!inPlayback) return null;
    if (coverThemePalette) return coverThemePalette;
    if (bookThemeColor) return derivePlaybackPalette(bookThemeColor, resolvedMode);
    return null;
  }, [inPlayback, coverThemePalette, bookThemeColor, resolvedMode]);

  const glassBackground = useMemo(() => {
    if (!inPlayback) return null;
    if (themePalette) return themePalette.backdropGradient;
    if (bookThemeColor) return derivePlaybackGlassBackground(bookThemeColor, resolvedMode);
    return null;
  }, [inPlayback, themePalette, bookThemeColor, resolvedMode]);

  return {
    bookThemeColor,
    setBookThemeColor,
    themePalette,
    glassBackground,
  };
}
