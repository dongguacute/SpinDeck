import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { SongInfo } from "@spindeck/player";
import { usePlaylistStore } from "../../lib/playlist-store";

export function usePlaylistFetch(playlistId: string | undefined) {
  const { playlists, updatePlaylist } = usePlaylistStore();
  const playlist = playlists.find((p) => p.id === playlistId);

  const fetcher = useFetcher<{
    name?: string;
    cover?: string;
    songCount?: number;
    songs?: SongInfo[];
    error?: string;
  }>();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch
  useEffect(() => {
    if (playlist?.importUrl && playlist?.platform && fetcher.state === "idle" && !fetcher.data) {
      fetcher.submit(
        { url: playlist.importUrl, platform: playlist.platform },
        { method: "POST", action: "/api/import" },
      );
    }
  }, [playlist?.importUrl, playlist?.platform, fetcher]);

  // Sync with store
  useEffect(() => {
    if (fetcher.data && !fetcher.data.error && playlist) {
      const { name, cover, songCount } = fetcher.data;
      const hasChanged =
        (name && name !== playlist.name) ||
        (cover && cover !== playlist.coverUrl) ||
        (songCount !== undefined && songCount !== playlist.songCount);

      if (hasChanged) {
        updatePlaylist(playlist.id, {
          name: name || playlist.name,
          coverUrl: cover || playlist.coverUrl,
          songCount: songCount ?? playlist.songCount,
        });
      }
    }
  }, [fetcher.data, playlist, updatePlaylist]);

  // Auto-refresh
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

  return {
    playlist,
    loading: fetcher.state !== "idle",
    error: fetcher.data?.error,
    songs: fetcher.data?.songs || [],
    retry: () => {
      if (playlist?.importUrl && playlist?.platform) {
        fetcher.submit(
          { url: playlist.importUrl, platform: playlist.platform },
          { method: "POST", action: "/api/import" },
        );
      }
    }
  };
}
