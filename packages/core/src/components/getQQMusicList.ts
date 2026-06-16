import ky from "ky";
import type { Input } from '../types/url';

const BATCH_MAX = 50;

/** 精简歌曲信息：歌名、封面、作者、所属专辑 */
export interface SongInfo {
    name: string;
    cover: string;
    artist: string;
    album: string;
}

/** 歌单完整返回：平台 + 歌单封面/创建人 + 歌曲列表 */
export interface PlaylistResult {
    platform: Input['provider'];
    cover: string;
    creator: string;
    songs: SongInfo[];
}

// 获取QQ音乐歌单列表
export async function getQQMusicList(url: string) {
    // 短链接需要先解析出真实的歌单ID
    let disstid: string;
    if (url.includes('c6.y.qq.com') || url.includes('c.y.qq.com')) {
        const redirectRes = await fetch(url, { redirect: 'manual' });
        const location = redirectRes.headers.get('location') || '';
        const urlObj = new URL(location);
        disstid = urlObj.searchParams.get('id') || url.split('=')[1];
    } else {
        disstid = url.split('=')[1];
    }

    const res = await ky.get(`https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=${disstid}&type=1&json=1&utf8=1&onlysong=0&format=json&g_tk=5381&loginUin=0&hostUin=0&platform=yqq&needNewCode=0`, {
        headers: {
            Referer: 'https://y.qq.com/'
        }
    }).json();
    return res;
}

/**
 * 将歌单接口返回的原始 songlist 转换为精简 SongInfo 数组
 */
function parseSonglistToDetails(songlist: any[]): SongInfo[] {
    return songlist.map((item: any) => {
        const albummid = item.albummid ?? '';
        const singers = (item.singer ?? [])
            .map((s: any) => s.name ?? '')
            .filter(Boolean);
        return {
            name: item.songname ?? item.songorig ?? item.title ?? '',
            cover: albummid
                ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albummid}.jpg`
                : '',
            artist: singers.join(' / ') || '未知歌手',
            album: item.albumname ?? item.album_name ?? '',
        };
    });
}

/**
 * 批量获取歌曲完整详情（通过 musicu.fcg POST，需正确的 g_tk 签名）
 * 注意：免登录场景下 g_tk 固定值不保证可用，推荐使用 getQQMusicPlaylistSongs
 * @param songmids 歌曲 mid 数组
 * @returns 歌曲详情数组
 */
export async function getQQmusicSongs(songmids: string[]): Promise<SongInfo[]> {
    const allResults: SongInfo[] = [];

    for (let i = 0; i < songmids.length; i += BATCH_MAX) {
        const batch = songmids.slice(i, i + BATCH_MAX);

        const fetchRes = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            headers: {
                Referer: 'https://y.qq.com/',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comm: { g_tk: 5381, uin: '0', platform: 'yqq', needNewCode: 0 },
                song_detail: {
                    module: 'musicSongInfoServer',
                    method: 'GetDetailInfo',
                    param: { songmid: batch }, // 尝试数组格式
                },
            }),
        });

        const resp: any = await fetchRes.json();
        const data = resp?.song_detail?.data?.song_info_list;
        if (data && data.length > 0) {
            allResults.push(...data);
        }

        if (i + BATCH_MAX < songmids.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return allResults;
}

/**
 * 一键获取歌单完整信息：从歌单链接 → 平台类型 + 歌曲详情数组
 * 直接从歌单 API 返回数据解析，无需额外的批量查询
 * @param url QQ音乐歌单链接（短链/长链均可）
 * @returns { platform, songs }
 */
export async function getQQMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
    const playlistData: any = await getQQMusicList(url);
    const cdInfo = playlistData?.cdlist?.[0] ?? {};
    const songlist: any[] = cdInfo.songlist ?? [];

    return {
        platform: 'QQMusic',
        cover: cdInfo.logo ?? cdInfo.diss_cover ?? '',
        creator: cdInfo.nickname ?? cdInfo.nick ?? '',
        songs: songlist.length > 0 ? parseSonglistToDetails(songlist) : [],
    };
}

