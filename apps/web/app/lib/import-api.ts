import type { PlatformType, SongInfo } from "./types";

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
  const body = new FormData();
  body.set("url", params.url);
  body.set("platform", params.platform);
  if (params.metaOnly) body.set("metaOnly", "true");
  if (params.forceRefresh) body.set("forceRefresh", "true");
  if (params.offset != null) body.set("offset", String(params.offset));
  if (params.limit != null) body.set("limit", String(params.limit));
  if (params.platformPlaylistId) body.set("platformPlaylistId", params.platformPlaylistId);

  const res = await fetch("/api/import", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as ImportResponse;

  if (!res.ok) {
    return {
      ...data,
      error: data.error || data.code || `HTTP_${res.status}`,
      code: data.code || `HTTP_${res.status}`,
    };
  }

  return data;
}
