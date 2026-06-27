import ky from "ky";
import type { Input } from '../types/url';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { getCachedPlaylist, playlistCacheKey, setCachedPlaylist } from '../utils/playlistCache';

export interface SongInfo {
    name: string;
    cover: string;
    artist: string;
    album: string;
    platformSongId: string;
    platformNumericId?: number;
    platformSongType?: number;
    duration?: number;
}

export interface PlaylistResult {
    platform: Input['provider'];
    name: string;
    cover: string;
    creator: string;
    songs: SongInfo[];
}

export interface PlaylistMeta {
    platform: Input['provider'];
    name: string;
    cover: string;
    creator: string;
    songCount: number;
    platformPlaylistId?: string;
}

interface QQMusicSong {
  songmid?: string;
  media_mid?: string;
  songname?: string;
  songorig?: string;
  title?: string;
  albummid?: string;
  albumname?: string;
  album_name?: string;
  singer?: { name?: string }[];
  songid?: string | number;
  songtype?: number;
  interval?: number;
}

interface QQMusicCD {
  dissname?: string;
  logo?: string;
  diss_cover?: string;
  nickname?: string;
  nick?: string;
  songlist?: QQMusicSong[];
}

interface QQMusicResponse {
  cdlist?: QQMusicCD[];
}

// 获取QQ音乐歌单列表
export async function getQQMusicList(url: string): Promise<QQMusicResponse> {
    let disstid: string;
    if (url.includes('c6.y.qq.com') || url.includes('c.y.qq.com')) {
        const redirectRes = await fetch(url, { redirect: 'manual' });
        const location = redirectRes.headers.get('location') || '';
        console.log(`[core] 短链重定向 → ${location}`);
        if (!location) {
            throw new Error('无法获取重定向地址，短链可能已失效');
        }
        const urlObj = new URL(location);
        disstid = urlObj.searchParams.get('id') || location.split('=')[1] || '';
    } else {
        const urlObj = new URL(url);
        disstid = urlObj.searchParams.get('id') || url.split('=')[1] || '';
    }

    console.log(`[core] disstid = ${disstid}`);

    const apiUrl = `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=${disstid}&type=1&json=1&utf8=1&onlysong=0&format=json&g_tk=5381&loginUin=0&hostUin=0&platform=yqq&needNewCode=0`;

    const res = await ky.get(apiUrl, {
        headers: { Referer: 'https://y.qq.com/' },
    }).json<QQMusicResponse>();

    // 详细日志：API 返回结构
    const cdlist = res?.cdlist;
    console.log(`[core] API 返回 cdlist 长度: ${cdlist?.length ?? 0}`);
    if (cdlist && cdlist.length > 0) {
        const cd = cdlist[0];
        console.log(`[core] cdlist[0] keys: ${Object.keys(cd).join(', ')}`);
        console.log(`[core] dissname="${cd.dissname}" logo="${cd.logo}" diss_cover="${cd.diss_cover}"`);
        const sl = cd.songlist;
        console.log(`[core] songlist 长度: ${sl?.length ?? 0}`);
        if (sl && sl.length > 0) {
            const first = sl[0];
            console.log(`[core] 第一首歌 keys: ${Object.keys(first).join(', ')}`);
            console.log(`[core] 第一首歌原始数据: ${JSON.stringify(first).slice(0, 500)}`);
        }
    }

    return res;
}

function parseSonglistToDetails(songlist: QQMusicSong[]): SongInfo[] {
    return songlist.map((item) => {
        const albummid = item.albummid ?? '';
        const singers = (item.singer ?? [])
            .map((s) => decodeHtmlEntities(s.name ?? ''))
            .filter(Boolean);
        return {
            name: decodeHtmlEntities(item.songname ?? item.songorig ?? item.title ?? ''),
            cover: albummid
                ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albummid}.jpg`
                : '',
            artist: decodeHtmlEntities(singers.join(' / ') || '未知歌手'),
            album: decodeHtmlEntities(item.albumname ?? item.album_name ?? ''),
            platformSongId: item.songmid ?? item.media_mid ?? "",
            platformNumericId:
              typeof item.songid === "number"
                ? item.songid
                : typeof item.songid === "string" && item.songid
                  ? Number.parseInt(item.songid, 10)
                  : undefined,
            platformSongType: typeof item.songtype === "number" ? item.songtype : 0,
            duration: item.interval,
        };
    });
}

interface QQRawEntry {
    expires: number;
    cdInfo: QQMusicCD;
    songlist: QQMusicSong[];
}

const qqRawCache = new Map<string, QQRawEntry>();
const QQ_RAW_TTL_MS = 5 * 60 * 1000;

async function getQQMusicRaw(url: string): Promise<QQRawEntry> {
    const cacheKey = playlistCacheKey('QQMusic', url);
    const cached = qqRawCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) return cached;

    const playlistData = await getQQMusicList(url);
    const cdInfo = playlistData?.cdlist?.[0] ?? {};
    const songlist = cdInfo.songlist ?? [];
    const entry: QQRawEntry = { expires: Date.now() + QQ_RAW_TTL_MS, cdInfo, songlist };
    qqRawCache.set(cacheKey, entry);
    return entry;
}

function metaFromQQRaw(raw: QQRawEntry): PlaylistMeta {
    const { cdInfo, songlist } = raw;
    return {
        platform: 'QQMusic',
        name: decodeHtmlEntities(cdInfo.dissname ?? ''),
        cover: cdInfo.logo ?? cdInfo.diss_cover ?? '',
        creator: decodeHtmlEntities(cdInfo.nickname ?? cdInfo.nick ?? ''),
        songCount: songlist.length,
    };
}

/** 单次请求返回元数据 + 歌曲页（只解析当前页，加快首屏） */
export async function getQQMusicPlaylistPage(
    url: string,
    offset: number,
    limit: number,
): Promise<{ meta: PlaylistMeta; songs: SongInfo[] }> {
    const raw = await getQQMusicRaw(url);
    const meta = metaFromQQRaw(raw);
    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, limit);
    const songs = parseSonglistToDetails(raw.songlist.slice(safeOffset, safeOffset + safeLimit));

    console.log(`[core] QQ 分页: ${safeOffset}-${safeOffset + songs.length}/${meta.songCount}`);

    return { meta, songs };
}

async function getQQMusicPlaylistResult(url: string): Promise<PlaylistResult> {
    const cacheKey = playlistCacheKey('QQMusic', url);
    const cached = getCachedPlaylist(cacheKey);
    if (cached) return cached;

    const raw = await getQQMusicRaw(url);
    const meta = metaFromQQRaw(raw);
    const songs = parseSonglistToDetails(raw.songlist);

    console.log(`[core] 解析结果: ${songs.length} 首`);

    const result: PlaylistResult = {
        platform: meta.platform,
        name: meta.name,
        cover: meta.cover,
        creator: meta.creator,
        songs,
    };

    setCachedPlaylist(cacheKey, result);
    return result;
}

export async function getQQMusicPlaylistMeta(url: string): Promise<PlaylistMeta> {
    const raw = await getQQMusicRaw(url);
    return metaFromQQRaw(raw);
}

export async function getQQMusicPlaylistSongsPage(
    url: string,
    offset: number,
    limit: number,
): Promise<SongInfo[]> {
    const { songs } = await getQQMusicPlaylistPage(url, offset, limit);
    return songs;
}

export async function getQQMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
    return getQQMusicPlaylistResult(url);
}
