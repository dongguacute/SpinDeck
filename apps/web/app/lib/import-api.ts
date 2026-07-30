import type { PlatformType, SongInfo } from "./types";
import { isTauri } from "./is-tauri";

export type ImportResult = {
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
  code?: string;
};

export type ImportResponse = {
  results?: ImportResult[];
  error?: string;
  code?: string;
};

export type ImportParams = {
  url: string;
  platform: PlatformType;
  metaOnly?: boolean;
  forceRefresh?: boolean;
  offset?: number;
  limit?: number;
  platformPlaylistId?: string;
};

/** Platforms that need server-side pagination (NetEase). */
export function isPaginatedPlaylistPlatform(platform: PlatformType | undefined): boolean {
  return platform === "NetEaseMusic";
}

export async function importPlaylist(params: ImportParams): Promise<ImportResponse> {
  if (!isTauri()) {
    return {
      error: "DESKTOP_REQUIRED",
      code: "DESKTOP_REQUIRED",
    };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ImportResponse>("import_playlist", {
      url: params.url,
      platform: params.platform,
      metaOnly: params.metaOnly ?? null,
      forceRefresh: params.forceRefresh ?? null,
      offset: params.offset ?? null,
      limit: params.limit ?? null,
      platformPlaylistId: params.platformPlaylistId ?? null,
    });
  } catch (err) {
    const code = typeof err === "string" ? err : "IMPORT_FAILED";
    return { error: code, code };
  }
}
