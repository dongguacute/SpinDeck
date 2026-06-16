import ky from "ky";

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