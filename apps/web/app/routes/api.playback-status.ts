import type { PlatformType } from "@spindeck/player";
import { serverGetPlaybackStatus } from "@spindeck/player/server";
import type { Route } from "./+types/api.playback-status";

/** 播放器 HTTP 接口：查询系统播放状态，逻辑见 @spindeck/player/server → serverGetPlaybackStatus */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { platform?: PlatformType };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform } = body;
  if (!platform) {
    return Response.json({ error: "缺少 platform" }, { status: 400 });
  }

  try {
    return Response.json(await serverGetPlaybackStatus(platform));
  } catch (err) {
    console.error("[api/playback-status] failed:", err);
    return Response.json({ playing: false, paused: false, idle: true });
  }
}
