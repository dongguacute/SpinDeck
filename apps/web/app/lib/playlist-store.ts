import { useEffect, useState, useCallback } from "react";
import type { Playlist } from "./types";

const STORAGE_KEY = "spindeck_playlists";

function load(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Playlist[]) : [];
  } catch {
    return [];
  }
}

function save(list: Playlist[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("[PlaylistStore] Failed to save to localStorage:", err);
    // 如果是由于空间不足，可以尝试清理旧数据或报错
  }
}

/* ---------- 全局事件总线，让同一标签页内的组件同步 ---------- */
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

/* ---------- Hook ---------- */
export function usePlaylistStore() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /* 首次挂载加载 + 注册监听 */
  useEffect(() => {
    setPlaylists(load());
    setIsLoaded(true);

    const listener = () => setPlaylists(load());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addPlaylist = useCallback(
    (data: Omit<Playlist, "id" | "createdAt">) => {
      const current = load();
      // 兼容性更好的 UUID 生成方式，因为 crypto.randomUUID() 需要安全上下文 (HTTPS/localhost)
      const id = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
      const playlist: Playlist = {
        ...data,
        id,
        createdAt: Date.now(),
      };
      const next = [playlist, ...current];
      save(next);
      emit();
      return playlist;
    },
    [],
  );

  const removePlaylist = useCallback((id: string) => {
    const next = load().filter((p) => p.id !== id);
    save(next);
    emit();
  }, []);

  const removePlaylists = useCallback((ids: string[]) => {
    const next = load().filter((p) => !ids.includes(p.id));
    save(next);
    emit();
  }, []);

  const updatePlaylist = useCallback((id: string, data: Partial<Omit<Playlist, "id" | "createdAt">>) => {
    const current = load();
    const next = current.map((p) => (p.id === id ? { ...p, ...data } : p));
    save(next);
    emit();
  }, []);

  return { playlists, isLoaded, addPlaylist, removePlaylist, removePlaylists, updatePlaylist };
}
