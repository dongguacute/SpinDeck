import { useEffect, useRef } from "react";
import { usePlaylistStore } from "./playlist-store";
import { logger } from "./logger";

/**
 * 全局背景刷新 Hook
 * 负责根据每个歌单的 refreshInterval 定时从服务端同步歌单基础信息（名称、封面、歌曲数）
 */
export function useBackgroundRefresh() {
  const { playlists, updatePlaylist } = usePlaylistStore();
  const timersRef = useRef<Record<string, { timer: ReturnType<typeof setInterval>; interval: number }>>({});

  useEffect(() => {
    // 1. 找出所有需要刷新的歌单
    const activePlaylists = playlists.filter(
      (p) => (p.refreshInterval ?? 0) > 0 && p.importUrl && p.platform
    );

    // 2. 清理不再需要刷新的定时器，或者间隔变化的定时器
    const activeIds = new Set(activePlaylists.map((p) => p.id));
    Object.keys(timersRef.current).forEach((id) => {
      const playlist = activePlaylists.find(p => p.id === id);
      if (!activeIds.has(id) || (playlist && playlist.refreshInterval !== timersRef.current[id].interval)) {
        clearInterval(timersRef.current[id].timer);
        delete timersRef.current[id];
      }
    });

    // 3. 为新歌单或间隔变化的歌单设置/重置定时器
    activePlaylists.forEach((playlist) => {
      if (timersRef.current[playlist.id]) return;

      const interval = playlist.refreshInterval!;
      
      const performRefresh = async () => {
        try {
          logger.info(`[BackgroundRefresh] refreshing playlist: ${playlist.name} (${playlist.id})`);
          const { importPlaylist } = await import("./import-api");
          const data = await importPlaylist({
            url: playlist.importUrl,
            platform: playlist.platform,
            metaOnly: true,
            offset: 0,
            limit: 0,
          });

          if (data.error || data.code) throw new Error(data.code || data.error || "IMPORT_FAILED");

          const result = data.results?.[0];
          if (!result) return;

          const hasChanged =
            result.name !== playlist.name ||
            result.cover !== playlist.coverUrl ||
            result.songCount !== playlist.songCount;

          if (hasChanged) {
            logger.info(`[BackgroundRefresh] playlist meta updated: ${playlist.name}`);
            updatePlaylist(playlist.id, {
              name: result.name || playlist.name,
              coverUrl: result.cover || playlist.coverUrl,
              songCount: result.songCount ?? playlist.songCount,
            });
          }
        } catch (err) {
          logger.error(`[BackgroundRefresh] refresh failed for ${playlist.name}:`, err);
        }
      };

      // 立即执行一次刷新（可选，或者等第一个周期）
      // void performRefresh(); 

      const timer = setInterval(performRefresh, interval);
      timersRef.current[playlist.id] = { timer, interval };
    });
  }, [playlists, updatePlaylist]);

  // 额外的一个清理 Effect，专门处理卸载
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(({ timer }) => clearInterval(timer));
      timersRef.current = {};
    };
  }, []);
}
