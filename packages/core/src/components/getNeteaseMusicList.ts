import ky from "ky";
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import type { SongInfo, PlaylistResult } from './getQQMusicList';

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
  ar: NeteaseArtist[];
  al: NeteaseAlbum;
  dt: number; // duration in ms
}

interface NeteasePlaylist {
  name: string;
  coverImgUrl: string;
  creator: {
    nickname: string;
  };
  tracks: NeteaseTrack[];
}

interface NeteaseResponse {
  code: number;
  playlist: NeteasePlaylist;
}

// 获取网易云音乐歌单列表
export async function getNeteaseMusicList(url: string): Promise<NeteaseResponse> {
    let id: string | null = null;
    
    // 处理短链
    if (url.includes('163cn.tv') || url.includes('music.163.com/m/')) {
        const redirectRes = await fetch(url, { redirect: 'manual' });
        const location = redirectRes.headers.get('location') || '';
        if (location) {
            url = location;
        }
    }

    // 解析 ID
    try {
        const urlObj = new URL(url.replace('/#/', '/'));
        id = urlObj.searchParams.get('id');
    } catch {
        // 如果不是标准 URL，尝试正则匹配
        const match = url.match(/id=(\d+)/);
        if (match) {
            id = match[1];
        }
    }

    if (!id) {
        throw new Error('无法解析网易云歌单 ID');
    }

    console.log(`[core] Netease playlist id = ${id}`);

    const apiUrl = `https://music.163.com/api/v1/playlist/detail?id=${id}`;

    const res = await ky.get(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Referer': 'https://music.163.com/'
        },
    }).json<NeteaseResponse>();

    if (res.code !== 200 || !res.playlist) {
        throw new Error(`网易云接口返回错误: ${res.code}`);
    }

    return res;
}

function parseNeteaseTracks(tracks: NeteaseTrack[]): SongInfo[] {
    return tracks.map((item) => {
        const artists = (item.ar ?? [])
            .map((a) => decodeHtmlEntities(a.name ?? ''))
            .filter(Boolean);
        return {
            name: decodeHtmlEntities(item.name ?? ''),
            cover: item.al?.picUrl ?? '',
            artist: decodeHtmlEntities(artists.join(' / ') || '未知歌手'),
            album: decodeHtmlEntities(item.al?.name ?? ''),
            platformSongId: String(item.id),
            platformNumericId: item.id,
            duration: Math.floor(item.dt / 1000),
        };
    });
}

export async function getNeteaseMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
    const data = await getNeteaseMusicList(url);
    const playlist = data.playlist;
    const tracks = playlist.tracks ?? [];

    const songs = parseNeteaseTracks(tracks);

    return {
        platform: 'NetEaseMusic',
        name: decodeHtmlEntities(playlist.name ?? ''),
        cover: playlist.coverImgUrl ?? '',
        creator: decodeHtmlEntities(playlist.creator?.nickname ?? ''),
        songs,
    };
}
