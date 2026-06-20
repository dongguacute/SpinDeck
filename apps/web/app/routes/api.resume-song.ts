import type { PlatformType } from "@spindeck/player";
import { serverResumeSong } from "@spindeck/player/server";
import type { Route } from "./+types/api.resume-song";

/** 播放器 HTTP 接口：继续播放，逻辑见 @spindeck/player/server → serverResumeSong */
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

  if (!body.platform) {
    return Response.json({ error: "缺少 platform" }, { status: 400 });
  }

  try {
    const result = await serverResumeSong(body.platform);
    if (!result.ok) {
      return Response.json({ error: result.error ?? "继续播放失败" }, { status: 500 });
    }

    console.log(`[api/resume-song] playing=${result.playing}`);
    return Response.json(result);
  } catch (err) {
    console.error("[api/resume-song] failed:", err);
    return Response.json({ error: "继续播放失败" }, { status: 500 });
  }
}
