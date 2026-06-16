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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ---------- 全局事件总线，让同一标签页内的组件同步 ---------- */
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

/* ---------- Hook ---------- */
export function usePlaylistStore() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  /* 首次挂载加载 + 注册监听 */
  useEffect(() => {
    setPlaylists(load());
    const listener = () => setPlaylists(load());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addPlaylist = useCallback(
    (data: Omit<Playlist, "id" | "createdAt">) => {
      const current = load();
      const playlist: Playlist = {
        ...data,
        id: crypto.randomUUID(),
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

  return { playlists, addPlaylist, removePlaylist };
}
