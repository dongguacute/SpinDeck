import ky from "ky";
import type { Input } from '../types/url';

const BATCH_MAX = 50;

export interface SongInfo {
    name: string;
    cover: string;
    artist: string;
    album: string;
}

export interface PlaylistResult {
    platform: Input['provider'];
    cover: string;
    creator: string;
    songs: SongInfo[];
}

// 获取QQ音乐歌单列表
export async function getQQMusicList(url: string) {
    let disstid: string;
    if (url.includes('c6.y.qq.com') || url.includes('c.y.qq.com')) {
        const redirectRes = await fetch(url, { redirect: 'manual' });
        const location = redirectRes.headers.get('location') || '';
        console.log(`[core] 短链重定向 → ${location}`);
        const urlObj = new URL(location);
        disstid = urlObj.searchParams.get('id') || location.split('=')[1] || '';
    } else {
        disstid = url.split('=')[1] || '';
    }

    console.log(`[core] disstid = ${disstid}`);

    const apiUrl = `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid=${disstid}&type=1&json=1&utf8=1&onlysong=0&format=json&g_tk=5381&loginUin=0&hostUin=0&platform=yqq&needNewCode=0`;

    const res: any = await ky.get(apiUrl, {
        headers: { Referer: 'https://y.qq.com/' },
    }).json();

    // 详细日志：API 返回结构
    const cdlist = res?.cdlist;
    console.log(`[core] API 返回 cdlist 长度: ${cdlist?.length ?? 0}`);
    if (cdlist?.length > 0) {
        const cd = cdlist[0];
        console.log(`[core] cdlist[0] keys: ${Object.keys(cd).join(', ')}`);
        console.log(`[core] dissname="${cd.dissname}" logo="${cd.logo}" diss_cover="${cd.diss_cover}"`);
        const sl = cd.songlist;
        console.log(`[core] songlist 长度: ${sl?.length ?? 0}`);
        if (sl?.length > 0) {
            const first = sl[0];
            console.log(`[core] 第一首歌 keys: ${Object.keys(first).join(', ')}`);
            console.log(`[core] 第一首歌原始数据: ${JSON.stringify(first).slice(0, 500)}`);
        }
    }

    return res;
}

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

export async function getQQMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
    const playlistData: any = await getQQMusicList(url);
    const cdInfo = playlistData?.cdlist?.[0] ?? {};
    const songlist: any[] = cdInfo.songlist ?? [];

    const songs = songlist.length > 0 ? parseSonglistToDetails(songlist) : [];

    console.log(`[core] 解析结果: ${songs.length} 首`);
    if (songs.length > 0) {
        const withCover = songs.filter(s => !!s.cover).length;
        console.log(`[core] 有封面的: ${withCover}/${songs.length}`);
        console.log(`[core] 第一首: name="${songs[0].name}" artist="${songs[0].artist}" cover="${songs[0].cover}"`);
        if (withCover === 0 && songs.length > 0) {
            console.log(`[core] ⚠️ 没有一首歌有封面！albummid 字段可能不存在`);
        }
    }

    return {
        platform: 'QQMusic',
        cover: cdInfo.logo ?? cdInfo.diss_cover ?? '',
        creator: cdInfo.nickname ?? cdInfo.nick ?? '',
        songs,
    };
}
