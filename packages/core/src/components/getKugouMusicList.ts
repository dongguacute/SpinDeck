import ky from "ky";
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import type { SongInfo, PlaylistResult, PlaylistMeta } from './getQQMusicList';
import { getCachedPlaylist, playlistCacheKey, setCachedPlaylist } from '../utils/playlistCache';

interface KugouSong {
  filename?: string;
  name?: string;
  hash: string;
  audio_id?: number | string;
  album_id?: string;
  album_name?: string;
  duration?: number;
  timelen?: number;
  remark?: string;
  imgurl?: string;
  album_img?: string;
  pic?: string;
  cover?: string;
  trans_param?: {
    union_cover?: string;
    [key: string]: unknown;
  };
}

interface KugouPlaylistInfo {
  specialname: string;
  imgurl: string;
  nickname: string;
  specialid: number;
}

// 获取酷狗音乐歌单列表
export async function getKugouMusicList(url: string): Promise<{ info: KugouPlaylistInfo; songs: KugouSong[] }> {
    let specialid: string | null = null;
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    };
    
    // 处理短链或移动端分享链
    if (url && (url.includes('kugou.com/share/') || /t\d*\.kugou\.com/.test(url))) {
        try {
            console.log(`[core] Redirecting Kugou short link: ${url}`);
            const res = await ky.get(url, {
                headers,
                redirect: 'follow',
                timeout: 10000
            });
            url = res.url;
            console.log(`[core] Kugou short link redirected to: ${url}`);
        } catch (e) {
            console.warn('[core] 重定向酷狗链接失败:', e);
        }
    }

    // 优先尝试使用 chain 参数获取数据 (最稳妥的方法，不需要签名)
    const chainMatch = url && (url.match(/chain=([a-zA-Z0-9]+)/) || url.match(/t\d*\.kugou\.com\/([a-zA-Z0-9]+)/));
    if (chainMatch) {
        const chain = chainMatch[1];
        try {
            console.log(`[core] Attempting to fetch Kugou playlist via chain: ${chain}`);
            const chainUrl = `https://m.kugou.com/zlist/list?chain=${chain}&json=true&pagesize=500`;
            const chainRes = await ky.get(chainUrl, { headers, timeout: 10000 }).json<{
                status: number;
                list?: {
                    info: KugouSong[];
                };
                info?: Array<{
                    name?: string;
                    pic?: string;
                    list_create_username?: string;
                    listid?: number;
                }>;
            }>();

            if (chainRes.status === 1 && chainRes.list?.info) {
                console.log(`[core] Successfully fetched ${chainRes.list.info.length} songs via chain API`);
                const info = chainRes.info?.[0];
                return {
                    info: {
                        specialname: info?.name || '酷狗分享歌单',
                        imgurl: info?.pic || '',
                        nickname: info?.list_create_username || '',
                        specialid: info?.listid || 0
                    },
                    songs: chainRes.list.info
                };
            }
        } catch (e) {
            console.warn('[core] Failed to fetch Kugou playlist via chain API:', e);
        }
    }

    // 特殊处理 zlist 分享链接 (m.kugou.com/share/zlist.html 或 m3ws.kugou.com/share/index.html)
    const isShareLink = url && ((url.includes('listid=') && url.includes('sign=')) || url.includes('share/index.html') || url.includes('share/zlist.html'));
    if (isShareLink) {
        try {
            // 处理可能的相对路径
            let fullUrl = url;
            if (!url.startsWith('http')) {
                fullUrl = `https://m3ws.kugou.com/share/${url.startsWith('/') ? url.substring(1) : url}`;
            }
            const urlObj = new URL(fullUrl);
            const listid = urlObj.searchParams.get('listid');
            const uid = urlObj.searchParams.get('uid');
            const sign = urlObj.searchParams.get('sign');
            const _t = urlObj.searchParams.get('_t');
            const token = urlObj.searchParams.get('token') || '';
            const type = urlObj.searchParams.get('type') || '0';

            if (listid && uid && sign && _t) {
                console.log(`[core] Detected Kugou zlist share link. listid=${listid}, uid=${uid}`);
                const zlistUrl = `http://m3ws.kugou.com/zlist/list?listid=${listid}&type=${type}&uid=${uid}&sign=${sign}&_t=${_t}&pagesize=500&json=true&token=${token}`;
                console.log(`[core] Fetching zlist API: ${zlistUrl}`);
                const zlistRes = await ky.get(zlistUrl, { 
                    headers: {
                        ...headers,
                        'Referer': fullUrl
                    }, 
                    timeout: 10000 
                }).json<{
                    status: number;
                    list?: {
                        info: KugouSong[];
                        list_name?: string;
                        imgurl?: string;
                        nickname?: string;
                    }
                }>();
                
                if (zlistRes.status === 1 && zlistRes.list?.info) {
                    console.log(`[core] Successfully fetched ${zlistRes.list.info.length} songs from zlist API`);
                    return {
                        info: {
                            specialname: zlistRes.list.list_name || '酷狗分享歌单',
                            imgurl: zlistRes.list.imgurl || '',
                            nickname: zlistRes.list.nickname || '',
                            specialid: parseInt(listid, 10)
                        },
                        songs: zlistRes.list.info
                    };
                } else {
                    console.warn('[core] Kugou zlist API returned error or empty:', JSON.stringify(zlistRes));
                    // 如果 status 不为 1，可能是 m3ws 域名问题，尝试 m.kugou.com
                    if (zlistUrl.includes('m3ws.kugou.com')) {
                        const altZlistUrl = zlistUrl.replace('m3ws.kugou.com', 'm.kugou.com');
                        try {
                            console.log(`[core] Retrying with m.kugou.com: ${altZlistUrl}`);
                            const altRes = await ky.get(altZlistUrl, { headers: { ...headers, 'Referer': fullUrl }, timeout: 10000 }).json<{
                                status: number;
                                list?: {
                                    info: KugouSong[];
                                    list_name?: string;
                                    imgurl?: string;
                                    nickname?: string;
                                }
                            }>();
                            if (altRes.status === 1 && altRes.list?.info) {
                                return {
                                    info: {
                                        specialname: altRes.list.list_name || '酷狗分享歌单',
                                        imgurl: altRes.list.imgurl || '',
                                        nickname: altRes.list.nickname || '',
                                        specialid: parseInt(listid, 10)
                                    },
                                    songs: altRes.list.info
                                };
                            }
                        } catch {
                            console.warn('[core] Alt zlist API also failed');
                        }
                    }
                }
            }
        } catch {
            console.warn('[core] Failed to fetch Kugou zlist');
        }

        // 如果 API 失败了，尝试从页面 HTML 中直接提取歌曲信息
        try {
            console.log(`[core] Attempting to scrape songs from share page: ${url}`);
            const pageHtml = await ky.get(url, { headers, timeout: 10000 }).text();
            
            // 尝试多种可能的变量名
            const listInfoMatch = 
                pageHtml.match(/var\s+list_info\s*=\s*(\[.*?\]);/s) || 
                pageHtml.match(/data\s*:\s*(\[.*?\]),/s) ||
                pageHtml.match(/var\s+listData\s*=\s*(\[.*?\]);/s) ||
                pageHtml.match(/window\s*\[\s*['"]list_info['"]\s*\]\s*=\s*(\[.*?\]);/s) ||
                pageHtml.match(/var\s+info\s*=\s*(\[.*?\]);/s);

            if (listInfoMatch) {
                try {
                    const songs = JSON.parse(listInfoMatch[1]);
                    if (Array.isArray(songs) && songs.length > 0) {
                        console.log(`[core] Successfully scraped ${songs.length} songs from page HTML`);
                        // 提取歌单名
                        const nameMatch = pageHtml.match(/<title>(.*?)<\/title>/) || 
                                         pageHtml.match(/"specialname"\s*:\s*"(.*?)"/) ||
                                         pageHtml.match(/var\s+specialname\s*=\s*"(.*?)"/);
                        return {
                            info: {
                                specialname: nameMatch ? nameMatch[1].replace(' - 酷狗音乐', '').trim() : '酷狗分享歌单',
                                imgurl: '',
                                nickname: '',
                                specialid: 0
                            },
                            songs: songs.map((s: { filename?: string; name?: string; hash?: string; audio_id?: number | string; album_id?: string; album_name?: string; duration?: number; remark?: string; imgurl?: string; album_img?: string; pic?: string; cover?: string; trans_param?: { union_cover?: string; [key: string]: unknown } }) => ({
                                filename: s.filename || s.name || '',
                                hash: s.hash || '',
                                audio_id: s.audio_id || 0,
                                album_id: s.album_id || '',
                                album_name: s.album_name || '',
                                duration: s.duration || 0,
                                remark: s.remark || '',
                                imgurl: s.imgurl || '',
                                album_img: s.album_img || s.pic || s.cover || s.trans_param?.union_cover || '',
                                pic: s.pic || '',
                                cover: s.cover || '',
                                trans_param: s.trans_param
                            }))
                        };
                    }
                } catch {
                    console.warn('[core] Failed to parse scraped songs JSON');
                }
            } else {
                // 如果没找到明显的数组，尝试寻找包含 hash 的 JSON 字符串
                const allScripts = pageHtml.match(/<script.*?>([\s\S]*?)<\/script>/g);
                if (allScripts) {
                    for (const script of allScripts) {
                        if (script.includes('"hash"') || script.includes("'hash'")) {
                            // 尝试提取最长的数组
                            const arrayMatch = script.match(/\[\s*\{.*?"hash".*?\}\s*\]/s);
                            if (arrayMatch) {
                                try {
                                    const songs = JSON.parse(arrayMatch[0]);
                                    if (Array.isArray(songs) && songs.length > 0) {
                                        console.log(`[core] Successfully scraped ${songs.length} songs via deep script scan`);
                                        return {
                                            info: {
                                                specialname: '酷狗分享歌单 (扫码提取)',
                                                imgurl: '',
                                                nickname: '',
                                                specialid: 0
                                            },
                            songs: songs.map((s: { filename?: string; name?: string; songname?: string; hash?: string; audio_id?: number | string; album_id?: string; album_name?: string; duration?: number; remark?: string; imgurl?: string; album_img?: string; pic?: string; cover?: string; trans_param?: { union_cover?: string; [key: string]: unknown } }) => ({
                                filename: s.filename || s.name || s.songname || '',
                                hash: s.hash || '',
                                audio_id: s.audio_id || 0,
                                album_id: s.album_id || '',
                                album_name: s.album_name || '',
                                duration: s.duration || 0,
                                remark: s.remark || '',
                                imgurl: s.imgurl || '',
                                album_img: s.album_img || s.pic || s.cover || s.trans_param?.union_cover || '',
                                pic: s.pic || '',
                                cover: s.cover || '',
                                trans_param: s.trans_param
                            }))
                                        };
                                    }
                                } catch { /* ignore */ }
                            }
                        }
                    }
                }
                console.log(`[core] Failed to extract ID from page content. Page length: ${pageHtml.length}`);
            }
        } catch {
            console.warn('[core] Failed to scrape songs from page');
        }
        
        // 如果是分享链接且到这里还没返回，说明解析彻底失败了
        // 不要继续往下走，因为后面的 special/info 接口肯定会报错
        throw new Error('酷狗分享链接解析失败 (签名错误且网页抓取无果)');
    }

    // 解析 ID
    // 格式 1: https://www.kugou.com/yy/special/single/3280341.html
    // 格式 2: https://m.kugou.com/share/zlist.html?listid=3280341
    const match1 = url && (url.match(/special\/single\/(\d+)/) || url.match(/listid=(\d+)/) || url.match(/specialid=(\d+)/));
    if (match1) {
        specialid = match1[1];
        console.log(`[core] Found specialid via regex match1: ${specialid}`);
    } else {
        // 格式 3: https://www.kugou.com/songlist/gcid_3zs9qlpmzdz003/
        // 这种格式可能需要从页面中提取 specialid
        try {
            const urlObj = url && new URL(url.replace('/#/', '/'));
            if (urlObj) {
                specialid = urlObj.searchParams.get('specialid') || urlObj.searchParams.get('id') || urlObj.searchParams.get('listid');
                if (specialid) console.log(`[core] Found specialid via URL searchParams: ${specialid}`);
            }
        } catch {
            // ignore
        }
    }

    // 如果输入的是纯数字（酷狗码或直接 ID）
    if (!specialid && url && /^\d+$/.test(url.trim())) {
        specialid = url.trim();
    }

    // 如果 ID 太短（可能是误匹配，如 v=2 中的 2）或者没找到，且是酷狗域名，尝试从页面内容提取
    const isKugouDomain = url && url.includes('kugou.com');
    const isSuspiciousId = specialid && specialid.length < 4;

    if ((!specialid || isSuspiciousId) && isKugouDomain) {
        try {
            console.log(`[core] Attempting to fetch Kugou page to extract ID: ${url}`);
            const pageRes = await ky.get(url, {
                headers,
                timeout: 10000
            }).text();
            
            // 酷狗页面中常见的 specialid 提取方式
            const idMatch = 
                pageRes.match(/"specialid"\s*[:=]\s*(\d+)/) || 
                pageRes.match(/specialid\s*[:=]\s*(\d+)/) || 
                pageRes.match(/listid\s*[:=]\s*(\d+)/) || 
                pageRes.match(/"id"\s*:\s*(\d+)/) ||
                pageRes.match(/var\s+specialid\s*=\s*(\d+)/) ||
                pageRes.match(/data-id\s*=\s*"(\d+)"/) ||
                pageRes.match(/special\/single\/(\d+)/);
                
            if (idMatch) {
                specialid = idMatch[1];
                console.log(`[core] Extracted ID from page content: ${specialid}`);
            } else {
                console.log(`[core] Failed to extract ID from page content. Page snippet: ${pageRes.substring(0, 500)}...`);
            }
        } catch (err) {
            console.warn('[core] 抓取酷狗页面提取 ID 失败:', err);
        }
    }

    if (!specialid && url) {
        // 尝试匹配 URL 中最后的数字，酷狗很多 ID 是较长的纯数字（通常 5 位以上）
        const matchAny = url.match(/\/(\d{5,})(\.html)?$/) || url.match(/(\d{5,})$/);
        if (matchAny) {
            specialid = matchAny[1];
        }
    }

    if (!specialid) {
        console.warn(`[core] Failed to parse Kugou ID from URL: ${url}`);
        throw new Error('无法解析酷狗歌单 ID');
    }

    console.log(`[core] Kugou playlist specialid = ${specialid}`);

    // 获取歌单详情
    const infoUrl = `http://mobilecdn.kugou.com/api/v3/special/info?specialid=${specialid}&plat=0&version=8352`;
    let infoRes: { status: number; data?: KugouPlaylistInfo };
    try {
        const rawRes = await ky.get(infoUrl, {
            headers,
            timeout: 5000
        }).json<{ status: number; data?: KugouPlaylistInfo }>();
        infoRes = { status: Number(rawRes.status), data: rawRes.data };
    } catch (e) {
        console.warn('[core] Kugou info API request failed:', e);
        infoRes = { status: 0 };
    }

    if (infoRes.status !== 1 || !infoRes.data || Object.keys(infoRes.data).length === 0) {
        const fallbackUrl = `http://m.kugou.com/plist/list/${specialid}?json=true`;
        try {
            const fallbackRes = await ky.get(fallbackUrl, {
                headers,
                timeout: 5000
            }).json<{ 
                info?: { list?: { specialname: string; imgurl: string; nickname: string } };
                list?: { list?: { info: KugouSong[] } }
            }>();
            
            if (fallbackRes.info?.list && fallbackRes.list?.list?.info) {
                return {
                    info: {
                        specialname: fallbackRes.info.list.specialname,
                        imgurl: fallbackRes.info.list.imgurl,
                        nickname: fallbackRes.info.list.nickname,
                        specialid: parseInt(specialid, 10)
                    },
                    songs: fallbackRes.list.list.info
                };
            }
        } catch (e) {
            console.warn('[core] Kugou fallback API failed:', e);
        }
        
        throw new Error(`酷狗歌单详情接口返回错误: ${infoRes.status || 'timeout'} (ID: ${specialid})`);
    }

    const songsUrl = `http://mobilecdn.kugou.com/api/v3/special/song?specialid=${specialid}&page=1&pagesize=-1&plat=2&version=8989&with_res_tag=1`;
    let songsRes: { status: number; data?: { info: KugouSong[] } };
    try {
        const rawRes = await ky.get(songsUrl, {
            headers: {
                ...headers,
                'Cookie': 'kg_mid=1'
            },
            timeout: 5000
        }).json<{ status: number; data?: { info: KugouSong[] } }>();
        songsRes = { status: Number(rawRes.status), data: rawRes.data };
    } catch (e) {
        console.warn('[core] Kugou songs API request failed:', e);
        songsRes = { status: 0 };
    }

    if (songsRes.status !== 1 || !songsRes.data) {
        throw new Error(`酷狗歌单歌曲列表接口返回错误: ${songsRes.status || 'timeout'} (ID: ${specialid})`);
    }

    const songs = songsRes.data.info;
    
    // 预处理：有些接口返回的封面在 pic, cover 或 trans_param.union_cover 中
    songs.forEach(s => {
        const directCover = s.album_img || s.imgurl || s.pic || s.cover || s.trans_param?.union_cover;
        if (directCover && !s.album_img) {
            s.album_img = directCover;
        }
    });

    // 如果返回的歌曲仍然没有封面，尝试使用批量接口获取详情
    const hasAnyCover = songs.some(s => s.imgurl || s.album_img);
    
    if (!hasAnyCover && songs.length > 0) {
        try {
            console.log(`[core] Songs missing covers, fetching details via info_list for ${songs.length} songs`);
            const hashes = songs.map(s => s.hash);
            // 批量获取详情，每次最多 100 个
            const batchSize = 100;
            for (let i = 0; i < hashes.length; i += batchSize) {
                const batchHashes = hashes.slice(i, i + batchSize);
                const detailUrl = `http://mobilecdn.kugou.com/api/v3/song/info_list?plat=2&version=8989`;
                const detailRes = await ky.post(detailUrl, {
                    json: { data: batchHashes.map(h => ({ hash: h })) },
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                        'Cookie': 'kg_mid=1'
                    },
                    timeout: 10000
                }).json<{ status: number; data?: Array<{ 
                    hash: string; 
                    imgurl?: string; 
                    imgUrl?: string; 
                    album_img?: string; 
                    singer_img?: string; 
                    album_name?: string; 
                    album_id?: string 
                }> }>();
                
                if (detailRes.status === 1 && detailRes.data) {
                    const detailMap = new Map(detailRes.data.map(d => [d.hash.toLowerCase(), d]));
                    for (const song of songs) {
                        const detail = detailMap.get(song.hash.toLowerCase());
                        if (detail) {
                            // 优先保存 album_img
                            const albumCover = detail.album_img || detail.imgurl || detail.imgUrl;
                            if (albumCover) song.album_img = albumCover;
                            if (detail.album_name && !song.album_name) song.album_name = detail.album_name;
                            if (detail.album_id && !song.album_id) song.album_id = detail.album_id;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[core] Failed to fetch Kugou song details batch:', e);
        }
    }

    // 如果还是没有封面，尝试使用更稳健的详情接口
    const missingCoverSongs = songs.filter(s => !s.imgurl && !s.album_img);
    if (missingCoverSongs.length > 0) {
        try {
            console.log(`[core] Still missing covers for ${missingCoverSongs.length} songs, fetching via detail APIs`);
            const limit = 5; // 进一步降低并发，确保稳定性
            const songsToFetch = missingCoverSongs.slice(0, 30); // 仅处理前 30 首，保证首屏加载速度
            for (let i = 0; i < songsToFetch.length; i += limit) {
                const batch = songsToFetch.slice(i, i + limit);
                await Promise.all(batch.map(async (song) => {
                    try {
                        // 1. 优先尝试 play/getdata，这个接口返回的 img 字段最准
                        const playDataUrl = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${song.hash}&album_id=${song.album_id || 0}&mid=1&platid=4`;
                        const playRes = await ky.get(playDataUrl, { 
                            headers: { ...headers, 'Cookie': 'kg_mid=1' }, 
                            timeout: 3000 
                        }).json<{ status: number; data?: { img?: string; album_name?: string } }>();
                        
                        if (playRes.status === 1 && playRes.data?.img) {
                            song.album_img = playRes.data.img;
                            if (playRes.data.album_name) song.album_name = playRes.data.album_name;
                        } else {
                            // 2. 备选尝试 getSongInfo.php
                            const songInfoUrl = `http://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${song.hash.toUpperCase()}`;
                            const infoRes = await ky.get(songInfoUrl, { headers, timeout: 3000 }).json<{ imgUrl?: string; album_img?: string }>();
                            if (infoRes.album_img) song.album_img = infoRes.album_img;
                            else if (infoRes.imgUrl) song.imgurl = infoRes.imgUrl;
                        }
                    } catch {
                        // ignore single song failure
                    }
                }));
            }
        } catch (e) {
            console.warn('[core] Failed to fetch Kugou song details via detail APIs:', e);
        }
    }

    return {
        info: infoRes.data,
        songs: songs,
    };
}

function formatKugouImage(url?: string): string {
    if (!url) return '';
    let formatted = url;
    if (url.includes('stdmusic')) {
        // 对于 stdmusic 格式，移除 {size}/ 占位符通常能直接获取原图，这符合用户提供的格式
        formatted = url.replace('{size}/', '').replace('{size}', '');
    } else {
        formatted = url.replace('{size}', '400');
    }
    return formatted.replace('http://', 'https://');
}

function parseKugouSongs(songs: KugouSong[], playlistCover?: string): SongInfo[] {
    return songs.map((item) => {
        let artist = '未知歌手';
        const rawName = item.filename || item.name || '未知歌曲';
        let name = rawName;
        
        if (rawName.includes(' - ')) {
            const parts = rawName.split(' - ');
            artist = parts[0].trim();
            name = parts[1].trim();
        }
        
        // 极力优先使用 album_img，因为 imgurl 往往返回的是歌手头像，如果都没有则降级使用歌单封面
        const cover = formatKugouImage(item.album_img || item.pic || item.cover || item.trans_param?.union_cover || item.imgurl) || playlistCover || '';
        
        return {
            name: decodeHtmlEntities(name),
            cover, 
            artist: decodeHtmlEntities(artist),
            album: decodeHtmlEntities(item.album_name || ''),
            platformSongId: item.hash, 
            platformNumericId: typeof item.audio_id === 'number' ? item.audio_id : parseInt(String(item.audio_id || 0), 10),
            duration: item.duration || (item.timelen ? Math.floor(item.timelen / 1000) : 0),
        };
    });
}

async function getKugouMusicPlaylistResult(url: string): Promise<PlaylistResult> {
    const cacheKey = playlistCacheKey('KugouMusic', url);
    const cached = getCachedPlaylist(cacheKey);
    if (cached) return cached;

    const { info, songs: rawSongs } = await getKugouMusicList(url);
    const playlistCover = info.imgurl ? info.imgurl.replace('{size}', '400') : '';
    const songs = parseKugouSongs(rawSongs, playlistCover);

    const result: PlaylistResult = {
        platform: 'KugouMusic',
        name: decodeHtmlEntities(info.specialname ?? ''),
        cover: playlistCover,
        creator: decodeHtmlEntities(info.nickname ?? ''),
        songs,
    };

    setCachedPlaylist(cacheKey, result);
    return result;
}

export async function getKugouMusicPlaylistMeta(url: string): Promise<PlaylistMeta> {
    const result = await getKugouMusicPlaylistResult(url);
    return {
        platform: result.platform,
        name: result.name,
        cover: result.cover,
        creator: result.creator,
        songCount: result.songs.length,
    };
}

export async function getKugouMusicPlaylistSongsPage(
    url: string,
    offset: number,
    limit: number,
): Promise<SongInfo[]> {
    const result = await getKugouMusicPlaylistResult(url);
    const safeOffset = Math.max(0, offset);
    const safeLimit = Math.max(1, limit);
    return result.songs.slice(safeOffset, safeOffset + safeLimit);
}

export async function getKugouMusicPlaylistSongs(url: string): Promise<PlaylistResult> {
    return getKugouMusicPlaylistResult(url);
}
