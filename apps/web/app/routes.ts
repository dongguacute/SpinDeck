import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/playlists.tsx"),
  route("shelf/:playlistId", "routes/shelf.$playlistId.tsx"),
  route("api/import", "routes/api.import.ts"),
  route("api/image", "routes/api.image.ts"),
] satisfies RouteConfig;
