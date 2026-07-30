import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/playlists.tsx"),
  route("settings", "routes/settings.tsx"),
  route("shelf/:playlistId", "routes/shelf.$playlistId.tsx"),
  route("not-found", "routes/not-found.tsx"),
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
