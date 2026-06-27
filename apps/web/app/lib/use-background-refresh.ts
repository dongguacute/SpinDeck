import { useEffect, useRef } from "react";
import { usePlaylistStore } from "./playlist-store";

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
          console.log(`[BackgroundRefresh] 正在刷新歌单: ${playlist.name} (${playlist.id})`);
          const formData = new FormData();
          formData.append("url", playlist.importUrl);
          formData.append("platform", playlist.platform);
          formData.append("metaOnly", "true");
          formData.append("offset", "0");
          formData.append("limit", "0");

          const response = await fetch("/api/import", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("刷新失败");

          const data = await response.json();
          const result = data.results?.[0];
          if (!result) return;

          const hasChanged =
            result.name !== playlist.name ||
            result.cover !== playlist.coverUrl ||
            result.songCount !== playlist.songCount;

          if (hasChanged) {
            console.log(`[BackgroundRefresh] 歌单信息已更新: ${playlist.name}`);
            updatePlaylist(playlist.id, {
              name: result.name || playlist.name,
              coverUrl: result.cover || playlist.coverUrl,
              songCount: result.songCount ?? playlist.songCount,
            });
          }
        } catch (err) {
          console.error(`[BackgroundRefresh] 刷新歌单 ${playlist.name} 失败:`, err);
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
