import { describe, it, expect } from 'vitest'
import { getQQMusicList } from '../src/components/getQQMusicList'

describe('getQQMusicList', () => {
    it('should fetch QQ music playlist', async () => {
        const testurl = "https://c6.y.qq.com/base/fcgi-bin/u?__=1HknfjYZ705L"
        const res = await getQQMusicList(testurl)
        expect(res).toBeDefined()
        // 完整输出，避免 [Array] 截断
        console.log(JSON.stringify(res, null, 2))
    })
})