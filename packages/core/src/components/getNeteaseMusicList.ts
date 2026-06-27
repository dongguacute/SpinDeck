import ky from "ky";
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import type { SongInfo, PlaylistResult, PlaylistMeta } from './getQQMusicList';

interface NeteaseArtist {
  name: string;
  id: number;
}

interface NeteaseAlbum {
  name: string;
  id: number;
  picUrl: string;
}

interface NeteaseTrack {
  name: string;
  id: number;
  ar?: NeteaseArtist[];
  /** song/detail 接口使用 artists 而非 ar */
  artists?: NeteaseArtist[];
  al?: NeteaseAlbum;
  /** song/detail 接口使用 album 而非 al */
  album?: NeteaseAlbum;
  dt?: number;
}

interface NeteasePlaylist {
  id?: number;
  name: string;
  coverImgUrl: string;
  trackCount?: number;
  creator?: {
    nickname: string;
  };
  tracks?: NeteaseTrack[];
  trackIds?: Array<{ id: number }>;
}

interface NeteaseResponse {
  code: number;
  msg?: string;
  message?: string;
  playlist?: NeteasePlaylist;
}

interface NeteaseSongDetailResponse {
  code: number;
  msg?: string;
  message?: string;
  songs?: NeteaseTrack[];
}

const NETEASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
};

const V6_CACHE_TTL_MS = 60_000;
const v6PageCache = new Map<string, { expires: number; playlist: NeteasePlaylist }>();

function neteaseApiError(prefix: string, code: number, msg?: string): Error {
  if (code === 405) {
    return new Error('网易云请求过于频繁，请稍后再试');
  }
  const detail = msg ? `: ${msg}` : '';
  return new Error(`${prefix}返回错误 ${code}${detail}`);
}

function assertNeteaseCode(code: number, prefix: string, msg?: string): void {
  if (code !== 200) {
    throw neteaseApiError(prefix, code, msg);
  }
}

export async function resolveNeteasePlaylistId(url: string): Promise<string> {
  let resolvedUrl = url.trim();

  if (resolvedUrl.includes('163cn.tv') || resolvedUrl.includes('music.163.com/m/')) {
    const redirectRes = await fetch(resolvedUrl, { redirect: 'manual' });
    const location = redirectRes.headers.get('location') || '';
    if (location) {
      resolvedUrl = location;
    }
  }

  try {
    const urlObj = new URL(resolvedUrl.replace('/#/', '/'));
    const id = urlObj.searchParams.get('id');
    if (id) return id;
  } catch {
    // fall through
  }

  const match = resolvedUrl.match(/id=(\d+)/);
  if (match?.[1]) return match[1];

  throw new Error('无法解析网易云歌单 ID');
}

/** 仅作最后兜底，正常流程应使用 v6 */
async function getNeteaseMusicListV1(url: string): Promise<NeteaseResponse> {
  const id = await resolveNeteasePlaylistId(url);
  console.log(`[core] Netease v1 fallback playlist id = ${id}`);

  const apiUrl = `https://music.163.com/api/v1/playlist/detail?id=${id}`;
  const res = await ky.get(apiUrl, { headers: NETEASE_HEADERS }).json<NeteaseResponse>();

  assertNeteaseCode(res.code, '网易云歌单接口', res.msg ?? res.message);
  if (!res.playlist) {
    throw new Error('网易云歌单接口未返回歌单数据');
  }

  return res;
}

function normalizeNeteaseCoverUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

function neteaseTrackAlbum(item: NeteaseTrack): NeteaseAlbum | undefined {
  return item.al ?? item.album;
}

function neteaseTrackArtists(item: NeteaseTrack): NeteaseArtist[] {
  return item.ar ?? item.artists ?? [];
}

function parseNeteaseTracks(tracks: NeteaseTrack[]): SongInfo[] {
  return tracks.map((item) => {
    const album = neteaseTrackAlbum(item);
    const artists = neteaseTrackArtists(item)
      .map((a) => decodeHtmlEntities(a.name ?? ''))
      .filter(Boolean);
    return {
      name: decodeHtmlEntities(item.name ?? ''),
      cover: normalizeNeteaseCoverUrl(album?.picUrl),
      artist: decodeHtmlEntities(artists.join(' / ') || '未知歌手'),
      album: decodeHtmlEntities(album?.name ?? ''),
      platformSongId: String(item.id),
      platformNumericId: item.id,
      duration: item.dt ? Math.floor(item.dt / 1000) : undefined,
    };
  });
}

function metaFromPlaylist(playlist: NeteasePlaylist, id: string): PlaylistMeta {
  return {
    platform: 'NetEaseMusic',
    name: decodeHtmlEntities(playlist.name ?? ''),
    cover: normalizeNeteaseCoverUrl(playlist.coverImgUrl),
    creator: decodeHtmlEntities(playlist.creator?.nickname ?? ''),
    songCount: playlist.trackCount ?? playlist.trackIds?.length ?? playlist.tracks?.length ?? 0,
    platformPlaylistId: id,
  };
}

async function fetchNeteaseTracksByIds(ids: number[]): Promise<SongInfo[]> {
  if (ids.length === 0) return [];

  const res = await ky.get('https://music.163.com/api/song/detail', {
    searchParams: { ids: JSON.stringify(ids) },
    headers: NETEASE_HEADERS,
  }).json<NeteaseSongDetailResponse>();

  assertNeteaseCode(res.code, '网易云歌曲详情接口', res.msg ?? res.message);
  return parseNeteaseTracks(res.songs ?? []);
}

async function fetchNeteaseV6PageRaw(
  playlistId: string,
  offset: number,
  limit: number,
): Promise<NeteasePlaylist> {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, limit);
  const cacheKey = `${playlistId}:${safeOffset}:${safeLimit}`;
  const cached = v6PageCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.playlist;
  }

  const apiUrl = `https://music.163.com/api/v6/playlist/detail?id=${playlistId}&n=${safeLimit}&s=${safeOffset}`;
  const res = await ky.get(apiUrl, { headers: NETEASE_HEADERS }).json<NeteaseResponse>();

  assertNeteaseCode(res.code, '网易云分页接口', res.msg ?? res.message);
  if (!res.playlist) {
    throw new Error('网易云分页接口未返回歌单数据');
  }

  v6PageCache.set(cacheKey, { expires: Date.now() + V6_CACHE_TTL_MS, playlist: res.playlist });
  return res.playlist;
}

async function fetchNeteaseV6Page(
  playlistId: string,
  offset: number,
  limit: number,
): Promise<{ playlist: NeteasePlaylist; songs: SongInfo[] }> {
  const playlist = await fetchNeteaseV6PageRaw(playlistId, offset, limit);
  const songs = parseNeteaseTracks(playlist.tracks ?? []);
  return { playlist, songs };
}

function shouldFallbackFromV6(playlist: NeteasePlaylist, songs: SongInfo[], limit: number): boolean {
  const expected = playlist.trackCount ?? playlist.trackIds?.length ?? 0;
  if (songs.length >= limit) return false;
  if (expected > 0 && songs.length === 0) return true;
  return expected > 0 && songs.length < Math.min(limit, expected);
}

/** 用 v6 响应里的 trackIds 拉歌曲详情，避免再请求 v1 */
function mergeNeteaseSongCovers(
  primary: SongInfo[],
  fallbackById: Map<string, SongInfo>,
): SongInfo[] {
  return primary.map((song) => {
    if (song.cover) return song;
    const fromV6 = fallbackById.get(song.platformSongId);
    if (!fromV6?.cover) return song;
    return {
      ...song,
      cover: fromV6.cover,
      album: song.album || fromV6.album,
    };
  });
}

async function fetchNeteasePageFromV6Playlist(
  playlist: NeteasePlaylist,
  id: string,
  offset: number,
  limit: number,
): Promise<{ meta: PlaylistMeta; songs: SongInfo[] }> {
  const meta = metaFromPlaylist(playlist, id);
  const safeLimit = Math.max(1, limit);
  const pageIds = (playlist.trackIds ?? [])
    .map((t) => t.id)
    .slice(offset, offset + safeLimit);

  const v6Songs = parseNeteaseTracks(playlist.tracks ?? []);
  const v6ById = new Map(v6Songs.map((s) => [s.platformSongId, s]));
  const v6CoversComplete = v6Songs.length > 0 && v6Songs.every((s) => s.cover);

  if (v6Songs.length >= Math.min(pageIds.length || safeLimit, safeLimit) && v6CoversComplete) {
    return { meta, songs: v6Songs.slice(0, safeLimit) };
  }

  if (pageIds.length > 0) {
    try {
      const detailSongs = await fetchNeteaseTracksByIds(pageIds);
      if (detailSongs.length > 0) {
        return { meta, songs: mergeNeteaseSongCovers(detailSongs, v6ById) };
      }
    } catch (err) {
      console.warn('[core] Netease song/detail failed, using v6 tracks:', err);
    }
  }

  return { meta, songs: v6Songs.slice(0, safeLimit) };
}

/** v6 完全不可用时的最后兜底（会触发 v1，易 405） */
async function fetchNeteasePageFallbackV1(
  url: string,
  offset: number,
  limit: number,
): Promise<{ meta: PlaylistMeta; songs: SongInfo[] }> {
  const data = await getNeteaseMusicListV1(url);
  const playlist = data.playlist!;
  const id = String(playlist.id ?? await resolveNeteasePlaylistId(url));
  return fetchNeteasePageFromV6Playlist(playlist, id, offset, limit);
}

export async function getNeteaseMusicPlaylistMeta(url: string): Promise<PlaylistMeta> {
  const id = await resolveNeteasePlaylistId(url);
  const playlist = await fetchNeteaseV6PageRaw(id, 0, 1);
  return metaFromPlaylist(playlist, id);
}

export async function getNeteaseMusicPlaylistSongsPage(
  playlistId: string,
  offset: number,
  limit: number,
  url?: string,
): Promise<SongInfo[]> {
  const { songs } = await getNeteaseMusicPlaylistPage(
    url ?? `https://music.163.com/#/playlist?id=${playlistId}`,
    offset,
    limit,
    playlistId,
  );
  return songs;
}

export async function getNeteaseMusicPlaylistPage(
  url: string,
  offset: number,
  limit: number,
  platformPlaylistId?: string,
): Promise<{ meta: PlaylistMeta; songs: SongInfo[] }> {
  const id = platformPlaylistId ?? await resolveNeteasePlaylistId(url);
  const safeLimit = Math.max(1, limit);

  try {
    const { playlist, songs } = await fetchNeteaseV6Page(id, offset, safeLimit);
    if (!shouldFallbackFromV6(playlist, songs, safeLimit)) {
      return { meta: metaFromPlaylist(playlist, id), songs };
    }
    console.warn('[core] Netease v6 tracks incomplete, using trackIds from v6');
    return fetchNeteasePageFromV6Playlist(playlist, id, offset, safeLimit);
  } catch (err) {
    console.warn('[core] Netease v6 failed, last-resort v1 fallback:', err);
    return fetchNeteasePageFallbackV1(url, offset, safeLimit);
  }
}

export async function getNeteaseMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
  const { meta, songs } = await getNeteaseMusicPlaylistPage(url, 0, 300);
  return {
    platform: meta.platform,
    name: meta.name,
    cover: meta.cover,
    creator: meta.creator,
    songs,
  };
}

// 兼容旧引用
export async function getNeteaseMusicList(url: string): Promise<NeteaseResponse> {
  return getNeteaseMusicListV1(url);
}
