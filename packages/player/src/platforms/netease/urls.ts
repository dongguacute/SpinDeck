import type { DeviceOS, SongInfo } from "../../types";

export function buildNetEasePlayUrls(song: SongInfo, _os: DeviceOS): string[] {
  const id = song.platformNumericId ?? song.platformSongId?.trim();
  if (!id) return [];
  
  // 网易云音乐网页版使用的唤起协议：orpheus:// + base64(JSON)
  // 这种方式能直接触发客户端的播放行为，而不仅仅是跳转页面
  const payload = JSON.stringify({
    type: "song",
    id: String(id),
    cmd: "play"
  });
  
  // 在浏览器/Node中，btoa 或 Buffer.from 都可以，这里简单手写或使用全局 btoa
  // 因为这是在服务端或客户端运行，最稳妥的是返回 base64 编码
  const base64Payload = typeof btoa === "function" 
    ? btoa(payload) 
    : Buffer.from(payload).toString("base64");

  return [
    `orpheus://${base64Payload}`,
    `orpheus://song/${id}/?autoplay=1`,
    `orpheus://song/${id}`,
    `orpheus://song?id=${id}`
  ];
}
