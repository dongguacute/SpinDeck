import type { SongInfo, PlaylistMeta } from './getQQMusicList';
import {
  getQQMusicPlaylistMeta,
  getQQMusicPlaylistSongs,
} from './getQQMusicList';
import {
  getNeteaseMusicPlaylistMeta,
  getNeteaseMusicPlaylistPage,
} from './getNeteaseMusicList';
import {
  getKugouMusicPlaylistMeta,
  getKugouMusicPlaylistSongs,
} from './getKugouMusicList';
import type { Input } from '../types/url';

export type PlaylistPlatform = Input['provider'];

const DEFAULT_PAGE_SIZE = 30;

export interface PlaylistPageResult {
  url: string;
  name: string;
  cover: string;
  songCount: number;
  songs: SongInfo[];
  offset: number;
  limit: number;
  hasMore: boolean;
  paginated: boolean;
  platformPlaylistId?: string;
}

/** 平台 API 无法一次返回完整歌曲列表，需要分页加载 */
export function isPaginatedPlaylistPlatform(platform: PlaylistPlatform): boolean {
  return platform === 'NetEaseMusic';
}

function buildPageResult(
  url: string,
  meta: Pick<PlaylistMeta, 'name' | 'cover' | 'songCount' | 'platformPlaylistId'>,
  songs: SongInfo[],
  offset: number,
  limit: number,
  paginated: boolean,
): PlaylistPageResult {
  return {
    url,
    name: meta.name,
    cover: meta.cover,
    songCount: meta.songCount,
    songs,
    offset,
    limit,
    hasMore: paginated && offset + songs.length < meta.songCount,
    paginated,
    platformPlaylistId: meta.platformPlaylistId,
  };
}

export async function getPlaylistMeta(
  platform: PlaylistPlatform,
  url: string,
): Promise<PlaylistMeta> {
  switch (platform) {
    case 'QQMusic':
      return getQQMusicPlaylistMeta(url);
    case 'NetEaseMusic':
      return getNeteaseMusicPlaylistMeta(url);
    case 'KugouMusic':
      return getKugouMusicPlaylistMeta(url);
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }
}

async function getFullPlaylistPage(
  platform: PlaylistPlatform,
  url: string,
): Promise<PlaylistPageResult> {
  switch (platform) {
    case 'QQMusic': {
      const result = await getQQMusicPlaylistSongs(url);
      return buildPageResult(
        url,
        { name: result.name, cover: result.cover, songCount: result.songs.length },
        result.songs,
        0,
        result.songs.length,
        false,
      );
    }
    case 'KugouMusic': {
      const result = await getKugouMusicPlaylistSongs(url);
      return buildPageResult(
        url,
        { name: result.name, cover: result.cover, songCount: result.songs.length },
        result.songs,
        0,
        result.songs.length,
        false,
      );
    }
    default:
      throw new Error(`平台 ${platform} 不支持一次性加载`);
  }
}

export async function getPlaylistPage(
  platform: PlaylistPlatform,
  url: string,
  offset: number,
  limit: number,
  options?: { metaOnly?: boolean; platformPlaylistId?: string },
): Promise<PlaylistPageResult> {
  const safeOffset = Math.max(0, offset);

  if (options?.metaOnly) {
    const meta = await getPlaylistMeta(platform, url);
    return {
      url,
      name: meta.name,
      cover: meta.cover,
      songCount: meta.songCount,
      songs: [],
      offset: safeOffset,
      limit: 0,
      hasMore: meta.songCount > 0 && isPaginatedPlaylistPlatform(platform),
      paginated: isPaginatedPlaylistPlatform(platform),
      platformPlaylistId: meta.platformPlaylistId ?? options.platformPlaylistId,
    };
  }

  // QQ / 酷狗：接口本身一次返回全量，直接全量加载
  if (!isPaginatedPlaylistPlatform(platform)) {
    return getFullPlaylistPage(platform, url);
  }

  // 网易云：分页加载
  const safeLimit = Math.max(1, limit || DEFAULT_PAGE_SIZE);
  const { meta, songs } = await getNeteaseMusicPlaylistPage(
    url,
    safeOffset,
    safeLimit,
    options?.platformPlaylistId,
  );
  return buildPageResult(url, meta, songs, safeOffset, safeLimit, true);
}
