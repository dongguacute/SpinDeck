import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { SongInfo } from "@spindeck/player";
import { isPaginatedPlaylistPlatform } from "@spindeck/core";
import type { PlatformType } from "../../lib/types";
import { usePlaylistStore } from "../../lib/playlist-store";

const PAGE_SIZE = 30;
const LOAD_AHEAD = 20;

type FetchResult = {
  url?: string;
  name?: string;
  cover?: string;
  songCount?: number;
  songs?: SongInfo[];
  offset?: number;
  limit?: number;
  hasMore?: boolean;
  paginated?: boolean;
  platformPlaylistId?: string;
  error?: string;
};

function isPaginated(platform: PlatformType | undefined): boolean {
  if (!platform) return false;
  return isPaginatedPlaylistPlatform(platform);
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function isResultForPlaylist(result: FetchResult, importUrl: string | undefined): boolean {
  if (!importUrl) return false;
  if (!result.url) return true;
  return normalizeUrl(result.url) === normalizeUrl(importUrl);
}

export function usePlaylistFetch(playlistId: string | undefined) {
  const { playlists, updatePlaylist } = usePlaylistStore();
  const playlist = playlists.find((p) => p.id === playlistId);
  const paginated = isPaginated(playlist?.platform);

  const fetcher = useFetcher<{ results?: FetchResult[]; error?: string }>();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  const expectedImportUrlRef = useRef<string>();
  const activeKeyRef = useRef("");

  // --- 网易云：分页状态 ---
  const [pagedSongs, setPagedSongs] = useState<SongInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const loadedCountRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const platformPlaylistIdRef = useRef<string>();
  const pendingIndexRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncPlaylistMeta = useCallback((result: FetchResult) => {
    const pl = playlistRef.current;
    if (!pl || result.error) return;

    const { name, cover, songCount } = result;
    const hasChanged =
      (name && name !== pl.name) ||
      (cover && cover !== pl.coverUrl) ||
      (songCount !== undefined && songCount !== pl.songCount);

    if (hasChanged) {
      updatePlaylist(pl.id, {
        name: name || pl.name,
        coverUrl: cover || pl.coverUrl,
        songCount: songCount ?? pl.songCount,
      });
    }
  }, [updatePlaylist]);

  const [overrideResult, setOverrideResult] = useState<FetchResult | null>(null);
  const [directFetching, setDirectFetching] = useState(false);
  const [songsRevision, setSongsRevision] = useState(0);

  const runImport = useCallback((
    offset: number,
    limit: number,
    metaOnly = false,
  ) => {
    const pl = playlistRef.current;
    if (!pl?.importUrl || !pl?.platform) return;
    loadingRef.current = true;
    expectedImportUrlRef.current = pl.importUrl.trim();
    const form: Record<string, string> = {
      url: pl.importUrl,
      platform: pl.platform,
    };
    if (paginated) {
      form.offset = String(offset);
      form.limit = String(limit);
      if (platformPlaylistIdRef.current) {
        form.platformPlaylistId = platformPlaylistIdRef.current;
      }
    }
    if (metaOnly) form.metaOnly = "true";
    fetcherRef.current.submit(form, { method: "POST", action: "/api/import" });
  }, [paginated]);

  const submitFetch = runImport;

  const loadMore = useCallback(() => {
    if (!paginated || !hasMoreRef.current || loadingRef.current || fetcherRef.current.state !== "idle") return;
    submitFetch(loadedCountRef.current, PAGE_SIZE);
  }, [paginated, submitFetch]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const ensureLoadedUpTo = useCallback((index: number) => {
    if (!paginated || index < 0) return;
    pendingIndexRef.current = Math.max(pendingIndexRef.current ?? -1, index);
    if (index < loadedCountRef.current) return;
    loadMoreRef.current();
  }, [paginated]);

  const handleScrollCenter = useCallback((centerIndex: number) => {
    if (!paginated) return;
    const loadTrigger = Math.max(0, loadedCountRef.current - LOAD_AHEAD);
    if (centerIndex >= loadTrigger && hasMoreRef.current) {
      loadMoreRef.current();
    }
  }, [paginated]);

  const resetPagedState = useCallback(() => {
    setPagedSongs([]);
    setTotalCount(0);
    setInitialLoadDone(false);
    platformPlaylistIdRef.current = undefined;
    loadedCountRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    pendingIndexRef.current = null;
    setInitialLoading(true);
  }, []);

  const startPagedFetch = useCallback(() => {
    resetPagedState();
    submitFetch(0, PAGE_SIZE);
  }, [resetPagedState, submitFetch]);

  const refreshPlaylist = useCallback(async () => {
    const pl = playlistRef.current;
    if (!pl?.importUrl || !pl?.platform) return;

    expectedImportUrlRef.current = pl.importUrl.trim();
    setDirectFetching(true);

    if (paginated) {
      resetPagedState();
    }

    try {
      const body = new FormData();
      body.set("url", pl.importUrl);
      body.set("platform", pl.platform);
      body.set("forceRefresh", "true");
      if (paginated) {
        body.set("offset", "0");
        body.set("limit", String(PAGE_SIZE));
        if (platformPlaylistIdRef.current) {
          body.set("platformPlaylistId", platformPlaylistIdRef.current);
        }
      }

      const res = await fetch("/api/import", { method: "POST", body });
      if (!res.ok) {
        console.warn("[Refresh] import failed:", res.status);
        return;
      }

      const data = (await res.json()) as { results?: FetchResult[]; error?: string };
      const next = data.results?.[0];
      if (!next || !isResultForPlaylist(next, pl.importUrl)) return;

      if (next.error) {
        console.warn("[Refresh] import error:", next.error);
        return;
      }

      syncPlaylistMeta(next);

      if (paginated && next.paginated === true) {
        if (next.platformPlaylistId) {
          platformPlaylistIdRef.current = next.platformPlaylistId;
        }
        if (next.songCount != null) {
          setTotalCount(next.songCount);
        }
        const incoming = next.songs ?? [];
        setPagedSongs(incoming);
        loadedCountRef.current = incoming.length;
        hasMoreRef.current = next.hasMore ?? false;
        loadingRef.current = false;
        setInitialLoading(false);
        setInitialLoadDone(true);
        setSongsRevision((revision) => revision + 1);
        return;
      }

      setOverrideResult(next);
      setSongsRevision((revision) => revision + 1);
    } catch (err) {
      console.warn("[Refresh] import error:", err);
    } finally {
      setDirectFetching(false);
    }
  }, [paginated, resetPagedState, syncPlaylistMeta]);

  // 切换歌单：发起请求
  useEffect(() => {
    const pl = playlistRef.current;
    const key = `${playlistId ?? ""}:${pl?.importUrl ?? ""}:${pl?.platform ?? ""}`;
    if (key === activeKeyRef.current) return;
    activeKeyRef.current = key;
    setOverrideResult(null);
    setSongsRevision(0);

    if (isPaginated(pl?.platform) && pl?.importUrl) {
      startPagedFetch();
    } else if (pl?.importUrl && pl?.platform) {
      expectedImportUrlRef.current = pl.importUrl.trim();
      fetcherRef.current.submit(
        { url: pl.importUrl, platform: pl.platform },
        { method: "POST", action: "/api/import" },
      );
    }
  }, [playlistId, playlist?.importUrl, playlist?.platform, startPagedFetch]);

  // 网易云：处理分页结果
  useEffect(() => {
    if (!paginated) return;

    const pl = playlistRef.current;
    const result = fetcher.data?.results?.[0];
    if (!result) return;

    if (!isResultForPlaylist(result, expectedImportUrlRef.current ?? pl?.importUrl)) return;
    if (result.paginated !== true) return;

    // metaOnly 刷新：只更新元数据，不动已加载歌曲
    if ((result.songs?.length ?? 0) === 0 && result.limit === 0) {
      loadingRef.current = false;
      if (result.songCount != null) setTotalCount(result.songCount);
      syncPlaylistMeta(result);
      return;
    }

    loadingRef.current = false;

    if (result.error) {
      setInitialLoading(false);
      setInitialLoadDone(true);
      return;
    }

    if (result.platformPlaylistId) {
      platformPlaylistIdRef.current = result.platformPlaylistId;
    }

    if (result.songCount != null) {
      setTotalCount(result.songCount);
    }

    const incoming = result.songs ?? [];
    const offset = result.offset ?? 0;

    if (incoming.length > 0) {
      if (offset === 0) {
        setPagedSongs(incoming);
      } else {
        setPagedSongs((prev) => [...prev, ...incoming]);
      }
      loadedCountRef.current = offset + incoming.length;
    }

    hasMoreRef.current = result.hasMore ?? false;
    setInitialLoading(false);
    setInitialLoadDone(true);
    syncPlaylistMeta(result);

    const pending = pendingIndexRef.current;
    if (pending != null && pending >= loadedCountRef.current && hasMoreRef.current) {
      loadMoreRef.current();
    } else if (pending != null && pending < loadedCountRef.current) {
      pendingIndexRef.current = null;
    }
  }, [paginated, fetcher.data, fetcher.state, syncPlaylistMeta]);

  // 全量平台：同步元数据
  useEffect(() => {
    if (paginated) return;
    const result = fetcher.data?.results?.[0];
    if (result && isResultForPlaylist(result, expectedImportUrlRef.current ?? playlistRef.current?.importUrl)) {
      syncPlaylistMeta(result);
    }
  }, [paginated, fetcher.data, syncPlaylistMeta]);

  // 定时刷新元数据（首屏完成后再启用，避免空响应覆盖）
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const pl = playlistRef.current;
    const interval = pl?.refreshInterval ?? 0;
    if (interval > 0 && pl?.importUrl && pl?.platform && paginated && initialLoadDone) {
      timerRef.current = setInterval(() => {
        submitFetch(0, 0, true);
      }, interval);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paginated, initialLoadDone, playlist?.refreshInterval, playlist?.importUrl, playlist?.platform, submitFetch]);

  const fetcherResult = fetcher.data?.results?.[0];
  const result = overrideResult
    && isResultForPlaylist(overrideResult, expectedImportUrlRef.current ?? playlist?.importUrl)
    ? overrideResult
    : fetcherResult;
  const isFetching = fetcher.state !== "idle" || directFetching;

  if (!paginated) {
    const fullSongs = isResultForPlaylist(result ?? {}, expectedImportUrlRef.current ?? playlist?.importUrl)
      ? (result?.songs ?? [])
      : [];
    return {
      playlist,
      paginated: false,
      loading: isFetching && fullSongs.length === 0,
      loadingMore: false,
      isFetching,
      songsRevision,
      error: fetcher.data?.error || result?.error,
      songs: fullSongs,
      totalCount: fullSongs.length,
      ensureLoadedUpTo: () => {},
      handleScrollCenter: () => {},
      loadMore: () => {},
      retry: () => {
        void refreshPlaylist();
      },
    };
  }

  return {
    playlist,
    paginated: true,
    loading: initialLoading && pagedSongs.length === 0 && (isFetching || totalCount === 0),
    loadingMore: initialLoadDone && isFetching,
    isFetching,
    songsRevision,
    error: fetcher.data?.error || result?.error,
    songs: pagedSongs,
    totalCount: totalCount || pagedSongs.length,
    ensureLoadedUpTo,
    handleScrollCenter,
    loadMore,
    retry: () => {
      void refreshPlaylist();
    },
  };
}
