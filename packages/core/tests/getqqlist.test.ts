import { describe, it, expect } from 'vitest'
import { getQQMusicList, getQQMusicPlaylistSongs, getQQmusicSongs } from '../src/components/getQQMusicList'

describe('getQQMusicList', () => {
    it('should fetch QQ music playlist', async () => {
        const testurl = "https://c6.y.qq.com/base/fcgi-bin/u?__=1HknfjYZ705L"
        const res = await getQQMusicList(testurl)
        expect(res).toBeDefined()
        console.log(JSON.stringify(res, null, 2))
    })

    it('should batch fetch song details by songmids (best-effort)', async () => {
        const testurl = "https://c6.y.qq.com/base/fcgi-bin/u?__=1HknfjYZ705L"
        const playlistData: any = await getQQMusicList(testurl)
        const songlist: any[] = playlistData?.cdlist?.[0]?.songlist ?? []
        const songmids: string[] = songlist.map((s: any) => s.songmid).filter(Boolean).slice(0, 3)

        const songs = await getQQmusicSongs(songmids)
        console.log(`批量查询结果: ${songs.length} 首`, songs.length > 0 ? JSON.stringify(songs, null, 2) : '(empty)')
    })

    it('should one-shot fetch playlist with cover/creator and songs', async () => {
        const testurl = "https://c6.y.qq.com/base/fcgi-bin/u?__=1HknfjYZ705L"
        const result = await getQQMusicPlaylistSongs(testurl)
        expect(result.songs.length).toBeGreaterThan(0)
        console.log(`平台: ${result.platform}, 创建人: ${result.creator}, 歌单封面: ${result.cover}`)
        console.log(`共 ${result.songs.length} 首`)
        console.log(JSON.stringify(result, null, 2))
    })
})