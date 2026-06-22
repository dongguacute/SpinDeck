import type { PlatformType, PlayMode } from "@spindeck/player";
import { serverSetPlayMode } from "@spindeck/player/server";
import type { Route } from "./+types/api.set-play-mode";

/** 播放器 HTTP 接口：设置 QQ 单曲循环（内部使用，防止 QQ 自行切歌） */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { platform?: PlatformType; mode?: PlayMode };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, mode } = body;
  if (!platform || !mode) {
    return Response.json({ error: "缺少 platform 或 mode" }, { status: 400 });
  }

  try {
    const result = await serverSetPlayMode(platform, mode);
    if (!result.ok) {
      return Response.json(
        { error: result.error ?? "设置播放模式失败" },
        { status: result.error?.includes("macOS") ? 400 : 500 },
      );
    }

    console.log(`[api/set-play-mode] platform=${platform} mode=${mode} confirmed=${result.confirmed}`);
    return Response.json(result);
  } catch (err) {
    console.error("[api/set-play-mode] failed:", err);
    return Response.json({ error: "设置播放模式失败" }, { status: 500 });
  }
}
