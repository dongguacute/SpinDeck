export type Input = {
    url: string;
    provider: "QQMusic" | "NetEaseMusic" | "KugouMusic" | "AppleMusic" | "Spotify" | "YTMusic";
}

export type Output = {
   content: string;
}
