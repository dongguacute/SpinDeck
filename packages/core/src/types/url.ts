// 输入歌单或者专辑url和平台类型
export type Input = {
    url: string;
    provider: "QQMusic" | "NetEaseMusic" | "KugouMusic" | "AppleMusic" | "Spotify" | "YTMusic";
}
