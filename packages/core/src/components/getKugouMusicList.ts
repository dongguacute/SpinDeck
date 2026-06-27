import type { PlaylistResult } from './getQQMusicList';

export interface KugouPlaylistInfo {
  specialname: string;
  imgurl: string;
  nickname: string;
  specialid: number;
}

export interface KugouSong {
  filename?: string;
  name?: string;
  hash: string;
}

export async function getKugouMusicList(_url: string): Promise<{ info: KugouPlaylistInfo; songs: KugouSong[] }> {
    return {
        info: {
            specialname: '酷狗音乐对接层已移除',
            imgurl: '',
            nickname: '',
            specialid: 0
        },
        songs: []
    };
}

export async function getKugouMusicPlaylistSongs(_url: string): Promise<PlaylistResult> {
    return {
        platform: 'KugouMusic',
        name: '酷狗音乐对接层已移除',
        cover: '',
        creator: '',
        songs: [],
    };
}
