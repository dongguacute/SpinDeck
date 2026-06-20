import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/playlists.tsx"),
  route("settings", "routes/settings.tsx"),
  route("shelf/:playlistId", "routes/shelf.$playlistId.tsx"),
  route("api/import", "routes/api.import.ts"),
  // @spindeck/player 服务端桥接（Mac 等平台唤起本地客户端）
  route("api/play-song", "routes/api.play-song.ts"),
  route("api/stop-song", "routes/api.stop-song.ts"),
  route("api/resume-song", "routes/api.resume-song.ts"),
  route("api/playback-status", "routes/api.playback-status.ts"),
  route("api/image", "routes/api.image.ts"),
] satisfies RouteConfig;
